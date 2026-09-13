// Local-only HTTP integration: synthetic users and guarded SQLite fixtures.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {landlordDecision} from '../lib/practice/landlord.ts';
import {mahjongDecision} from '../lib/practice/mahjong.ts';
import {nextBot} from '../lib/practice/room.ts';
import {BASIC_CHIPS,HAM} from '../lib/mahjong/rules.ts';
const origin='http://localhost:5173',password='Practice-local-only-913!';
const fixture=JSON.parse(readFileSync('work/local-reset-fixture.json','utf8'));assert(fixture.database.startsWith('.wrangler/'));
const sql=new DatabaseSync(fixture.database);sql.exec('PRAGMA busy_timeout=5000');
async function req(path:string,data?:unknown,cookie='',expect=200){const r=await fetch(origin+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});const body:any=await r.json();assert.equal(r.status,expect,JSON.stringify(body));return {data:body,cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};}
const suffix=Date.now().toString().slice(-9);
const outsider=await req('/api/auth',{action:'register',username:'botout'+suffix,name:'外部测试者',password});
const results=[];
for(const [index,kind] of ['landlord','ham','basic'].entries()){
 const client=await req('/api/auth',{action:'register',username:'botqa'+index+suffix,name:'人机接口测试',password}),path=kind==='landlord'?'/api/game':'/api/mahjong';
 await req(path,{action:'create',mode:'invalid'},client.cookie,400);
 let room=(await req(path,{action:'create',mode:'practice',rulesId:kind==='basic'?BASIC_CHIPS.id:HAM.id},client.cookie)).data;const code=room.code;
 function state(){return JSON.parse(sql.prepare('SELECT state FROM rooms WHERE code=?').get(code)!.state as string);}
 function persist(g:any){sql.prepare('UPDATE rooms SET state=?,phase=?,revision=revision+1,op=? WHERE code=?').run(JSON.stringify(g),g.phase,crypto.randomUUID(),code);}
 async function get(){room=(await req(path+'?room='+code,undefined,client.cookie)).data;}
 async function post(action:object){room=(await req(path,{...action,code,revision:room.revision},client.cookie)).data;}
 assert.equal(room.game.seats.length,kind==='landlord'?3:4);assert(room.game.seats.slice(1).every((s:any)=>s.bot&&s.ready));
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM members WHERE room_code=?').get(code)!.n,1);
 assert.equal(sql.prepare("SELECT COUNT(*) n FROM users WHERE id LIKE 'bot:%'").get()!.n,0);
 await req(path+'?room='+code,undefined,outsider.cookie,403);await req(path,{action:'join',code},outsider.cookie,403);
 await req(path,{action:'end_practice',code,revision:room.revision},outsider.cookie,403);
 let actions=0;
 for(let round=0;round<2;round++){
  await post({action:'ready'});assert(['bidding','playing'].includes(room.game.phase));
  while(['bidding','playing','choosing'].includes(room.game.phase)){
   assert(++actions<600);const g=state();
   if(nextBot(g)>=0){g.practice.nextAt=1;persist(g);
    const before=sql.prepare('SELECT revision FROM rooms WHERE code=?').get(code)!.revision as number;
    const race=await Promise.all([req(path+'?room='+code,undefined,client.cookie),req(path+'?room='+code,undefined,client.cookie)]);
    room=race[0].data;assert.equal(sql.prepare('SELECT revision FROM rooms WHERE code=?').get(code)!.revision,before+1);await get();
   }else{
    await get();const v=room.game,me=v.seats[0];assert.equal(me.id,client.data.user.id);
    if(v.phase==='choosing'){assert(v.canChoose);const old=room.revision;await get();assert.equal(room.revision,old);const options=(await req('/api/mahjong/win-options?room='+code,undefined,client.cookie)).data;await post({action:'confirm_win',candidateId:options.plans[0].id});}
    else if(kind==='landlord'){
     const opponents=v.seats.filter((_:any,i:number)=>(i===v.landlord)!==(0===v.landlord));
     await post(landlordDecision({hand:me.hand,phase:v.phase,bid:v.bid,last:v.last?.combo??null,lastIsTeammate:!!v.last&&v.landlord!==0&&v.last.seat!==v.landlord,nextOpponentCount:(1===v.landlord)!==(0===v.landlord)?v.seats[1].count:0,opponentMinimum:Math.min(...opponents.map((s:any)=>s.count))}));
    }else await post(mahjongDecision({hand:me.hand,melds:me.melds,wildcard:v.wildcard,remaining:v.remaining,visible:v.seats.flatMap((s:any)=>[...s.hand,...s.river,...s.melds.flatMap((m:any)=>m.tiles)]),river:v.seats.flatMap((s:any)=>s.river),options:v.options,pending:v.pending}));
   }
   assert(!JSON.stringify(room.game).includes('"wall"'));
   if(kind!=='landlord'){const s=state(),tiles=[...s.wall,...s.seats.flatMap((p:any)=>[...p.hand,...p.river,...p.melds.flatMap((m:any)=>m.tiles)]),...(s.result?.awards.map((a:any)=>a.tile)||[])];assert.equal(tiles.length,136);assert.equal(new Set(tiles).size,136);}
  }
  assert.equal(room.game.phase,'finished');assert(room.game.seats.slice(1).every((s:any)=>s.ready));
  assert.equal((await req('/api/auth',undefined,client.cookie)).data.user.score,client.data.user.score);
  const records=sql.prepare('SELECT result FROM records WHERE room_code=?').all(code);assert.equal(records.length,round+1);assert(records.every(r=>JSON.parse(r.result as string).practice));
 }
 const previous=kind==='landlord'?null:room.game.seats.map((s:any)=>s.balance);
 await post({action:'ready'});assert(['bidding','playing'].includes(room.game.phase));
 if(kind==='ham'){
  const g=state();g.turn=0;g.pending=null;g.opening=false;g.wildcard=32;const types=[0,0,0,0,9,10,11,18,19,20,27,27,28,28],counts=Array(34).fill(0);g.seats[0].hand=types.map(t=>t*4+counts[t]++);const occupied=new Set(g.seats[0].hand),rest=Array.from({length:136},(_,i)=>i).filter(t=>!occupied.has(t));for(let i=1;i<4;i++){g.seats[i].hand=rest.splice(0,13);g.seats[i].melds=[];g.seats[i].river=[];}g.wall=rest;g.drawn=g.seats[0].hand.at(-1);g.deadline=Date.now()+30000;g.practice.nextAt=0;persist(g);await get();const kong=room.game.options.kongs.find((k:any)=>k.kind==='concealed');assert(kong);await post({action:'kong',key:kong.key});assert.equal(room.game.deltas[0],'60');
 }
 await post({action:'end_practice'});
 assert.equal(state().phase,'closed');assert.equal((await req(path,undefined,client.cookie)).data.activeRoom,null);
 if(kind!=='landlord'){
  assert.deepEqual(state().seats.map((s:any)=>s.balance),previous);
  const report=(await req('/api/mahjong/reports?room='+code,undefined,client.cookie)).data;assert(report.practice);assert.equal(report.totalRounds,3);assert.equal(report.players.filter((p:any)=>p.bot).length,3);assert.equal(report.players.reduce((n:bigint,p:any)=>n+BigInt(p.delta),0n),0n);
 }
 assert.equal((await req('/api/auth',undefined,client.cookie)).data.user.score,client.data.user.score);results.push({kind,actions,rounds:2});
}
sql.close();console.log({result:'PASS',results,checks:'HTTP play, exactly-once bot actions, private seats, unchanged scores, next round, human confirmation, end/refund and reports'});
