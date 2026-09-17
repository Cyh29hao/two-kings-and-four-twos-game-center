import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newHoldem,holdemRules,holdemSeat,startHoldem,moveHoldem,holdemOptions,holdemView,closeHoldem,type HoldemRules} from '../../lib/holdem/engine.ts';
function game(id:HoldemRules['id']='holdem-v5'){
 const g=newHoldem('p0','玩家0',{...holdemRules({capacity:4}),id});
 g.seats=[0,1,2,3].map(i=>holdemSeat('p'+i,'玩家'+i,'1000'));g.seats.forEach(s=>s.ready=true);startHoldem(g,1);return g;
}
function checkCall(g:ReturnType<typeof game>){const id=g.seats[g.turn].id;moveHoldem(g,id,{action:holdemOptions(g,id).check?'check':'call'},2);}
function allVisible(g:ReturnType<typeof game>){
 assert.equal(g.phase,'finished');assert(g.result!.seats.every((s,i)=>JSON.stringify(s.hand)===JSON.stringify(g.seats[i].hand)));
 for(const viewer of g.seats)assert.deepEqual(holdemView(g,viewer.id).seats.map(s=>s.hand),g.seats.map(s=>s.hand));
 assert.equal(g.seats.reduce((a,s)=>a+BigInt(s.stack),0n),4000n);
 assert.equal(g.result!.seats.reduce((a,s)=>a+BigInt(s.delta),0n),0n);
 for(const pot of g.result!.pots.filter(p=>!p.refund))assert(pot.winners.every(i=>!g.seats[i].folded));
}
test('v5 reveals every hand after fold wins on preflop, flop, turn and river, never before settlement',()=>{
 for(const street of ['preflop','flop','turn','river']){
  const g=game();while(g.street!==street)checkCall(g);
  for(let i=0;i<2;i++)moveHoldem(g,g.seats[g.turn].id,{action:'fold'},3);
  const before=holdemView(g,'p0');assert(before.seats.filter(s=>s.id!=='p0').every(s=>s.hand.length===0));
  moveHoldem(g,g.seats[g.turn].id,{action:'fold'},4);allVisible(g);
  assert.equal(g.result!.type,'fold');assert(g.result!.seats.every(s=>street==='preflop'?s.value===null:s.value!==null));
  const board=[...g.board];closeHoldem(g);assert.deepEqual(g.board,board);assert(holdemView(g,'p0').seats.every(s=>s.hand.length===2));
 }
});
test('v5 folded hands are evaluated for display but cannot win pots; next hand hides all opponents again',()=>{
 const g=game();moveHoldem(g,g.seats[g.turn].id,{action:'fold'},2);
 while(g.phase==='playing')checkCall(g);allVisible(g);assert.equal(g.result!.type,'showdown');
 assert(g.result!.seats.every(s=>s.value?.cards.length===5));
 g.seats.forEach(s=>s.ready=true);startHoldem(g,5);
 assert.equal(g.result,null);assert(holdemView(g,'p0').seats.slice(1).every(s=>s.hand.length===0));
});
test('v1 through v4 preserve fold-win privacy and v5 aborts do not reveal opponents',()=>{
 for(const id of ['holdem-v1','holdem-v2','holdem-v3','holdem-v4'] as const){
  const g=game(id);while(g.phase==='playing')moveHoldem(g,g.seats[g.turn].id,{action:'fold'},3);
  assert(g.result!.seats.every(s=>s.hand.length===0&&s.value===null));
  assert(holdemView(g,'p0').seats.slice(1).every(s=>s.hand.length===0));
 }
 const g=game();closeHoldem(g,true);assert(g.result!.seats.every(s=>s.hand.length===0));
 assert(holdemView(g,'p0').seats.slice(1).every(s=>s.hand.length===0));
});
