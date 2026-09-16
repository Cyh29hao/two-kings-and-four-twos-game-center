import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newHoldem,holdemRules,holdemSeat,startHoldem,holdemOptions,holdemView,moveHoldem,closeHoldem,type HoldemRules} from '../../lib/holdem/engine.ts';
function game(id:HoldemRules['id']='holdem-v3'){
 const rules={...holdemRules({capacity:4}),id},g=newHoldem('p0','甲',rules);
 g.seats=Array.from({length:4},(_,i)=>holdemSeat('p'+i,'玩家'+i,'1000'));g.seats.forEach(s=>s.ready=true);startHoldem(g);return g;
}
test('v3 ante is live: call to 30 costs exactly 30 total including entry 10',()=>{
 const g=game();assert.deepEqual(g.seats.map(s=>s.bet),['10','20','30','10']);assert.deepEqual(g.seats.map(s=>s.total),['10','20','30','10']);
 assert.equal(holdemOptions(g,'p3').call,'20');moveHoldem(g,'p3',{action:'call'});
 assert.equal(g.seats[3].stack,'970');assert.equal(g.seats[3].total,'30');assert.equal(g.seats[3].action?.paid,'20');
 const v=holdemView(g,'p0');assert.equal(v.seats[3].total,'30');assert.equal(v.seats[3].action?.kind,'call');assert.equal(v.seats[3].hand.length,0);
});
test('street bet resets while cumulative investment and exact conservation remain',()=>{
 const g=game();while(g.street==='preflop'){const s=g.seats[g.turn],o=holdemOptions(g,s.id);moveHoldem(g,s.id,{action:o.check?'check':'call'});}
 assert(g.seats.every(s=>s.bet==='0'&&s.total==='30'&&s.stack==='970'));assert.equal(holdemView(g,'p0').pot,'120');
 moveHoldem(g,'p1',{action:'raise',amount:'60'});assert.equal(g.seats[1].total,'90');assert.equal(g.seats[1].action?.kind,'raise');
 assert.equal(g.seats.reduce((sum,s)=>sum+BigInt(s.stack)+BigInt(s.total),0n),4000n);
 closeHoldem(g,true);assert(g.seats.every(s=>s.stack==='1000'));
});
test('v1 and v2 stored rooms still pay ante in addition to a call to 30',()=>{
 for(const id of ['holdem-v1','holdem-v2'] as const){const g=game(id);assert.equal(holdemOptions(g,'p3').call,'30');moveHoldem(g,'p3',{action:'call'});assert.equal(g.seats[3].total,'40');assert.equal(g.seats[3].stack,'960');}
});
test('structured action changes cover check, raise, call, all-in and fold without log parsing',()=>{
 const g=game();moveHoldem(g,'p3',{action:'raise',amount:'60'});const a=g.seats[3].action!;assert.equal(a.kind,'raise');assert.equal(a.paid,'50');
 moveHoldem(g,'p0',{action:'call'});assert.equal(g.seats[0].action?.kind,'call');
 moveHoldem(g,'p1',{action:'fold'});assert.equal(g.seats[1].action?.kind,'fold');assert.equal(g.seats[1].total,'20');
 moveHoldem(g,'p2',{action:'allin'});assert.equal(g.seats[2].action?.kind,'allin');assert.notEqual(g.seats[2].action?.id,a.id);
 const free=game();while(free.street==='preflop'){const s=free.seats[free.turn],o=holdemOptions(free,s.id);moveHoldem(free,s.id,{action:o.check?'check':'call'});}
 moveHoldem(free,'p1',{action:'check'});assert.equal(free.seats[1].action?.kind,'check');assert.equal(free.seats[1].action?.paid,'0');
});
test('short entry stacks never produce negative payments and new ante must fit small blind',()=>{
 assert.throws(()=>holdemRules({ante:'25',small:'20'}),/前注/);
 const g=game();g.phase='finished';g.seats[0].stack='5';g.seats.forEach(s=>s.ready=true);startHoldem(g);assert.equal(g.seats[0].bet,'5');assert.equal(g.seats[0].stack,'0');assert.equal(g.seats[0].allIn,true);
});
