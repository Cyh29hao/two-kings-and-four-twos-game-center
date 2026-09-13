// LOCAL integration fixture. The URL is intentionally fixed; never run against production.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {newMahjong,newSeat,type MahjongView} from '../lib/mahjong/engine.ts';
const origin='http://localhost:5173',password='Mahjong-local-test-913!';
async function req(path:string,data?:any,cookie='',expect=200){const r=await fetch(origin+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});const result:any=await r.json();assert.equal(r.status,expect,JSON.stringify(result));return{data:result,cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};}
await req('/api/mahjong',undefined,'',401);
const admin=await req('/api/auth',{action:'login',username:'MartinHamburger',password:'Local-reset-test-only-913!'});
const suffix=Date.now().toString().slice(-7),clients=[];
for(let i=0;i<4;i++)clients.push(await req('/api/auth',{action:'register',username:'mjqa'+i+suffix,password,name:['小满','阿北','桃子','小川'][i]}));
const ids=clients.map(c=>c.data.user.id);
let room=(await req('/api/mahjong',{action:'create',rulesId:'basic-136-v2',title:'四人麻将联机验证'},clients[0].cookie)).data;const code=room.code;
await req('/api/mahjong?room='+code,undefined,clients[1].cookie,403);
await req('/api/game',{action:'create'},clients[0].cookie,409);
assert.equal((await req('/api/game',undefined,clients[0].cookie)).data.activeKind,'mahjong');
assert.equal((await req('/api/game',{action:'join',code},clients[0].cookie)).data.redirect,'/mahjong?room='+code);
for(let i=1;i<4;i++)room=(await req('/api/mahjong',{action:'join',code},clients[i].cookie)).data;
await req('/api/mahjong',{action:'join',code},admin.cookie,400);
await req('/api/admin',{action:'close',code},clients[0].cookie,403);
for(let i=0;i<4;i++)room=(await req('/api/mahjong',{action:'ready',code,revision:room.revision},clients[i].cookie)).data;
assert.equal(room.game.phase,'playing');
for(let i=0;i<4;i++){const d:any=(await req('/api/mahjong?room='+code,undefined,clients[i].cookie)).data;assert(!('wall' in d.game));assert(d.game.seats.every((s:any,j:number)=>j===i?s.hand.length===(i===0?14:13):s.hand.length===0));assert.equal(d.game.remaining,83);}
room=(await req('/api/mahjong?room='+code,undefined,clients[0].cookie)).data;
await req('/api/mahjong',{action:'discard',code,revision:room.revision,tile:room.game.seats[0].hand[0]},clients[1].cookie,400);
await req('/api/mahjong',{action:'leave',code,revision:room.revision},clients[0].cookie,400);
async function race(action:any,cookie:string){const headers={'Content-Type':'application/json',Origin:origin,cookie};const rs=await Promise.all([fetch(origin+'/api/mahjong',{method:'POST',headers,body:JSON.stringify(action)}),fetch(origin+'/api/mahjong',{method:'POST',headers,body:JSON.stringify(action)})]);assert.deepEqual(rs.map(r=>r.status).sort(),[200,409]);return await rs.find(r=>r.status===200)!.json() as any;}
room=await race({action:'discard',code,revision:room.revision,tile:room.game.seats[0].hand[0]},clients[0].cookie);
let moves=1;
while(room.game.phase==='playing'){
 assert(++moves<650);let index=room.game.turn;
 if(room.game.pending){for(let i=0;i<4;i++){const d:any=(await req('/api/mahjong?room='+code,undefined,clients[i].cookie)).data;if(d.game.phase!=='playing'){room=d;break;}if(d.game.options.canPass){room=d;index=i;break;}}}else room=(await req('/api/mahjong?room='+code,undefined,clients[index].cookie)).data;
 if(room.game.phase!=='playing')break;
 const g=room.game as MahjongView,o=g.options;let action:any;
 if(o.canPass){const best=o.claims.find(c=>c.kind==='hu')||o.claims.find(c=>c.kind==='kong')||o.claims.find(c=>c.kind==='pong');action=best?{action:'claim',key:best.key}:{action:'pass'};}
 else if(o.canHu)action={action:'hu'};
 else if(o.kongs.length)action={action:'kong',key:o.kongs[0].key};
 else{assert(o.canDiscard);const hand=g.seats[index].hand;action={action:'discard',tile:hand[(moves*7)%hand.length]};}
 room=(await req('/api/mahjong',{...action,code,revision:room.revision},clients[index].cookie)).data;
}
assert.equal(room.game.phase,'finished');assert.equal((await req('/api/mahjong',undefined,clients[0].cookie)).data.records.filter((r:any)=>r.room_code===code).length,1);
const before=[];for(const c of clients)before.push((await req('/api/auth',undefined,c.cookie)).data.user.score);
// A second, independently solvable local fixture proves non-zero settlement is atomic.
const local=JSON.parse(readFileSync('work/local-reset-fixture.json','utf8'));assert(local.database.startsWith('.wrangler/'));
const sql=new DatabaseSync(local.database);sql.exec('PRAGMA busy_timeout=5000');
const g=newMahjong(ids[0],'小满');g.seats=clients.map(c=>newSeat(c.data.user.id,c.data.user.name));g.phase='playing';g.round=crypto.randomUUID();g.roundNumber=2;g.deadline=Date.now()+30000;
const counts=Array(34).fill(0),winning=[0,1,2,9,10,11,18,19,20,27,27,27,31,31].map(t=>t*4+counts[t]++);g.seats[0].hand=winning;const unused=Array.from({length:136},(_,i)=>i).filter(i=>!winning.includes(i));for(let i=1;i<4;i++)g.seats[i].hand=unused.splice(0,13);g.wall=unused;g.drawn=winning.at(-1)!;
sql.prepare("UPDATE rooms SET state=?,phase='playing',revision=revision+1,op=?,updated=? WHERE code=?").run(JSON.stringify(g),crypto.randomUUID(),Date.now(),code);
room=(await req('/api/mahjong?room='+code,undefined,clients[0].cookie)).data;assert(room.game.options.canHu);
room=await race({action:'hu',code,revision:room.revision},clients[0].cookie);assert.deepEqual(room.game.deltas,[3,-1,-1,-1]);
for(let i=0;i<4;i++)assert.equal((await req('/api/auth',undefined,clients[i].cookie)).data.user.score,before[i]+[3,-1,-1,-1][i]);
await req('/api/mahjong',{action:'hu',code,revision:room.revision},clients[0].cookie,409);
assert.equal((await req('/api/mahjong',undefined,clients[0].cookie)).data.records.filter((r:any)=>r.room_code===code).length,2);
const data=(await req('/api/admin',undefined,admin.cookie)).data;const managed=data.rooms.find((r:any)=>r.code===code);assert.equal(managed.kind,'mahjong');assert.equal(managed.count,4);assert(data.records.some((r:any)=>r.room_code===code&&r.result.kind==='mahjong'));
await req('/api/admin',{action:'close',code},admin.cookie);assert.equal((await req('/api/mahjong',undefined,clients[0].cookie)).data.activeRoom,null);
await req('/api/mahjong',{action:'join',code},clients[0].cookie,400);
const closed=(await req('/api/mahjong?room='+code,undefined,clients[0].cookie)).data;assert.equal(closed.game.phase,'closed');await req('/api/mahjong',{action:'leave',code,revision:closed.revision},clients[0].cookie);assert.equal(sql.prepare('SELECT phase FROM rooms WHERE code=?').get(code)!.phase,'closed');
sql.close();console.log(JSON.stringify({result:'PASS',moves,checks:'4-player game, privacy, shared membership, cross-game routing, action races, exactly-once non-zero scoring, record separation, admin management, closed-room safety'}));
