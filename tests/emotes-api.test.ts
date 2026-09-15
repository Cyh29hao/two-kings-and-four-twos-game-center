// Local-only integration. Synthetic accounts and SQLite fixtures; never accepts a remote origin.
import assert from 'node:assert/strict';import {EMOTES,emoteText} from '../lib/emotes.ts';import {readFileSync,writeFileSync} from 'node:fs';import {DatabaseSync} from 'node:sqlite';
const origin='http://localhost:5173',f=JSON.parse(readFileSync('work/local-reset-fixture.json','utf8'));assert(f.database.startsWith('.wrangler/'));const sql=new DatabaseSync(f.database);sql.exec('PRAGMA busy_timeout=5000');
async function req(path:string,data?:unknown,cookie='',expect?:number){const r=await fetch(origin+path,{method:data?'POST':'GET',headers:{Origin:origin,...(data?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});const d:any=await r.json();if(expect!==undefined)assert.equal(r.status,expect,JSON.stringify(d));return {status:r.status,data:d,cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};}
const enabled=EMOTES.filter(e=>e.sendable!==false),first=enabled[0].id,second=enabled[1].id,third=enabled[2].id;
const suffix=Date.now().toString().slice(-9),password='Emotes-local-only-915!',groups:any[]=[],all:any[]=[];
for(const [path,count] of [['/api/game',3],['/api/mahjong',4],['/api/holdem',10]] as const){
 const clients:any[]=[];
 for(let i=0;i<count;i++){const username=`em${all.length}${suffix}`,r=await req('/api/auth',{action:'register',username,name:i?'朋友'+i:'表情验收',password},'',200);const c={...r,username,id:r.data.user.id};clients.push(c);all.push(c);}
 let room=(await req(path,{action:'create',...(path==='/api/holdem'?{capacity:10}:{}),title:'原创表情联机验收'},clients[0].cookie,200)).data;
 for(let i=1;i<count;i++)room=(await req(path,{action:'join',code:room.code},clients[i].cookie,200)).data;
 for(let i=0;i<count;i++)room=(await req(path,{action:'ready',code:room.code,revision:room.revision},clients[i].cookie,200)).data;
 const code=room.code,before=sql.prepare('SELECT revision,state FROM rooms WHERE code=?').get(code)!;
 await req('/api/chat?room='+code,undefined,'',401);
 const key=crypto.randomUUID(),payload={code,kind:'emote',emoteId:first,clientId:key};
 const race=await Promise.all([req('/api/chat',payload,clients[0].cookie),req('/api/chat',payload,clients[0].cookie)]);assert(race.every(r=>r.status===200),JSON.stringify(race.map(x=>[x.status,x.data])));assert.equal(race[0].data.id,race[1].data.id);
 await req('/api/chat',{...payload,emoteId:second},clients[0].cookie,409);
 await req('/api/chat',{code,kind:'emote',emoteId:'hello',clientId:crypto.randomUUID()},clients[0].cookie,400);
 const cooldown=await req('/api/chat',{...payload,clientId:crypto.randomUUID()},clients[0].cookie,429);assert(cooldown.data.retryAfterMs>0);
 const attempts=await Promise.all([first,second,third].map(emoteId=>req('/api/chat',{...payload,emoteId,clientId:crypto.randomUUID()},clients[1].cookie)));assert.deepEqual(attempts.map(x=>x.status).sort(),[200,429,429]);
 for(const bad of [{kind:'emote',emoteId:'https://evil/a.png'},{kind:'emote',emoteId:'missing'},{kind:'emote',emoteId:first,text:'override'},{kind:'text',text:'hi',emoteId:first},{kind:'unknown'}])await req('/api/chat',{code,clientId:crypto.randomUUID(),...bad},clients[0].cookie,400);
 await req('/api/chat',{code,text:'文字仍然可用 <script>不会执行</script>',clientId:crypto.randomUUID()},clients[0].cookie,200);
 const snapshot=(await req('/api/chat?room='+code,undefined,clients[0].cookie,200)).data;assert.equal(snapshot.messages.length,3);assert.equal(snapshot.messages[0].kind,'emote');assert.equal(snapshot.messages[0].emoteId,first);assert.equal(snapshot.messages[0].text,emoteText(first));assert.equal(snapshot.messages[2].kind,'text');assert(!JSON.stringify(snapshot).includes(clients[0].username));assert(!JSON.stringify(snapshot).includes('clientId'));
 const delta=(await req('/api/chat?room='+code+'&after='+snapshot.messages[0].id,undefined,clients[1].cookie,200)).data;assert.equal(delta.messages.length,2);assert(delta.messages.every((m:any)=>m.id>snapshot.messages[0].id));
 assert.equal((await req('/api/chat?room='+code+'&after='+snapshot.cursor,undefined,clients[0].cookie,200)).data.messages.length,0);
 await req('/api/chat?room='+code+'&after=-1',undefined,clients[0].cookie,400);
 assert.deepEqual(sql.prepare('SELECT revision,state FROM rooms WHERE code=?').get(code),before,'chat must not mutate gameplay');
 // Put deadline far ahead only in these new local QA rooms, so browser inspection cannot time out.
 const g=JSON.parse(before.state as string);g.deadline=Date.now()+3600000;sql.prepare('UPDATE rooms SET state=? WHERE code=?').run(JSON.stringify(g),code);
 groups.push({path,code,clients});
}
await req('/api/chat?room='+groups[0].code,undefined,groups[1].clients[0].cookie,403);await req('/api/chat',{code:groups[0].code,kind:'emote',emoteId:first,clientId:crypto.randomUUID()},groups[1].clients[0].cookie,403);
// Pagination and legacy insert compatibility, on a dedicated local room transcript.
const room=groups[0],owner=room.clients[0];const insert=sql.prepare('INSERT INTO room_messages(room_code,author_id,client_id,display,text,created) VALUES(?,?,?,?,?,?)');for(let i=0;i<90;i++)insert.run(room.code,owner.id,crypto.randomUUID(),'测试牌友','历史 '+i,Date.now()-60000);
const full=(await req('/api/chat?room='+room.code,undefined,owner.cookie,200)).data;assert.equal(full.messages.length,80);assert(full.messages.every((m:any)=>m.kind==='text'));
let cursor=0,total=0;do{const page=(await req('/api/chat?room='+room.code+'&after='+cursor,undefined,owner.cookie,200)).data;assert(page.messages.every((m:any)=>m.id>cursor));total+=page.messages.length;cursor=page.cursor;if(!page.hasMore)break;}while(true);assert.equal(total,93);
// Closed-table race: either commit before closure or reject; nothing can insert after closure.
const target=groups[1],old=sql.prepare('SELECT state,phase FROM rooms WHERE code=?').get(target.code)!,g=JSON.parse(old.state as string);g.phase='closed';sql.prepare('UPDATE rooms SET state=?,phase=? WHERE code=?').run(JSON.stringify(g),'closed',target.code);
await req('/api/chat',{code:target.code,kind:'emote',emoteId:second,clientId:crypto.randomUUID()},target.clients[2].cookie,400);assert((await req('/api/chat?room='+target.code,undefined,target.clients[0].cookie,200)).data.closed);
sql.prepare('UPDATE rooms SET state=?,phase=? WHERE code=?').run(old.state,old.phase,target.code);
writeFileSync('work/emotes-ui-fixture.json',JSON.stringify({database:f.database,password,groups}));
sql.close();console.log({result:'PASS',games:3,seats:[3,4,10],checks:'legacy/text, private rooms, atomic cooldown, duplicate retry, pagination, closed rooms, unchanged game revisions',rooms:groups.map(g=>({path:g.path,code:g.code,username:g.clients[0].username}))});
