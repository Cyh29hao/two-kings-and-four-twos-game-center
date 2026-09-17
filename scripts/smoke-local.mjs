import './sites-env.mjs';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, openSync, closeSync, writeFileSync } from 'node:fs';
import { once } from 'node:events';

// A fresh local database for every run. There is deliberately no remote URL option.
// D1 adds a long content-addressed filename beneath this directory; keep the
// unique segment short enough for Windows workspaces nested under Codex paths.
const state = `.wrangler/s${crypto.randomUUID().slice(0, 4)}`;
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
    await request('/api/chat', emote, player.cookie);
    await request('/api/chat', { ...emote, clientId: crypto.randomUUID() }, player.cookie, 429);
    const chat = (await request('/api/chat?room=' + room.code, undefined, player.cookie)).data;
    assert.equal(chat.messages.length, 2);
    await request('/api/history', undefined, player.cookie);
    await request('/api/admin', undefined, player.cookie, 403);
  }
  const v3Player = await signup('landlordv3' + Date.now().toString(36));
  let v3 = (await request('/api/game', { action: 'create', mode: 'practice', title: 'v3 本机验收', rules: { id: 'landlord-v3' } }, v3Player.cookie)).data;
  assert.equal(v3.game.kind, 'landlord-v3');
  assert.deepEqual(v3.game.coins, ['2', '2', '2']);
  v3 = (await request('/api/game', { action: 'ready', code: v3.code, revision: v3.revision }, v3Player.cookie)).data;
  assert.equal(v3.game.phase, 'shopping');
  assert.equal(v3.game.shops[0].offers.length, 12);
  const offer = v3.game.shops[0].offers[0];
  v3 = (await request('/api/game', { action: 'shop_buy', code: v3.code, revision: v3.revision, offerId: offer.offerId }, v3Player.cookie)).data;
  assert.equal(v3.game.equipment[0].length, 1);
  v3 = (await request('/api/game', { action: 'shop_sell', code: v3.code, revision: v3.revision, instanceId: v3.game.equipment[0][0].instanceId }, v3Player.cookie)).data;
  assert.equal(v3.game.coins[0], '1');
  v3 = (await request('/api/game', { action: 'shop_done', code: v3.code, revision: v3.revision }, v3Player.cookie)).data;
  for (let attempt = 0; attempt < 8 && v3.game.phase !== 'bidding'; attempt++) {
    await pause(1000);
    v3 = (await request('/api/game?room=' + v3.code, undefined, v3Player.cookie)).data;
    assert(['shopping', 'equipment', 'bidding'].includes(v3.game.phase), `V3 开局阶段异常：${v3.game.phase}`);
  }
  assert.equal(v3.game.phase, 'bidding');
  assert.equal(v3.game.seats.filter(seat => seat.bot).length, 2);
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
