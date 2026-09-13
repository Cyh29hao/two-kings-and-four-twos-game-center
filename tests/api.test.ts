import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {hints} from '../lib/game/engine.ts';
const origin='http://localhost:5173';
async function req(path:string,data?:any,session='',expect=200){const response=await fetch(origin+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json','Origin':origin}:{}),...(session?{cookie:session}:{})},...(data?{body:JSON.stringify(data)}:{})});const result=await response.json() as any;assert.equal(response.status,expect,JSON.stringify(result));return{data:result,cookie:response.headers.get('set-cookie')?.split(';')[0]||session};}
const testPassword='Local-test-only-913!';
await req('/api/game',undefined,'',401);
await req('/api/auth',{action:'register',username:'MartinHamburger',password:testPassword},'',409);
let admin;try{admin=await req('/api/auth',{action:'setup',username:'MartinHamburger',password:testPassword,token:process.argv[2]})}catch{admin=await req('/api/auth',{action:'login',username:'MartinHamburger',password:process.env.LOCAL_ADMIN_TEST_PASSWORD||testPassword})}
const suffix=Date.now().toString().slice(-7);
const a=await req('/api/auth',{action:'register',username:'testa'+suffix,password:testPassword,name:'小北'});
const b=await req('/api/auth',{action:'register',username:'testb'+suffix,password:testPassword,name:'阿满'});
const c=await req('/api/auth',{action:'register',username:'testc'+suffix,password:testPassword,name:'橘子'});
const clients=[a,b,c];
await req('/api/admin',undefined,a.cookie,403);
await req('/api/admin',{action:'settings',seconds:15,announcement:'测试公告',maintenance:false},a.cookie,403);
const csrf=await fetch(origin+'/api/game',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://example.invalid',cookie:a.cookie},body:JSON.stringify({action:'create'})});assert.equal(csrf.status,403);
let room=(await req('/api/game',{action:'create',title:'三人整局验证'},a.cookie)).data;
await req('/api/game?room='+room.code,undefined,b.cookie,403);
await req('/api/game',{action:'create',title:'重复加入测试'},a.cookie,409);
room=(await req('/api/game',{action:'join',code:room.code},b.cookie)).data;
room=(await req('/api/game',{action:'join',code:room.code},c.cookie)).data;
await req('/api/game',{action:'join',code:room.code},admin.cookie,400);
for(const client of clients)room=(await req('/api/game',{action:'ready',code:room.code,revision:room.revision},client.cookie)).data;
assert.equal(room.game.phase,'bidding');
for(const client of clients){const r=(await req('/api/game?room='+room.code,undefined,client.cookie)).data;assert.equal(r.game.bottom.length,0);r.game.seats.forEach((s:any)=>assert.equal(s.hand.length,s.id===client.data.user.id?17:0));}
let index=room.game.turn;
room=(await req('/api/game',{action:'bid',code:room.code,revision:room.revision,value:3},clients[index].cookie)).data;
const mine=(await req('/api/game?room='+room.code,undefined,clients[index].cookie)).data;
const bad=Array.from({length:54},(_,i)=>i).find(i=>!mine.game.seats[index].hand.includes(i));
await req('/api/game',{action:'play',code:room.code,revision:room.revision,cards:[bad]},clients[index].cookie,400);
const initial=hints(mine.game.seats[index].hand,null).sort((a,b)=>b.length-a.length)[0];
const action={action:'play',code:room.code,revision:room.revision,cards:initial};
const racing=await Promise.all([fetch(origin+'/api/game',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,cookie:clients[index].cookie},body:JSON.stringify(action)}),fetch(origin+'/api/game',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,cookie:clients[index].cookie},body:JSON.stringify(action)})]);
assert.deepEqual(racing.map(r=>r.status).sort(),[200,409]);room=await racing.find(r=>r.status===200)!.json();
assert.deepEqual(room.game.tableActions[index].cards,[...room.game.last.cards]);
for(const client of clients){const rejoined=(await req('/api/game?room='+room.code,undefined,client.cookie)).data;assert.deepEqual(rejoined.game.tableActions,room.game.tableActions);assert.equal(rejoined.game.tableActions[rejoined.game.turn],null);}
let turns=0;
while(room.game.phase==='playing'){
 assert(++turns<200);const i=room.game.turn;const r=(await req('/api/game?room='+room.code,undefined,clients[i].cookie)).data;
 const options=hints(r.game.seats[i].hand,r.game.last?.combo||null).sort((a,b)=>b.length-a.length);
 room=(await req('/api/game',{action:options.length?'play':'pass',code:r.code,revision:r.revision,cards:options[0]||[]},clients[i].cookie)).data;
}
assert.equal(room.game.phase,'finished');assert.equal(room.game.deltas.reduce((x:number,y:number)=>x+y,0),0);
assert.deepEqual(room.game.tableActions[room.game.winner].cards,room.game.last.cards);
const lobby=(await req('/api/game',undefined,a.cookie)).data;assert.equal(lobby.records.length,1);
await req('/api/game',{action:'play',code:room.code,revision:room.revision-1,cards:[]},a.cookie,409);
assert.equal((await req('/api/game',undefined,a.cookie)).data.records.length,1);
const scoreBefore=clients.map((client:any)=>client.data.user.score);const scoreAfter=[];
for(const client of clients)scoreAfter.push((await req('/api/game',undefined,client.cookie)).data.user.score);
assert.equal(scoreAfter.reduce((x,y)=>x+y,0),0);
await req('/api/admin',{action:'ban',id:b.data.user.id,banned:true},admin.cookie);
await req('/api/game',undefined,b.cookie,401);
await req('/api/auth',{action:'login',username:b.data.user.username,password:testPassword},'',403);
await req('/api/admin',{action:'ban',id:b.data.user.id,banned:false},admin.cookie);
await req('/api/admin',{action:'settings',seconds:45,announcement:'欢迎牌友',maintenance:true},admin.cookie);
await req('/api/game',{action:'create'},admin.cookie,400);
await req('/api/admin',{action:'settings',seconds:30,announcement:'欢迎来娱乐中心。建个房间，把房间号发给朋友就能入座。',maintenance:false},admin.cookie);
await req('/api/admin',{action:'close',code:room.code},admin.cookie);
assert.equal((await req('/api/game',undefined,a.cookie)).data.activeRoom,null);
const priorAdmin=(await req('/api/game',undefined,admin.cookie)).data.activeRoom;
if(priorAdmin)await req('/api/admin',{action:'close',code:priorAdmin},admin.cookie);
const adminRoom=(await req('/api/game',{action:'create',title:'周末的快乐牌桌'},admin.cookie)).data;
await req('/api/game',{action:'join',code:adminRoom.code},a.cookie);
await req('/api/game',{action:'join',code:adminRoom.code},c.cookie);
writeFileSync('work/local-qa.json',JSON.stringify({admin:admin.cookie,room:adminRoom.code,players:[a,c].map(x=>x.cookie)}));
console.log(JSON.stringify({result:'PASS',assertions:'auth, CSRF, ownership, hidden cards, 3-player match, double submission, single settlement, admin permissions, bans, maintenance, close room',turns,scoreAfter,previewRoom:adminRoom.code}));
