// Explicitly local synthetic-room UI fixture and confirmed-action integration checks.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {newGame,deal} from '../lib/game/engine.ts';
import {newModern,modernSeat,dealModern} from '../lib/mahjong/modern.ts';
const fixture=JSON.parse(readFileSync('work/emotes-ui-fixture.json','utf8'));assert(fixture.database.startsWith('.wrangler/'));
const db=new DatabaseSync(fixture.database);db.exec('PRAGMA busy_timeout=5000');
const origin='http://localhost:5173';
async function api(group:any,actor:number,body?:any){const r=await fetch(origin+group.path+(body?'':'?room='+group.code),{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json',cookie:group.clients[actor].cookie},...(body?{body:JSON.stringify({code:group.code,...body})}:{})});const d:any=await r.json();return{status:r.status,data:d};}
const mode=process.argv[2]??'seed';
function save(group:any,g:any){db.prepare('UPDATE rooms SET state=?,phase=?,revision=revision+1,op=?,updated=? WHERE code=?').run(JSON.stringify(g),g.phase,crypto.randomUUID(),Date.now(),group.code);}
if(mode==='seed'){
 const d=fixture.groups[0],g=newGame(d.clients[0].id,'表情验收');g.seats=d.clients.map((c:any,i:number)=>({id:c.id,name:i?'朋友'+i:'表情验收',hand:[],ready:false,plays:0,last:''}));deal(g);g.phase='playing';g.turn=1;g.landlord=0;g.bid=3;g.deadline=Date.now()+3600000;g.rules={id:'landlord-v2',allowDouble:false,bombDouble:true,springDouble:true};
 g.seats[1].hand=[0,1,2,3,...Array.from({length:13},(_,i)=>24+i)];const rest=Array.from({length:54},(_,i)=>i).filter(c=>!g.seats[1].hand.includes(c));g.seats[0].hand=rest.splice(0,20);g.seats[2].hand=rest;g.bottom=g.seats[0].hand.slice(-3);save(d,g);
 const m=fixture.groups[1],h=newModern(m.clients[0].id,'表情验收');h.seats=m.clients.map((c:any,i:number)=>modernSeat(c.id,i?'朋友'+i:'表情验收','1000'));dealModern(h);h.opening=false;h.wildcard=32;h.deadline=Date.now()+3600000;const counts=Array(34).fill(0);h.seats[0].hand=[0,1,2,9,10,11,18,19,20,30,30,2,4,3].map(t=>t*4+counts[t]++);const tiles=Array.from({length:136},(_,i)=>i).filter(t=>!h.seats[0].hand.includes(t));for(let i=1;i<4;i++)h.seats[i].hand=tiles.splice(0,13);h.wall=tiles;h.drawn=h.seats[0].hand.at(-1)!;save(m,h);
 console.log('Seeded DDZ bomb and ham legal self-draw, only in synthetic local rooms.');
}else if(mode==='bomb'){
 const group=fixture.groups[0],before=(await api(group,1)).data,payload={action:'play',cards:[0,1,2,3],revision:before.revision};const races=await Promise.all([api(group,1,payload),api(group,1,payload)]);assert.equal(races.filter(r=>r.status===200).length,1);const after=(await api(group,0)).data;assert.equal(after.game.visualEvents.filter((e:any)=>e.type==='bomb').length,1);assert.equal(after.game.visualEvents[0].seat,1);assert(after.game.seats[1].hand.length===0);assert.equal(after.game.tableActions[1].eventId,after.game.visualEvents[0].id);console.log('PASS: concurrent bomb requests commit exactly one seat event, no hand disclosure');
}else if(mode==='hu'){
 const group=fixture.groups[1],before=(await api(group,0)).data;const r=await api(group,0,{action:'hu',revision:before.revision});assert.equal(r.status,200);assert.equal(r.data.game.phase,'choosing');const v=(await api(group,2)).data;assert.equal(v.game.visualEvents.filter((e:any)=>e.type==='hu').length,1);assert.equal(v.game.visualEvents[0].detail,'self');assert.equal(v.game.seats[0].hand.length,0);assert(!('wall'in v.game));console.log('PASS: ham announces one confirmed hu before hidden scheme/prizes');
}else if(mode==='emotes'){
 const group=fixture.groups[Number(process.argv[3]??0)],ids=['royale-v2-king-laugh','royale-v2-skeleton-cry','royale-v2-princess-yawn'];await Promise.all(group.clients.slice(1).map(async(c:any,i:number)=>{const r=await fetch(origin+'/api/chat',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',cookie:c.cookie},body:JSON.stringify({code:group.code,kind:'emote',emoteId:ids[i%ids.length],clientId:crypto.randomUUID()})});assert.equal(r.status,200,await r.text());}));console.log('Sent new emotes from '+(group.clients.length-1)+' distinct local players.');
}else throw Error('Unknown fixture action');
db.close();
