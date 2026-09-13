// A closed local fixture verifies immutable pagination beyond the first twenty rounds.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
const origin='http://localhost:5173',f=JSON.parse(readFileSync('work/ham-ui-fixture.json','utf8'));assert(f.database.startsWith('.wrangler/'));
const sql=new DatabaseSync(f.database);sql.exec('PRAGMA busy_timeout=5000');
async function req(path:string,data?:unknown,cookie='',status=200){const r=await fetch(origin+path,{method:data?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',cookie},body:data?JSON.stringify(data):undefined});assert.equal(r.status,status);return {data:await r.json() as any,cookie:r.headers.get('set-cookie')?.split(';')[0]||cookie};}
const player=await req('/api/auth',{action:'login',username:f.usernames[0],password:'Ham-local-test-913!'}),admin=await req('/api/auth',{action:'login',username:'MartinHamburger',password:'Local-reset-test-only-913!'});
const original=sql.prepare('SELECT * FROM rooms WHERE code=?').get(f.finishedCode)!;
const g=JSON.parse(original.state as string),r=JSON.parse(sql.prepare('SELECT result FROM records WHERE id=?').get(f.wonRound)!.result as string);
let code:string;do{code=String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000);}while(sql.prepare('SELECT code FROM rooms WHERE code=?').get(code));
g.roundNumber=23;g.stats={completed:23,draws:0,aborted:0};g.ended=Date.now();g.seats.forEach((s:any,i:number)=>s.balance=(BigInt(g.initialChips)+BigInt(r.seats[i].delta)*23n).toString());
sql.exec('BEGIN');try{sql.prepare('INSERT INTO rooms (code,title,state,phase,revision,op,created,updated) VALUES (?,?,?,\'closed\',0,?,?,?)').run(code,'23 局分页测试',JSON.stringify(g),crypto.randomUUID(),g.started,g.ended);
 for(let n=1;n<=23;n++){const copy=structuredClone(r);copy.id=crypto.randomUUID();copy.roundNumber=n;copy.seats.forEach((s:any)=>s.balance=(BigInt(g.initialChips)+BigInt(s.delta)*BigInt(n)).toString());sql.prepare('INSERT INTO records (id,room_code,result,created) VALUES (?,?,?,?)').run(copy.id,code,JSON.stringify(copy),copy.ended+n);}
 sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}
const share=(await req('/api/mahjong/shares',{action:'create',code},player.cookie)).data;
for(const publicView of [false,true]){const nums:number[]=[];for(let page=0;page<2;page++){const path=publicView?'/api/mahjong/public-report?id='+share.id:'/api/mahjong/reports?room='+code;const data=(await req(path+'&page='+page,undefined,publicView?'':player.cookie)).data;assert.equal(data.totalRounds,23);assert.equal(data.rounds.length,page?3:20);nums.push(...data.rounds.map((r:any)=>r.number));assert(!JSON.stringify(data).includes('username'));}assert.deepEqual(nums,Array.from({length:23},(_,i)=>23-i));}
await req('/api/admin',{action:'revoke_share',id:share.id},admin.cookie);await req('/api/mahjong/public-report?id='+share.id,undefined,'',404);sql.close();console.log(JSON.stringify({result:'PASS',rounds:23,checks:'complete private/public pagination and administrator share revocation'}));
