import './sites-env.mjs';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, openSync, closeSync, writeFileSync } from 'node:fs';
import { once } from 'node:events';

// A fresh local database for every run. There is deliberately no remote URL option.
const state = `.wrangler/smoke-${crypto.randomUUID()}`;
mkdirSync('work', { recursive: true });
const logPath = 'work/smoke-local.log', log = openSync(logPath, 'w');
const migrate = spawnSync(process.execPath, ['scripts/setup-local.mjs', '--state', state], { stdio: ['ignore', log, log] });
if (migrate.status !== 0) { closeSync(log); throw Error(`本地测试数据库初始化失败，见 ${logPath}`); }
const probe = createServer();
probe.listen(0, '127.0.0.1');
await once(probe, 'listening');
const port = probe.address().port;
await new Promise(resolve => probe.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['scripts/preview.mjs', '--port', String(port), '--state', state], { stdio: ['ignore', log, log] });
const exited = once(child, 'exit');
let startupError;
child.on('error', error => { startupError = error; });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let checks = 0;
async function request(path, data, cookie = '', expected = 200) {
  const response = await fetch(origin + path, {
    method: data ? 'POST' : 'GET', signal: AbortSignal.timeout(30_000),
    headers: { Origin: origin, ...(data ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  assert.equal(response.status, expected, `${path}: HTTP ${response.status}`);
  checks++;
  return { data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] || cookie };
}
try {
  let ready = false;
  for (let n = 0; n < 120; n++) {
    if (startupError) throw startupError;
    if (child.exitCode !== null) throw Error(`预览启动失败，见 ${logPath}`);
    try { if ((await fetch(origin + '/api/auth', { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch {}
    await pause(500);
  }
  assert(ready, '正式产物未能在 60 秒内启动');
  for (const path of ['/', '/mahjong', '/holdem', '/history', '/emotes']) {
    const page = await fetch(origin + path, { signal: AbortSignal.timeout(30_000) });
    assert.equal(page.status, 200, path);
    assert((await page.text()).includes('</html>'), path);
    checks++;
  }
  assert.equal((await request('/api/auth')).data.user, null);
  await request('/api/history', undefined, '', 401);
  const signup = async name => request('/api/auth', { action: 'register', username: name, name: '本地验收', password: crypto.randomUUID() });
  const outsider = await signup('outside' + Date.now().toString(36));
  for (const [kind, endpoint, size] of [['landlord', '/api/game', 3], ['mahjong', '/api/mahjong', 4], ['holdem', '/api/holdem', 4]]) {
    const player = await signup(kind + Date.now().toString(36));
    const room = (await request(endpoint, { action: 'create', capacity: size, mode: 'practice', title: '本机自动验收' }, player.cookie)).data;
    assert.equal(room.game.seats.length, size);
    assert.equal(room.game.seats.filter(seat => seat.bot).length, size - 1);
    await request(endpoint + '?room=' + room.code, undefined, outsider.cookie, 403);
    await request('/api/chat?room=' + room.code, undefined, outsider.cookie, 403);
    const message = { code: room.code, clientId: crypto.randomUUID(), kind: 'text', text: '本地测试消息' };
    const first = (await request('/api/chat', message, player.cookie)).data;
    assert.equal((await request('/api/chat', message, player.cookie)).data.id, first.id);
    const after = (await request(endpoint + '?room=' + room.code, undefined, player.cookie)).data;
    assert.equal(after.revision, room.revision, '聊天不能修改牌局版本');
    const emote = { code: room.code, clientId: crypto.randomUUID(), kind: 'emote', emoteId: 'royale-v2-king-laugh' };
    const acknowledged = (await request('/api/chat', emote, player.cookie)).data;
    assert.equal(acknowledged.message.clientId, emote.clientId);
    assert.equal(acknowledged.message.emoteId, emote.emoteId);
    assert.equal(acknowledged.message.own, 1);
    assert.equal(acknowledged.emoteReadyAt, acknowledged.created + 3000);
    assert.equal((await request('/api/chat', emote, player.cookie)).data.message.id, acknowledged.message.id);
    await request('/api/chat', { ...emote, clientId: crypto.randomUUID() }, player.cookie, 429);
    const chat = (await request('/api/chat?room=' + room.code, undefined, player.cookie)).data;
    assert.equal(chat.messages.length, 2);
    assert.equal(chat.messages[1].clientId, emote.clientId);
    assert.equal(chat.messages[1].id, acknowledged.message.id);
    await request('/api/history', undefined, player.cookie);
    await request('/api/admin', undefined, player.cookie, 403);
  }
  // Four humans keep bot timers out of the preview/turn and stale-version assertions.
  const humans = [];
  for (let i=0;i<4;i++) humans.push(await signup('preselect'+i+Date.now().toString(36)));
  let table=(await request('/api/holdem',{action:'create',capacity:4,seconds:60},humans[0].cookie)).data;
  for(let i=1;i<4;i++) table=(await request('/api/holdem',{action:'join',code:table.code},humans[i].cookie)).data;
  for(const player of humans) table=(await request('/api/holdem',{action:'ready',code:table.code,revision:table.revision},player.cookie)).data;
  const preview=(await request('/api/holdem?room='+table.code,undefined,humans[0].cookie)).data;
  assert.equal(preview.game.options.acting,false);
  assert.equal(preview.game.actionPreview.call,'20');
  assert.equal(preview.game.actionPreview.minRaise,'60');
  assert(preview.game.seats.slice(1).every(s=>s.hand.length===0));
  await request('/api/holdem',{action:'call',code:table.code,revision:table.revision},humans[0].cookie,400);
  assert.equal(preview.game.actionPreview.betStep,'10');
  await request('/api/holdem',{action:'raise',amount:'30',code:table.code,revision:table.revision},humans[3].cookie,400);
  table=(await request('/api/holdem',{action:'raise',amount:'100',code:table.code,revision:table.revision},humans[3].cookie)).data;
  const updated=(await request('/api/holdem?room='+table.code,undefined,humans[0].cookie)).data;
  assert.equal(updated.game.options.acting,true);
  assert.equal(updated.game.actionPreview.call,'90');
  assert.equal(updated.game.actionPreview.minRaise,'170');
  await request('/api/holdem',{action:'call',code:table.code,revision:preview.revision},humans[0].cookie,409);
  const confirmed=(await request('/api/holdem',{action:'call',code:table.code,revision:updated.revision},humans[0].cookie)).data;
  assert.equal(confirmed.game.seats[0].bet,'100');
  assert.equal(confirmed.game.seats[0].total,'100');
  assert.equal(confirmed.game.seats[0].stack,'900');
  assert.equal(confirmed.game.seats[0].action.kind,'call');
  assert.equal(confirmed.game.seats[0].action.paid,'90');
  await request('/api/holdem',{action:'call',code:table.code,revision:updated.revision},humans[0].cookie,409);
  const acting=confirmed.game.seats[confirmed.game.turn];
  const timeoutRequest={action:'timeout_choice',code:table.code,revision:confirmed.revision,round:confirmed.game.round,street:confirmed.game.street,bet:acting.bet,stack:acting.stack,choice:{action:'call',maxCall:'80'}};
  const planned=(await request('/api/holdem',timeoutRequest,humans[1].cookie)).data;
  assert.equal(planned.game.seats[1].stack,acting.stack);
  assert(!JSON.stringify(planned.game).includes('timeoutChoice'));
  await request('/api/holdem',{...timeoutRequest,revision:planned.revision,round:'wrong'},humans[1].cookie,400);
  await request('/api/holdem',{...timeoutRequest,revision:planned.revision,choice:null},humans[1].cookie);
  const info = (await request('/build-info.json')).data;
  assert.match(info.commit, /^[a-f0-9]{40}$/);
  writeFileSync('work/smoke-local.json', JSON.stringify({ status: 'passed', checks, commit: info.commit, state }, null, 2) + '\n');
  console.log(`正式产物本地验收通过：${checks} 项检查；三游戏、人机补位、账号、聊天权限、重试与限流。`);
} finally {
  child.kill('SIGTERM');
  await Promise.race([exited, pause(5000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
  closeSync(log);
}
