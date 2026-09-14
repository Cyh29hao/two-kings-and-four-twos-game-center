// Local-only integration: two human sessions, server robots and guarded local DB inspection.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {nextBot} from '../lib/practice/room.ts';
import {landlordDecision} from '../lib/practice/landlord.ts';
import {mahjongDecision} from '../lib/practice/mahjong.ts';
import {HAM,BASIC_CHIPS} from '../lib/mahjong/rules.ts';
const origin='http://localhost:5173',fixture=JSON.parse(readFileSync('work/local-reset-fixture.json','utf8'));assert(fixture.database.startsWith('.wrangler/'));
const sql=new DatabaseSync(fixture.database);sql.exec('PRAGMA busy_timeout=5000');
async function req(path:string,data?:unknown,cookie='',expect=200){const r=await fetch(origin+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});const body:any=await r.json();assert.equal(r.status,expect,JSON.stringify(body));return {data:body,cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};}
const suffix=Date.now().toString().slice(-9),clients:{data:any;cookie:string}[]=[];
for(let i=0;i<3;i++)clients.push(await req('/api/auth',{action:'register',username:'mixed'+i+suffix,name:['房主测试','朋友测试','后来朋友'][i],password:'Mixed-local-test-914!'}));
const results=[];
for(const kind of ['landlord','ham','basic']){
 const path=kind==='landlord'?'/api/game':'/api/mahjong';let room:any=(await req(path,{action:'create',mode:'friends',rulesId:kind==='basic'?BASIC_CHIPS.id:HAM.id},clients[0].cookie)).data;const code=room.code;
 const state=()=>JSON.parse(sql.prepare('SELECT state FROM rooms WHERE code=?').get(code)!.state as string);
 const persist=(g:any)=>sql.prepare('UPDATE rooms SET state=?,phase=?,revision=revision+1,op=? WHERE code=?').run(JSON.stringify(g),g.phase,crypto.randomUUID(),code);
 async function get(i=0){return (await req(path+'?room='+code,undefined,clients[i].cookie)).data;}
 async function post(action:object,i=0,expect=200){const r=await req(path,{...action,code,revision:room.revision},clients[i].cookie,expect);if(expect===200&&!r.data.left)room=r.data;return r.data;}
 room=await post({action:'join'},1);await post({action:'add_bot'},1,403);await post({action:'ready'},1);assert(room.game.seats[1].ready);
 const revision=room.revision;await post({action:'add_bot'});assert.equal(room.game.practice.roomType,'mixed');assert(!room.game.seats[1].ready);assert(room.game.seats[2].bot&&room.game.seats[2].ready);
 await req(path,{action:'add_bot',code,revision},clients[0].cookie,409);
 let botId=room.game.seats[2].id;await post({action:'remove_bot',botId},1,403);await post({action:'remove_bot',botId:clients[1].data.user.id},0,400);await post({action:'remove_bot',botId});assert(!room.game.practice);
 // Friend can join after a robot was added; a full room cannot be overfilled.
 await post({action:'add_bot'});
 if(kind!=='landlord'){await post({action:'join'},2);await post({action:'add_bot'},0,400);await post({action:'leave'},2);room=await get();await post({action:'add_bot'});}
 else await post({action:'join'},2,400);
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM members WHERE room_code=?').get(code)!.n,2);
 await post({action:'end_practice'},0,403);
 let actions=0;
 for(let round=0;round<2;round++){
  await post({action:'ready'});assert(['waiting','finished'].includes(room.game.phase));await post({action:'ready'},1);assert(['playing','bidding'].includes(room.game.phase));
  await post({action:'add_bot'},0,400);await post({action:'remove_bot',botId:room.game.seats[2].id},0,400);
  while(['bidding','playing','choosing','revealing'].includes(room.game.phase)){
   assert(++actions<700);let g=state();
   if(nextBot(g)>=0){g.practice.nextAt=1;persist(g);const rev=sql.prepare('SELECT revision FROM rooms WHERE code=?').get(code)!.revision;await Promise.all([get(),get(1)]);assert.equal(sql.prepare('SELECT revision FROM rooms WHERE code=?').get(code)!.revision,Number(rev)+1);room=await get();}
   else{
    const actor=['choosing','revealing'].includes(g.phase)?g.winner:g.pending?g.pending.eligible.find((s:number)=>!Object.hasOwn(g.pending.responses,String(s))):g.turn;
    assert(actor===0||actor===1);room=await get(actor);const v=room.game,me=v.seats[actor];
    if(v.phase==='revealing'){await post({action:'flip_award',awardIndex:v.awardReveal.awards.length},actor);}
    else if(v.phase==='choosing'){assert(v.canChoose);const options=(await req('/api/mahjong/win-options?room='+code,undefined,clients[actor].cookie)).data;await post({action:'confirm_win',candidateId:options.plans[0].id},actor);}
    else if(kind==='landlord'){
     const opponents=v.seats.filter((_:any,i:number)=>(i===v.landlord)!==(actor===v.landlord)),next=(actor+1)%3;
     await post(landlordDecision({hand:me.hand,phase:v.phase,bid:v.bid,last:v.last?.combo??null,lastIsTeammate:!!v.last&&actor!==v.landlord&&v.last.seat!==v.landlord,nextOpponentCount:(next===v.landlord)!==(actor===v.landlord)?v.seats[next].count:0,opponentMinimum:Math.min(...opponents.map((s:any)=>s.count))}),actor);
    }else await post(mahjongDecision({hand:me.hand,melds:me.melds,wildcard:v.wildcard,remaining:v.remaining,visible:v.seats.flatMap((s:any)=>[...s.hand,...s.river,...s.melds.flatMap((m:any)=>m.tiles)]),river:v.seats.flatMap((s:any)=>s.river),options:v.options,pending:v.pending}),actor);
   }
   if(room.game.phase!=='finished')assert(room.game.seats.filter((s:any)=>s.id!==clients[0].data.user.id&&s.id!==clients[1].data.user.id).every((s:any)=>s.hand.length===0));
   if(kind!=='landlord'){const g=state(),all=[...g.wall,...g.seats.flatMap((s:any)=>[...s.hand,...s.river,...s.melds.flatMap((m:any)=>m.tiles)]),...(g.result?.awards.map((a:any)=>a.tile)||g.reveal?.awards.map((a:any)=>a.tile)||[])];assert.equal(all.length,136);assert.equal(new Set(all).size,136);}
  }
  assert.equal(room.game.phase,'finished');assert(room.game.seats.filter((s:any)=>s.bot).every((s:any)=>s.ready));
  const records=sql.prepare('SELECT result FROM records WHERE room_code=?').all(code);assert.equal(records.length,round+1);assert(records.every(r=>JSON.parse(r.result as string).practice));
  for(const client of clients)assert.equal((await req('/api/auth',undefined,client.cookie)).data.user.score,client.data.user.score);
 }
 if(kind==='landlord'){await post({action:'leave'});room=await get(1);assert.equal(room.game.host,clients[1].data.user.id);await post({action:'leave'},1);assert.equal(state().phase,'closed');assert.equal(state().seats.length,0);}
 else{await post({action:'leave'},1,400);await post({action:'end_table'},1,403);await post({action:'end_table'});const report:any=(await req('/api/mahjong/reports?room='+code,undefined,clients[1].cookie)).data;assert(report.practice);assert.equal(report.totalRounds,2);assert.equal(report.players.filter((p:any)=>p.bot).length,2);assert.equal(report.players.reduce((n:bigint,p:any)=>n+BigInt(p.delta),0n),0n);}
 assert.equal(sql.prepare('SELECT COUNT(*) n FROM members WHERE room_code=?').get(code)!.n,0);results.push({kind,rounds:2,actions});
}
sql.close();console.log({result:'PASS',results,checks:'mixed humans/bots, host permissions, remove/join, readiness reset, stale revision, concurrent bot, private hands, stable scores and reports'});
