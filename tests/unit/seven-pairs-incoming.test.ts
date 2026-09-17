import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HAM,HAM_V6,hamRulePreset,type ModernRules} from '../../lib/mahjong/rules.ts';
import {winPlans,winPlanPage,findWinPlan,canWin,type WinContext} from '../../lib/mahjong/solver.ts';
import {newModern,modernSeat,modernOptions,moveModern,timeoutModern,type ModernGame} from '../../lib/mahjong/modern.ts';
const physical=(types:number[])=>{const copies=Array(34).fill(0);return types.map(t=>{assert(copies[t]<4);return t*4+copies[t]++;});};
function context(types:number[],patch:Partial<WinContext>={}):WinContext{const hand=physical(types);return {round:'seven-pairs',hand,melds:[],wildcard:-1,incoming:hand.at(-1)!,winType:'self',flower:false,heaven:false,earth:false,sevenPairsSuitedFourPlus:true,...patch};}
const seven=(c:WinContext)=>winPlans(c).filter(p=>p.family==='seven');
const pairHand=(target:number)=>[0,9,18,27,28,31,30].filter(t=>t!==target).slice(0,6).flatMap(t=>[t,t]).concat(target,target);

test('seven pairs restricts only the incoming tile, all 34 identities and all win sources',()=>{
 for(let target=0;target<34;target++)for(const winType of ['self','discard','rob'] as const){
  const c=context(pairHand(target),{winType}),allowed=target<27&&target%9>=3;
  assert.equal(seven(c).length>0,allowed,`${target} ${winType}`);
  assert.equal(canWin(c),allowed,`no unrelated shape in fixture ${target}`);
  assert(seven({...c,sevenPairsSuitedFourPlus:undefined}).length>0,'old contexts retain all incoming identities');
 }
});
test('all luxury pair levels use the same incoming restriction without restricting the other pairs',()=>{
 const bases=[[27,27,27,27,0,0,9,9,18,18,28,28],[27,27,27,27,28,28,28,28,0,0,9,9],[27,27,27,27,28,28,28,28,31,31,31,31]];
 for(const [i,base] of bases.entries())for(const target of [2,3,8,12,17,21,26,30]){
  const c=context([...base,target,target]),plans=seven(c),allowed=target<27&&target%9>=3;
  assert.equal(plans.length>0,allowed);assert(plans.every(p=>p.fans.some(f=>f.id===`luxury${i+1}`)));
  const old=seven({...c,sevenPairsSuitedFourPlus:undefined});assert(old.length);
  if(!allowed){assert.equal(winPlanPage(c,{fan:'seven'}).total,0);for(const p of old)assert.equal(findWinPlan(c,p.id),undefined);}
 }
});
test('incoming wildcard and converted white use the chosen identity; heaven cannot bypass the seven-pair restriction',()=>{
 for(const target of [2,3,8,12,26,27]){
  const base=pairHand(target).slice(0,-1),c=context([...base,32],{wildcard:32}),allowed=target<27&&target%9>=3;
  assert.equal(seven(c).length>0,allowed);assert(seven(c).every(p=>p.incomingType===target));
 }
 for(const wildcard of [2,3,8,12,26,32]){
  const c=context([...pairHand(33)],{wildcard});assert.equal(seven(c).length>0,wildcard<27&&wildcard%9>=3);
 }
 assert.equal(seven(context(pairHand(2),{heaven:true})).length,0);
});
function game(target:number,rules:ModernRules=HAM):ModernGame{
 const g=newModern('p0','玩家0',30,rules);g.seats=[0,1,2,3].map(i=>modernSeat('p'+i,'玩家'+i,'1000'));
 const hand=physical(pairHand(target));g.seats[0].hand=hand;g.phase='playing';g.round='seven-engine';g.roundNumber=1;g.wildcard=32;g.drawn=hand.at(-1)!;g.turn=0;g.opening=false;g.discardCount=4;g.deadline=1000;g.roundStart=g.seats.map(s=>s.balance);
 const used=new Set(hand);g.wall=Array.from({length:136},(_,i)=>i).filter(t=>!used.has(t));return g;
}
test('new room options and saved win choices enforce v7 while v6 snapshots finish unchanged',()=>{
 assert.equal(newModern('a','甲').rules.id,'ham-v7');assert.equal(hamRulePreset('ham-v6'),HAM_V6);
 const denied=game(2);assert.equal(modernOptions(denied,0).canHu,false);assert.throws(()=>moveModern(denied,0,{action:'hu'}));
 const allowed=game(3);assert(modernOptions(allowed,0).canHu);moveModern(allowed,0,{action:'hu'});assert.equal(allowed.choice!.sevenPairsSuitedFourPlus,true);
 const restored=JSON.parse(JSON.stringify(allowed)) as ModernGame;assert(seven(restored.choice!).length>0);
 const old=game(2,HAM_V6);assert(modernOptions(old,0).canHu);moveModern(old,0,{action:'hu'});assert.equal(old.choice!.sevenPairsSuitedFourPlus,undefined);
 const saved=JSON.parse(JSON.stringify(old)) as ModernGame;for(let i=0;i<4&&saved.phase!=='finished';i++)timeoutModern(saved,saved.deadline);
 assert.equal(saved.phase,'finished');assert.equal(saved.rules.id,'ham-v6');assert.equal(saved.result!.plan!.family,'seven');assert.equal(saved.deltas.reduce((n,d)=>n+BigInt(d),0n),0n);
});


test('discard-response options use the same v7 restriction and snapshot it on a successful claim',()=>{
 for(const target of [2,3,8,30]){
  const g=game(target),incoming=g.seats[0].hand.at(-1)!;g.seats[1].hand=g.seats[0].hand.slice(0,-1);g.seats[0].hand=[incoming,...g.wall.splice(0,13)];g.drawn=g.seats[0].hand.at(-1)!;
  moveModern(g,0,{action:'discard',tile:incoming});const claim=modernOptions(g,1).claims.find(c=>c.kind==='hu');
  assert.equal(!!claim,target===3||target===8);
  if(claim){moveModern(g,1,{action:'claim',key:claim.key});assert.equal(g.phase,'choosing');assert.equal(g.choice!.sevenPairsSuitedFourPlus,true);assert.equal(g.choice!.winType,'discard');}
  else assert.throws(()=>moveModern(g,1,{action:'claim',key:'hu:'}));
 }
});
