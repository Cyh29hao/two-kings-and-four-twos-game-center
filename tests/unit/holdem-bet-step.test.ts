import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newHoldem,holdemRules,holdemSeat,startHoldem,holdemActionPreview,moveHoldem,holdemBetStep} from '../../lib/holdem/engine.ts';
import {raiseDetails} from '../../lib/holdem/preselection.ts';
function game(){const g=newHoldem('p0','甲',{...holdemRules({capacity:4}),id:'holdem-v3'});g.seats=Array.from({length:4},(_,i)=>holdemSeat('p'+i,'玩家'+i,'1000'));g.seats.forEach(s=>s.ready=true);startHoldem(g);return g;}
test('new tables require ante multiples; rejected wagers leave the game untouched',()=>{
 const g=game(),id=g.seats[g.turn].id,before=structuredClone(g),p=holdemActionPreview(g,id)!;
 assert.equal(g.rules.id,'holdem-v3');assert.equal(p.betStep,'10');assert.equal(raiseDetails('81',p,'0').valid,false);
 assert.throws(()=>moveHoldem(g,id,{action:'raise',amount:'81'}),/10.*整数倍/);assert.deepEqual(g,before);
 moveHoldem(g,id,{action:'raise',amount:'90'});assert.equal(g.currentBet,'90');
});
test('round minimum up to the next ante multiple after an irregular all-in',()=>{
 const g=game();g.currentBet='85';g.lastRaise='55';g.seats[0].stack='135';
 assert.equal(holdemActionPreview(g,'p0')!.minRaise,'140');
 g.currentBet='87';assert.equal(holdemActionPreview(g,'p0')!.minRaise,'150');assert.equal(holdemActionPreview(g,'p0')!.canRaise,false);
});
test('short calls and explicit all-in retain exact remainder amounts',()=>{
 const g=game(),s=g.seats[g.turn];s.stack='97';moveHoldem(g,s.id,{action:'allin'});assert.equal(g.currentBet,'107');
 const next=g.seats[g.turn];moveHoldem(g,next.id,{action:'call'});assert.equal(next.bet,'107');
 const short=game(),p=short.seats[short.turn];p.stack='17';moveHoldem(short,p.id,{action:'call'});assert.equal(p.bet,'27');assert.equal(p.allIn,true);
});
test('saved v1 tables keep integer wagers and zero ante uses unit one',()=>{
 const old=game();old.rules.id='holdem-v1';assert.equal(holdemBetStep(old.rules),'1');moveHoldem(old,old.seats[old.turn].id,{action:'raise',amount:'81'});assert.equal(old.currentBet,'81');
 assert.equal(holdemBetStep(holdemRules({ante:'0'})),'1');
});
test('multiples stay exact beyond number precision',()=>{
 const g=game(),p={...holdemActionPreview(g,'p0')!,minRaise:'60',maxRaise:'99999999999999999999'};
 assert.equal(raiseDetails('9007199254741000',p,'20').valid,true);assert.equal(raiseDetails('9007199254741001',p,'20').valid,false);
});
