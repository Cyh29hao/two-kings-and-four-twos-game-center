import test from 'node:test';
import assert from 'node:assert/strict';
import {emitVisual,publicVisuals,freshVisuals,DDZ_EFFECTS,type VisualFrame} from '../lib/motion/events.ts';
import {newGame,deal,bid,play,view,DEFAULT_LANDLORD_RULES} from '../lib/game/engine.ts';
import {newModern,modernSeat,dealModern,moveModern,timeoutModern,modernView} from '../lib/mahjong/modern.ts';
import {bestWinPlan} from '../lib/mahjong/solver.ts';
const cards=(ranks:number[])=>{const used=new Map<number,number>();return ranks.map(r=>{if(r>=16)return r===16?52:53;const n=used.get(r)||0;used.set(r,n+1);return(r-3)*4+n})};
const ddz=()=>{const g=newGame('a','A');g.seats.push({id:'b',name:'B',hand:[],ready:true,plays:0,last:''},{id:'c',name:'C',hand:[],ready:true,plays:0,last:''});deal(g,1);bid(g,g.turn,3,2);return g;};
test('confirmed special plays carry seat event ids; failed/repeated actions never emit',()=>{
 const hands=[[4,4,4,4],[16,17],[3,4,5,6,7],[3,3,4,4,5,5],[3,3,3,4,4,4],[3,3,3,4,4,4,7,7],[3,3,3,4,4,4,7,7,8,8],[3,3,3,3,7,7],[3,3,3,3,7,7,8,8]];
 for(const ranks of hands){const g=ddz(),seat=g.turn;g.seats[seat].hand=cards([...ranks,14]);const before=structuredClone(g);assert.throws(()=>play(g,seat,[0,0],10));assert.deepEqual(g,before);play(g,seat,cards(ranks),20);const event=g.visualEvents!.at(-1)!;assert.equal(event.type,DDZ_EFFECTS[g.last!.combo.kind]);assert.equal(event.seat,seat);assert.equal(event.at,20);const a=g.tableActions![seat];assert(a?.kind==='play');assert.equal(a.eventId,event.id);assert.deepEqual(view(g,'b').visualEvents,publicVisuals(g));assert.throws(()=>play(g,seat,cards(ranks),20));assert.equal(g.visualEvents!.length,1);}
});
test('winning special hand and both spring events survive settlement, then reset on dealing',()=>{
 for(const farmer of [false,true]){const g=ddz(),seat=farmer?(g.landlord+1)%3:g.landlord;g.turn=seat;g.seats[g.landlord].plays=farmer?1:0;g.seats[seat].hand=cards([3,3,3,3]);play(g,seat,g.seats[seat].hand,100);assert.equal(g.phase,'finished');assert.deepEqual(g.visualEvents!.map(e=>e.type),['bomb',farmer?'anti-spring':'spring']);assert(g.tableActions![seat]?.kind==='play');deal(g,200);assert.deepEqual(g.visualEvents,[]);}
 const g=ddz();g.rules={...DEFAULT_LANDLORD_RULES,allowDouble:false,bombDouble:false,springDouble:false};g.seats[g.turn].hand=cards([3,3,3,3]);play(g,g.turn,g.seats[g.turn].hand,100);assert.equal(g.multiplier,1);assert.deepEqual(g.visualEvents!.map(e=>e.type),['bomb']);
});
test('events bound history and whitelist privacy fields, including legacy empty states',()=>{
 const g={round:'r'};assert.deepEqual(publicVisuals(g),[]);for(let n=0;n<40;n++)emitVisual(g,n%4,'kong',n,'concealed');const events=publicVisuals(g);assert.equal(events.length,32);assert.equal(events[0].at,8);assert.equal(new Set(events.map(e=>e.id)).size,32);
 const dirty={...g,visualEvents:events.map(e=>({...e,tile:124,hand:[1,2],eligible:[2]}))};assert.deepEqual(publicVisuals(dirty),events);assert.deepEqual(publicVisuals({...dirty,round:'new'}),[]);
});
test('freshness ignores old, duplicate, reordered, switched, resumed and clock-skewed snapshots',()=>{
 const state={round:'r',phase:'playing'};const a:VisualFrame={code:'123',revision:1,serverNow:1000,receivedAt:5000,game:structuredClone(state)};
 emitVisual(state,1,'bomb',1800);const b:VisualFrame={...a,revision:2,serverNow:2000,receivedAt:6000,game:structuredClone(state)};
 assert.equal(freshVisuals(a,b).length,1);assert.deepEqual(freshVisuals(null,b),[]);assert.deepEqual(freshVisuals(b,b),[]);assert.deepEqual(freshVisuals(b,a),[]);
 for(const patch of [{code:'456'},{revision:0},{receivedAt:16001},{serverNow:5000},{serverNow:0},{game:{...state,round:'new'}},{game:{...state,phase:'closed'}}])assert.deepEqual(freshVisuals(a,{...b,...patch}),[]);
 assert.deepEqual(freshVisuals(b,{...b,revision:3}),[]);
});
test('ham hu emits once before choosing, never at confirmation, two reveals or settlement',()=>{
 const g=newModern('p0','A');g.seats=['A','B','C','D'].map((n,i)=>modernSeat('p'+i,n,'1000'));dealModern(g,100);g.wildcard=32;g.opening=false;
 const counts=Array(34).fill(0);g.seats[0].hand=[0,1,2,9,10,11,18,19,20,30,30,2,4,3].map(t=>4*t+counts[t]++);const rest=Array.from({length:136},(_,i)=>i).filter(t=>!g.seats[0].hand.includes(t));for(let i=1;i<4;i++)g.seats[i].hand=rest.splice(0,13);g.wall=rest;g.drawn=g.seats[0].hand.at(-1)!;
 moveModern(g,0,{action:'hu'},200);assert.equal(g.phase,'choosing');const events=structuredClone(g.visualEvents);assert.equal(events?.length,1);assert.equal(events[0].detail,'self');assert.equal(modernView(g,'p1').visualEvents[0].type,'hu');assert.deepEqual(modernView(g,'p1').seats[0].hand,[]);
 moveModern(g,0,{action:'confirm_win',candidateId:bestWinPlan(g.choice!)!.id},300);assert.equal(g.phase,'revealing');while(g.phase==='revealing')timeoutModern(g,g.deadline);assert.equal(g.phase,'finished');assert.deepEqual(g.visualEvents,events);assert.equal(g.entries.filter(e=>e.kind==='win').length,1);
});
