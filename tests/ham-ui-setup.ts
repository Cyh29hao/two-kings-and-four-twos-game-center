// Seed only the named local browser QA accounts. No production URL or database is accepted.
import {readFileSync,writeFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {dealModern,moveModern,type ModernGame} from '../lib/mahjong/modern.ts';
const f=JSON.parse(readFileSync('work/ham-ui-fixture.json','utf8'));if(!f.database.startsWith('.wrangler/'))throw Error('local fixture only');
const sql=new DatabaseSync(f.database);sql.exec('PRAGMA busy_timeout=5000');const code=sql.prepare('SELECT room_code FROM members WHERE user_id=?').get(f.ids[0])!.room_code as string;
async function post(data:unknown,cookie=''){const r=await fetch('http://localhost:5173/api/'+((data as any).action==='login'?'auth':'mahjong'),{method:'POST',headers:{Origin:'http://localhost:5173','Content-Type':'application/json',cookie},body:JSON.stringify(data)});const d:any=await r.json();if(r.status!==200)throw Error(JSON.stringify(d));return {d,cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};}
let row=sql.prepare('SELECT state FROM rooms WHERE code=?').get(code)!;let g=JSON.parse(row.state as string) as ModernGame;
if(g.seats.length<4){for(let i=1;i<4;i++){const c=await post({action:'login',username:f.usernames[i],password:'Ham-local-test-913!'});await post({action:'join',code},c.cookie);}g=JSON.parse(sql.prepare('SELECT state FROM rooms WHERE code=?').get(code)!.state as string);}
if(process.argv[2]==='extend'){g.deadline=Date.now()+60000;}
else {
 if(!['waiting','finished'].includes(g.phase))throw Error('finish the existing UI round before replacing it');dealModern(g);g.wildcard=32;g.opening=false;g.turn=0;
 const counts=Array(34).fill(0);g.seats[0].hand=[0,1,2,9,10,11,18,19,20,2,4,32,32,3].map(t=>t*4+counts[t]++);
 const prizes=[130,132],unused=Array.from({length:136},(_,i)=>i).filter(t=>!g.seats[0].hand.includes(t)&&!prizes.includes(t));for(let i=1;i<4;i++)g.seats[i].hand=unused.splice(0,13);g.wall=[...unused,...prizes];g.drawn=g.seats[0].hand.at(-1)!;
 if(process.argv[2]!=='playing')moveModern(g,0,{action:'hu'});
}
sql.prepare('UPDATE rooms SET state=?,phase=?,revision=revision+1,op=?,updated=? WHERE code=?').run(JSON.stringify(g),g.phase,crypto.randomUUID(),Date.now(),code);f.code=code;writeFileSync('work/ham-ui-fixture.json',JSON.stringify(f));sql.close();console.log(JSON.stringify({code,phase:g.phase,deadline:g.deadline}));
