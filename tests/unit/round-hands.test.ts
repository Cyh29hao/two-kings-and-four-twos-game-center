import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newModern,modernSeat,dealModern,timeoutModern,modernView} from '../../lib/mahjong/modern.ts';
import {newGame,deal,bid,play,hints,view} from '../../lib/game/engine.ts';
import {newHoldem,holdemRules,holdemSeat,startHoldem,moveHoldem,holdemOptions,holdemView} from '../../lib/holdem/engine.ts';

test('mahjong reveals every remaining hand only after the round finishes',()=>{
 const g=newModern('p0','玩家0');g.seats=[0,1,2,3].map(i=>modernSeat('p'+i,'玩家'+i,'1000'));dealModern(g,1);
 assert(modernView(g,'p0').seats.slice(1).every(s=>s.hand.length===0));
 for(let n=0;n<600&&g.phase!=='finished';n++)timeoutModern(g,g.deadline);
 assert.equal(g.phase,'finished');
 for(const player of g.seats)assert.deepEqual(modernView(g,player.id).seats.map(s=>s.hand),g.seats.map(s=>s.hand));
 dealModern(g,Date.now());assert(modernView(g,'p0').seats.slice(1).every(s=>s.hand.length===0),'next round must hide opponents again');
});
test('landlord shows remaining hands and the empty winning hand at settlement',()=>{
 const g=newGame('p0','玩家0');g.seats=[0,1,2].map(i=>({id:'p'+i,name:'玩家'+i,hand:[],ready:true,plays:0,last:''}));deal(g,1);bid(g,g.turn,3,2);
 assert(view(g,'p0').seats.slice(1).every(s=>s.hand.length===0));
 for(let n=0;n<600&&g.phase==='playing';n++)play(g,g.turn,hints(g.seats[g.turn].hand,g.last?.combo??null)[0]??[],n+3);
 assert.equal(g.phase,'finished');assert.equal(g.seats[g.winner].hand.length,0);
 for(const player of g.seats)assert.deepEqual(view(g,player.id).seats.map(s=>s.hand),g.seats.map(s=>s.hand));
});
test('holdem settlement preserves showdown hands while folded cards stay private',()=>{
 const g=newHoldem('p0','玩家0',{...holdemRules({capacity:4}),id:'holdem-v3'});g.seats=[0,1,2,3].map(i=>holdemSeat('p'+i,'玩家'+i,g.rules.initial));g.seats.forEach(s=>s.ready=true);startHoldem(g,1);
 assert(holdemView(g,'p0').seats.slice(1).every(s=>s.hand.length===0));
 const folded=g.seats[g.turn].id;moveHoldem(g,folded,{action:'fold'},2);
 for(let n=0;n<100&&g.phase==='playing';n++){const id=g.seats[g.turn].id;moveHoldem(g,id,{action:holdemOptions(g,id).check?'check':'call'},n+3);}
 assert.equal(g.phase,'finished');assert.equal(g.result?.type,'showdown');
 const result=holdemView(g,'p0');for(const s of g.seats)assert.deepEqual(result.seats.find(p=>p.id===s.id)!.hand,s.id==='p0'||!s.folded?s.hand:[]);
});
