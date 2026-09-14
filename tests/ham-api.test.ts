// Test-only accounts and SQLite fixtures. This harness never accepts a remote origin.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {dealModern,newModern,modernSeat,type ModernGame} from '../lib/mahjong/modern.ts';
const origin='http://localhost:5173',password='Ham-local-test-913!';
async function req(path:string,data?:unknown,cookie='',expect=200){const r=await fetch(origin+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});const result:any=await r.json();assert.equal(r.status,expect,JSON.stringify(result));return {data:result,cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};}
const local=JSON.parse(readFileSync('work/local-reset-fixture.json','utf8'));assert(local.database.startsWith('.wrangler/'));const sql=new DatabaseSync(local.database);sql.exec('PRAGMA busy_timeout=5000');
const suffix=Date.now().toString().slice(-8),clients:any[]=[],names=['小满','阿北','桃子','小川'],usernames=names.map((_,i)=>'hamqa'+i+suffix);
for(let i=0;i<4;i++)clients.push(await req('/api/auth',{action:'register',username:usernames[i],password,name:names[i]}));
const admin=await req('/api/auth',{action:'login',username:'MartinHamburger',password:'Local-reset-test-only-913!'});
const ids=clients.map(c=>c.data.user.id),beforeScores=clients.map(c=>c.data.user.score);
let room=(await req('/api/mahjong',{action:'create',title:'周末朋友桌',initialChips:'1000',baseChips:'10'},clients[0].cookie)).data;const code=room.code;
assert.equal(room.game.rules.id,'ham-v3');assert.equal(room.game.rules.selfDrawUnit,2);assert.equal(room.game.rules.noWildBonus,false);assert.equal(room.game.session.baseChips,'10');
await req('/api/mahjong?room='+code,undefined,clients[1].cookie,403);
await req('/api/game',{action:'create'},clients[0].cookie,409);
for(let i=1;i<4;i++)room=(await req('/api/mahjong',{action:'join',code},clients[i].cookie)).data;
for(let i=0;i<4;i++)room=(await req('/api/mahjong',{action:'ready',code,revision:room.revision},clients[i].cookie)).data;
await req('/api/mahjong',{action:'leave',code,revision:room.revision},clients[0].cookie,400);
await req('/api/mahjong/shares',{action:'create',code},clients[0].cookie,400);
let moves=0;
while(['playing','choosing'].includes(room.game.phase)){
 assert(++moves<650);let i=room.game.turn;
 if(room.game.phase==='choosing'){
  i=room.game.winner;room=(await req('/api/mahjong?room='+code,undefined,clients[i].cookie)).data;const plans=(await req('/api/mahjong/win-options?room='+code,undefined,clients[i].cookie)).data;
  room=(await req('/api/mahjong',{action:'confirm_win',code,revision:room.revision,candidateId:plans.plans[0].id},clients[i].cookie)).data;continue;
 }
 if(room.game.pending){for(let j=0;j<4;j++){const d=(await req('/api/mahjong?room='+code,undefined,clients[j].cookie)).data;if(d.game.phase!=='playing'){room=d;break;}if(d.game.options.canPass){room=d;i=j;break;}}}else room=(await req('/api/mahjong?room='+code,undefined,clients[i].cookie)).data;
 if(room.game.phase!=='playing')continue;const o=room.game.options;let action;
 if(o.canPass){const best=o.claims.find((c:any)=>c.kind==='hu')||o.claims.find((c:any)=>c.kind==='kong')||o.claims.find((c:any)=>c.kind==='pong');action=best?{action:'claim',key:best.key}:{action:'pass'};}
 else if(o.canHu)action={action:'hu'};else if(o.kongs.length)action={action:'kong',key:o.kongs[0].key};else{const h=room.game.seats[i].hand;action={action:'discard',tile:h[(moves*7)%h.length]};}
 room=(await req('/api/mahjong',{...action,code,revision:room.revision},clients[i].cookie)).data;
}
assert.equal(room.game.phase,'finished');
function physical(types:number[],used:number[]=[]){const seen=new Set(used);return types.map(t=>{const id=[0,1,2,3].map(i=>t*4+i).find(i=>!seen.has(i));assert(id!==undefined);seen.add(id);return id;});}
function readGame():ModernGame{return JSON.parse(sql.prepare('SELECT state FROM rooms WHERE code=?').get(code)!.state as string);}
function persist(g:ModernGame){sql.prepare('UPDATE rooms SET state=?,phase=?,revision=revision+1,op=?,updated=? WHERE code=?').run(JSON.stringify(g),g.phase,crypto.randomUUID(),Date.now(),code);}
function setHand(g:ModernGame,types:number[]){
 const fixed=g.seats.flatMap(s=>s.melds.flatMap(m=>m.tiles));g.seats[0].hand=physical(types,fixed);const occupied=[...fixed,...g.seats[0].hand];const unused=Array.from({length:136},(_,i)=>i).filter(i=>!occupied.includes(i));
 for(let i=1;i<4;i++){g.seats[i].hand=unused.splice(0,13);g.seats[i].river=[];}g.seats[0].river=[];g.wall=unused;g.drawn=g.seats[0].hand.at(-1)!;g.turn=0;g.wildcard=32;g.opening=false;g.pending=null;g.deadline=Date.now()+30000;
}
async function race(path:string,data:unknown,cookie:string){const rs=await Promise.all([fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,cookie},body:JSON.stringify(data)}),fetch(origin+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,cookie},body:JSON.stringify(data)})]);assert.deepEqual(rs.map(r=>r.status).sort(),[200,409]);return await rs.find(r=>r.status===200)!.json() as any;}
// A pair of wildcards can represent 发: both a physical 发 prize and a converted 白 prize then hit.
let g=readGame();dealModern(g);setHand(g,[0,1,2,9,10,11,18,19,20,2,4,32,32,3]);
const prizes=[130,132];for(const tile of prizes){for(let i=1;i<4;i++)if(g.seats[i].hand.includes(tile)){const replacement=g.wall.shift()!;g.seats[i].hand[g.seats[i].hand.indexOf(tile)]=replacement;}g.wall=g.wall.filter(t=>t!==tile);}g.wall.push(...prizes);persist(g);
room=(await req('/api/mahjong?room='+code,undefined,clients[0].cookie)).data;room=await race('/api/mahjong',{action:'hu',code,revision:room.revision},clients[0].cookie);assert.equal(room.game.phase,'choosing');
await req('/api/mahjong/win-options?room='+code,undefined,clients[1].cookie,403);
const blind=(await req('/api/mahjong?room='+code,undefined,clients[1].cookie)).data;assert(!JSON.stringify(blind).includes('"wall"'));assert(!JSON.stringify(blind).includes('"awards"'));assert(!JSON.stringify(blind).includes('"choice"'));
const page1=(await req('/api/mahjong/win-options?room='+code,undefined,clients[0].cookie)).data;const allIds=new Set<string>();for(let page=0;page<Math.ceil(page1.total/12);page++){const r=(await req(`/api/mahjong/win-options?room=${code}&page=${page}`,undefined,clients[0].cookie)).data;for(const p of r.plans){assert(!allIds.has(p.id));allIds.add(p.id);}}assert.equal(allIds.size,page1.total);
const filtered=(await req('/api/mahjong/win-options?room='+code+'&target=32',undefined,clients[0].cookie)).data;const plan=filtered.plans.find((p:any)=>p.assignments.every((a:any)=>a.type===32));assert(plan);
assert(plan.fans.some((f:any)=>f.id==='selfDraw'&&f.multiplier==='2'));assert.equal(plan.multiplier,'4');
await req('/api/mahjong',{action:'confirm_win',code,revision:room.revision,candidateId:'forged',multiplier:'999'},clients[0].cookie,400);
room=await race('/api/mahjong',{action:'confirm_win',code,revision:room.revision,candidateId:plan.id},clients[0].cookie);
assert.deepEqual(room.game.result.awards.map((a:any)=>a.hit),[true,true]);assert.equal(room.game.deltas[0],(10n*3n*BigInt(plan.multiplier)*3n).toString());
const wonRound=room.game.round;assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM records WHERE id=?').get(wonRound)!.n,1);assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM chip_entries WHERE round_id=? AND kind='win'").get(wonRound)!.n,1);
for(let i=0;i<4;i++)assert.equal((await req('/api/auth',undefined,clients[i].cookie)).data.user.score,beforeScores[i]);
const report=(await req(`/api/mahjong/reports?room=${code}&round=${wonRound}`,undefined,clients[0].cookie)).data;const text=JSON.stringify(report);assert(!text.includes(ids[0]));assert(!text.includes(wonRound));assert(!text.includes('username'));assert(!text.includes('candidateId'));assert.equal(report.rounds[0].awards.length,2);
assert(report.rounds[0].fans.some((f:any)=>f.id==='selfDraw'&&f.multiplier==='2'));assert.equal(report.rounds[0].multiplier,plan.multiplier);
const share=(await req('/api/mahjong/shares',{action:'create',code,round:wonRound},clients[0].cookie)).data;assert.equal((await req('/api/mahjong/public-report?id='+share.id)).data.rounds[0].multiplier,plan.multiplier);
await req('/api/mahjong/shares',{action:'revoke',id:share.id},clients[1].cookie,403);
await req('/api/mahjong/shares',{action:'revoke',id:share.id},clients[0].cookie);await req('/api/mahjong/public-report?id='+share.id,undefined,'',404);
// Exactly-once kong charge, then a confirmation/admin-close race must commit one consistent outcome.
g=readGame();dealModern(g);setHand(g,[0,0,0,0,9,10,11,18,19,20,27,27,28,28]);persist(g);const preKong=g.seats.map(s=>s.balance);
room=(await req('/api/mahjong?room='+code,undefined,clients[0].cookie)).data;const kong=room.game.options.kongs.find((o:any)=>o.kind==='concealed');assert(kong);
room=await race('/api/mahjong',{action:'kong',code,revision:room.revision,key:kong.key},clients[0].cookie);assert.deepEqual(room.game.deltas,['60','-20','-20','-20']);
g=readGame();setHand(g,[9,10,11,18,19,20,27,27,2,4,3]);persist(g);
room=(await req('/api/mahjong?room='+code,undefined,clients[0].cookie)).data;room=(await req('/api/mahjong',{action:'hu',code,revision:room.revision},clients[0].cookie)).data;const c=(await req('/api/mahjong/win-options?room='+code,undefined,clients[0].cookie)).data;
assert(c.plans.every((p:any)=>!p.fans.some((f:any)=>f.id==='noWild')));assert.equal(c.plans[0].multiplier,'8');
const simultaneous=await Promise.all([
 fetch(origin+'/api/mahjong',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,cookie:clients[0].cookie},body:JSON.stringify({action:'confirm_win',code,revision:room.revision,candidateId:c.plans[0].id})}),
 fetch(origin+'/api/admin',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,cookie:admin.cookie},body:JSON.stringify({action:'close',code})}),
]);assert(simultaneous.every(r=>r.status===200||r.status===409));g=readGame();if(g.phase!=='closed'){await req('/api/admin',{action:'close',code},admin.cookie);g=readGame();}
assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM records WHERE id=?').get(g.round)!.n,1);if(g.result!.winType==='aborted')assert.deepEqual(g.seats.map(s=>s.balance),preKong);else assert.equal(g.result!.winType,'self');
assert.equal(g.seats.reduce((n,s)=>n+BigInt(s.balance),0n),4000n);
const final=(await req('/api/mahjong/reports?room='+code,undefined,clients[0].cookie)).data;assert.equal(final.totalRounds,3);assert.equal(final.players.reduce((n:bigint,p:any)=>n+BigInt(p.delta),0n),0n);
const tableShare=(await req('/api/mahjong/shares',{action:'create',code},clients[0].cookie)).data;assert.equal((await req('/api/mahjong/public-report?id='+tableShare.id)).data.totalRounds,3);
assert.equal((await req('/api/mahjong',undefined,clients[0].cookie)).data.activeRoom,null);
const adminView=(await req('/api/admin',undefined,admin.cookie)).data;assert(adminView.shares.some((s:any)=>s.id===tableShare.id));
// Separate, local-only UI table. Four test accounts are ready for browser interaction.
let ui=(await req('/api/mahjong',{action:'create',title:'周末朋友桌 · 页面测试'},clients[0].cookie)).data;for(let i=1;i<4;i++)ui=(await req('/api/mahjong',{action:'join',code:ui.code},clients[i].cookie)).data;
writeFileSync('work/ham-ui-fixture.json',JSON.stringify({usernames,ids,names,code:ui.code,finishedCode:code,wonRound,shareId:tableShare.id,database:local.database}));sql.close();
console.log(JSON.stringify({result:'PASS',moves,plans:allIds.size,checks:'four players, exact chips, no account-score changes, full pagination, private candidates, fixed awards, duplicate actions, kong/close race, immutable records, share privacy/revocation, table report',uiUsername:usernames[0],uiRoom:ui.code,shareId:tableShare.id}));
