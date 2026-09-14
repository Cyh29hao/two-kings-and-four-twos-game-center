// Local HTTP integration only: synthetic users and room fixtures, never a remote database.
import assert from 'node:assert/strict';import {readFileSync,writeFileSync} from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import {holdemOptions,holdemView,holdemRules,newHoldem,type HoldemGame} from '../lib/holdem/engine.ts';
const origin='http://localhost:5173',fixture=JSON.parse(readFileSync('work/local-reset-fixture.json','utf8'));assert(fixture.database.startsWith('.wrangler/'));const sql=new DatabaseSync(fixture.database);sql.exec('PRAGMA busy_timeout=5000');
const password='Holdem-local-test-914!';
async function req(path:string,data?:unknown,cookie='',expect=200){const r=await fetch(origin+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});const body:any=await r.json();assert.equal(r.status,expect,JSON.stringify(body));return {data:body,cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};}
await req('/api/holdem',undefined,'',401);
const suffix=Date.now().toString().slice(-9),clients:{data:any;cookie:string}[]=[];for(let i=0;i<5;i++)clients.push(await req('/api/auth',{action:'register',username:'texas'+i+suffix,name:['德州验收','朋友乙','朋友丙','朋友丁','房外玩家'][i],password}));
const admin=await req('/api/auth',{action:'login',username:'MartinHamburger',password:process.env.LOCAL_ADMIN_TEST_PASSWORD||'Local-reset-test-only-913!'});
for(const settings of [{capacity:3},{capacity:11},{small:'40'},{initial:'10'},{ante:'1.5'},{capacity:'4'},{initial:'1000000000000000'}])await req('/api/holdem',{action:'create',...settings},clients[0].cookie,400);
let room=(await req('/api/holdem',{action:'create',capacity:4,title:'四人德州验收'},clients[0].cookie)).data;let code=room.code;
const state=()=>JSON.parse(sql.prepare('SELECT state FROM rooms WHERE code=?').get(code)!.state as string) as HoldemGame;
const persist=(g:HoldemGame)=>sql.prepare('UPDATE rooms SET state=?,phase=?,revision=revision+1,op=? WHERE code=?').run(JSON.stringify(g),g.phase,crypto.randomUUID(),code);
async function get(i=0){return (await req('/api/holdem?room='+code,undefined,clients[i].cookie)).data;}
async function post(action:object,i=0,expect=200){const r=await req('/api/holdem',{...action,code,revision:room.revision},clients[i].cookie,expect);if(expect===200&&!r.data.left)room=r.data;return r.data;}
function invariant(){const g=state(),cards=[...g.deck,...g.burns,...g.board,...g.seats.flatMap(s=>s.hand)];if(g.round){assert.equal(cards.length,52);assert.equal(new Set(cards).size,52);}assert.equal(g.seats.reduce((n,s)=>n+BigInt(s.stack)+(['playing','runout'].includes(g.phase)?BigInt(s.total):0n),0n),g.seats.reduce((n,s)=>n+BigInt(s.brought),0n));}
assert.deepEqual(room.game.rules,holdemRules({capacity:4}));await req('/api/holdem?room='+code,undefined,clients[4].cookie,403);
await req('/api/game?room='+code,undefined,clients[0].cookie,409);await req('/api/mahjong?room='+code,undefined,clients[0].cookie,409);
assert.equal((await req('/api/game',{action:'join',code},clients[0].cookie)).data.redirect,'/holdem?room='+code);
for(let i=1;i<4;i++)await post({action:'join'},i);
await post({action:'join'},4,400);await post({action:'add_bot'},1,403);await post({action:'add_bot'},0,400);
for(let i=0;i<4;i++){await post({action:'ready'},i);if(i<3)assert.equal(room.game.phase,'waiting');}
await post({action:'remove_bot',botId:'none'},0,400);await post({action:'leave'},1,400);await post({action:'rebuy'},0,400);await post({action:'end_table'},0,400);
for(let i=0;i<4;i++){const v=(await get(i)).game;assert.equal(v.seats[i].hand.length,2);assert(v.seats.every((s:any,j:number)=>i===j||s.hand.length===0));assert(!('deck'in v));assert(!('burns'in v));}
await req('/api/chat',{code,text:'本地联机验收消息',clientId:crypto.randomUUID()},clients[1].cookie);const chat=(await req('/api/chat?room='+code,undefined,clients[0].cookie)).data;assert.equal(chat.messages.at(-1).senderId,clients[1].data.user.id);await req('/api/chat?room='+code,undefined,clients[4].cookie,403);
const current=state().turn,action={action:'call',code,revision:room.revision};const racing=await Promise.all([0,1].map(()=>fetch(origin+'/api/holdem',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,cookie:clients[current].cookie},body:JSON.stringify(action)})));assert.deepEqual(racing.map(r=>r.status).sort(),[200,409]);room=await get();
let actions=0;
async function playRound(allin=false){while(['playing','runout'].includes(room.game.phase)){assert(++actions<350);let g=state();invariant();if(g.phase==='runout'||g.seats[g.turn].bot){g.deadline=1;persist(g);const before=sql.prepare('SELECT revision FROM rooms WHERE code=?').get(code)!.revision;await Promise.all([get(),get(1)]);assert.equal(sql.prepare('SELECT revision FROM rooms WHERE code=?').get(code)!.revision,Number(before)+1);room=await get();}else{const i=g.turn,o=holdemOptions(g,g.seats[i].id);room=await get(i);await post({action:allin&&o.canAllIn?'allin':o.check?'check':'call'},i);}}invariant();assert.equal(room.game.phase,'finished');}
await playRound();assert.equal(room.game.result.type,'showdown');assert(room.game.result.seats.every((s:any)=>s.hand.length===2));assert.equal(sql.prepare('SELECT count(*) n FROM records WHERE room_code=?').get(code)!.n,1);
// Unequal local stacks force main/side pots and an uncalled refund in a second hand.
let g=state();g.seats.forEach((s,i)=>{s.stack=['150','300','600','1000'][i];s.brought=s.stack;s.ready=false});persist(g);room=await get();for(let i=0;i<4;i++)await post({action:'ready'},i);await playRound(true);assert(room.game.result.pots.length>=3);assert.equal(sql.prepare('SELECT count(*) n FROM records WHERE room_code=?').get(code)!.n,2);
const broke=state().seats.findIndex(s=>s.stack==='0');assert(broke>=0);const before=BigInt(state().seats[broke].brought);room=await get(broke);const rebuy={action:'rebuy',code,revision:room.revision};const rebuys=await Promise.all([0,1].map(()=>fetch(origin+'/api/holdem',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,cookie:clients[broke].cookie},body:JSON.stringify(rebuy)})));assert.deepEqual(rebuys.map(r=>r.status).sort(),[200,409]);assert.equal(BigInt(state().seats[broke].brought),before+1000n);room=await get();await post({action:'rebuy'},broke,400);
for(let i=0;i<4;i++){if(state().seats[i].stack==='0')await post({action:'rebuy'},i);await post({action:'ready'},i);}
const priorStacks=state().roundStart;await req('/api/admin',{action:'close',code},clients[1].cookie,403);await Promise.all([req('/api/admin',{action:'close',code},admin.cookie),get()]);assert.equal(state().phase,'closed');assert.deepEqual(state().seats.map(s=>s.stack),priorStacks);invariant();assert.equal(sql.prepare('SELECT count(*) n FROM records WHERE room_code=?').get(code)!.n,3);assert.equal(sql.prepare('SELECT count(*) n FROM members WHERE room_code=?').get(code)!.n,0);
for(const client of clients)assert.equal((await req('/api/auth',undefined,client.cookie)).data.user.score,client.data.user.score);
// Ten seats, two friends plus eight bots. Exercise mixed readiness and one full HTTP hand.
room=(await req('/api/holdem',{action:'create',capacity:10,title:'十人混合验收'},clients[0].cookie)).data;code=room.code;await post({action:'join'},1);await post({action:'add_bot'});const botId=room.game.seats[2].id;await post({action:'remove_bot',botId});for(let i=0;i<8;i++)await post({action:'add_bot'});assert.equal(room.game.seats.length,10);assert.equal(sql.prepare('SELECT count(*) n FROM members WHERE room_code=?').get(code)!.n,2);
await post({action:'ready'},1);await post({action:'ready'});await playRound();await post({action:'end_table'},1,403);await post({action:'end_table'});assert.equal(state().phase,'closed');invariant();
const d=(await req('/api/admin',undefined,admin.cookie)).data;assert(d.records.some((r:any)=>r.room_code===code&&r.result.kind==='holdem'));
// Preview uses its own account and a fresh, unstarted room. No real room is altered.
room=(await req('/api/holdem',{action:'create',capacity:10,mode:'practice',title:'十人德州 · 布局预览'},clients[0].cookie)).data;
writeFileSync('work/holdem-preview.json',JSON.stringify({username:'texas0'+suffix,password,cookie:clients[0].cookie,code:room.code,database:fixture.database}));
sql.close();console.log({result:'PASS',actions,checks:'4/10 seats, defaults, custom options, mixed bots, rejoin/private views, chat, all streets, side pots, exact chips, duplicate moves/rebuy, admin refund, records and account isolation'});
