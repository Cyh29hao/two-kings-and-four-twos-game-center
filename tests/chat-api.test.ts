import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {DatabaseSync} from 'node:sqlite';
const origin='http://localhost:5173',fixture=JSON.parse(readFileSync('work/local-reset-fixture.json','utf8'));assert(fixture.database.startsWith('.wrangler/'));const sql=new DatabaseSync(fixture.database);
async function req(path:string,data?:unknown,cookie='',expect=200){const r=await fetch(origin+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{cookie}:{})},...(data?{body:JSON.stringify(data)}:{})});const body:any=await r.json();assert.equal(r.status,expect,JSON.stringify(body));return {data:body,cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};}
const clients:{data:any;cookie:string}[]=[],suffix=Date.now().toString().slice(-9);for(let i=0;i<3;i++)clients.push(await req('/api/auth',{action:'register',username:'chat'+i+suffix,name:i===2?'房外玩家':'同名牌友',password:'Chat-local-only-914!'}));
for(const path of ['/api/game','/api/mahjong']){
 let room:any=(await req(path,{action:'create'},clients[0].cookie)).data;const code=room.code;room=(await req(path,{action:'join',code},clients[1].cookie)).data;
 const before=sql.prepare('SELECT revision,state FROM rooms WHERE code=?').get(code)!;
 await req('/api/chat?room='+code,undefined,'',401);await req('/api/chat?room='+code,undefined,clients[2].cookie,403);await req('/api/chat',{code,text:'不在房间',clientId:crypto.randomUUID()},clients[2].cookie,403);
 for(const text of ['', '   ','x'.repeat(501),'\u0000'])await req('/api/chat',{code,text,clientId:crypto.randomUUID()},clients[0].cookie,400);
 const clientId=crypto.randomUUID(),text='你好 🀄\n<script>alert(1)</script>';const race=await Promise.all([req('/api/chat',{code,text,clientId},clients[0].cookie),req('/api/chat',{code,text,clientId},clients[0].cookie)]);assert.equal(race[0].data.id,race[1].data.id);await req('/api/chat',{code,text,clientId},clients[0].cookie);
 await req('/api/chat',{code,text:'不能更改已发出的消息',clientId},clients[0].cookie,409);
 await req('/api/chat',{code,text:'收到，一起开局。',clientId:crypto.randomUUID()},clients[1].cookie);
 const read=(await req('/api/chat?room='+code,undefined,clients[1].cookie)).data;assert.equal(read.messages.length,2);assert.equal(read.messages[0].text,text);assert.equal(read.messages[0].own,0);assert.equal(read.messages[1].own,1);assert.equal(read.messages[0].senderId,clients[0].data.user.id);assert.equal(read.messages[1].senderId,clients[1].data.user.id);assert.notEqual(read.messages[0].senderId,read.messages[1].senderId);assert.equal(read.messages[0].name,read.messages[1].name);assert(read.serverNow>=read.messages[1].created);assert(!JSON.stringify(read).includes(clients[0].data.user.username));assert(read.messages.every((m:any)=>!('author_id' in m)&&!('client_id' in m)));
 assert.deepEqual(sql.prepare('SELECT revision,state FROM rooms WHERE code=?').get(code),before);
 // Simulate a closed room with a guarded local fixture; existing members can read but nobody can send.
 const g=JSON.parse(before.state as string);g.phase='closed';sql.prepare("UPDATE rooms SET phase='closed',state=?,revision=revision+1 WHERE code=?").run(JSON.stringify(g),code);assert((await req('/api/chat?room='+code,undefined,clients[1].cookie)).data.closed);await req('/api/chat',{code,text:'已关闭',clientId:crypto.randomUUID()},clients[1].cookie,400);
 sql.prepare('DELETE FROM members WHERE room_code=?').run(code);
}
sql.close();console.log({result:'PASS',checks:'two players, outsiders/auth, lengths, plain text, duplicate/race exactly once, no game revision changes, closed room read-only'});
