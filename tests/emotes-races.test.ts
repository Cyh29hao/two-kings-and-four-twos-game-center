import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';
const f=JSON.parse(readFileSync('work/emotes-ui-fixture.json','utf8'));assert(f.database.startsWith('.wrangler/'));const db=new DatabaseSync(f.database);db.exec('PRAGMA busy_timeout=5000');
const source=f.groups[2],actor=source.clients[9],row=db.prepare('SELECT * FROM rooms WHERE code=?').get(source.code)!;
for(let i=0;i<6;i++){
 const code=String(900000+Math.floor(Math.random()*90000));assert(!db.prepare('SELECT 1 FROM rooms WHERE code=?').get(code));
 db.prepare('INSERT INTO rooms(code,title,state,phase,revision,op,created,updated) VALUES(?,?,?,?,?,?,?,?)').run(code,'本地关闭竞争测试',row.state,row.phase,0,crypto.randomUUID(),Date.now(),Date.now());
 const post=fetch('http://localhost:5173/api/chat',{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json',cookie:actor.cookie},body:JSON.stringify({code,kind:'emote',emoteId:'hello',clientId:crypto.randomUUID()})});
 if(i%2)await new Promise(r=>setTimeout(r,20));
 db.prepare("UPDATE rooms SET phase='closed' WHERE code=?").run(code);
 const countAtClose=Number(db.prepare('SELECT count(*) n FROM room_messages WHERE room_code=?').get(code)!.n);
 const response=await post;assert([200,400,409,429].includes(response.status),await response.text());
 assert.equal(Number(db.prepare('SELECT count(*) n FROM room_messages WHERE room_code=?').get(code)!.n),countAtClose,'no message may be inserted after close');
 db.prepare('DELETE FROM room_messages WHERE room_code=?').run(code);db.prepare('DELETE FROM rooms WHERE code=?').run(code);
}
const plans=db.prepare("EXPLAIN QUERY PLAN SELECT created FROM room_messages WHERE author_id=? AND kind='emote' AND created>? ORDER BY created DESC LIMIT 1").all(actor.id,0);assert(plans.some(p=>String(p.detail).includes('idx_room_messages_author_kind_created')));db.close();console.log('PASS: six close/send races and indexed cooldown query');
