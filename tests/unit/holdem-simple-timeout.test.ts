import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newHoldem,holdemRules,holdemSeat,startHoldem,moveHoldem,holdemActionPreview,holdemOptions,holdemView,setHoldemTimeoutChoice,timeoutHoldem,type HoldemGame} from '../../lib/holdem/engine.ts';
function game(){const g=newHoldem('p0','甲',{...holdemRules({capacity:4}),id:'holdem-v4'});g.seats=Array.from({length:4},(_,i)=>holdemSeat('p'+i,'玩家'+i,'1000'));g.seats.forEach(s=>s.ready=true);startHoldem(g);return g;}
function choose(g:HoldemGame,i:number,choice:unknown){const s=g.seats[i];setHoldemTimeoutChoice(g,s.id,choice,{round:g.round,street:g.street,bet:s.bet,stack:s.stack});}
function flop(){const g=game();while(g.street==='preflop'){const s=g.seats[g.turn],p=holdemOptions(g,s.id);moveHoldem(g,s.id,{action:p.check?'check':'call'});}return g;}
test('v4 accepts any integer above current call: 60 followed by 70 or 61, no multiples',()=>{
 for(const amount of ['70','61']){const g=flop();moveHoldem(g,'p1',{action:'raise',amount:'60'});assert.equal(holdemActionPreview(g,'p2')!.minRaise,'61');moveHoldem(g,'p2',{action:'raise',amount});assert.equal(g.seats[2].action?.paid,amount);}
 const g=flop();moveHoldem(g,'p1',{action:'raise',amount:'1'});assert.equal(g.currentBet,'1');
 g.turn=1;g.seats[1].actedAt='1';g.currentBet='2';assert.equal(holdemActionPreview(g,'p1')!.canRaise,true);
});
test('timeout executes selected call once, never on selection or before deadline; choice stays private',()=>{
 const g=game(),deadline=g.deadline;choose(g,3,{action:'call',maxCall:'20'});
 assert.equal(g.seats[3].stack,'990');assert(!JSON.stringify(holdemView(g,'p0')).includes('timeoutChoice'));
 assert.equal(timeoutHoldem(g,deadline-1),false);timeoutHoldem(g,deadline);
 assert.equal(g.seats[3].stack,'970');assert.equal(g.seats[3].timeoutChoice,undefined);
 assert.equal(timeoutHoldem(g,deadline),false);
});
test('timeout selected raise and all-in use exact payment, manual action cancels saved choice',()=>{
 for(const action of ['raise','allin']){const g=game();choose(g,3,{action,amount:'81'});timeoutHoldem(g,g.deadline);assert.equal(g.seats[3].action?.kind,action);assert.equal(g.seats[3].action?.paid,action==='raise'?'71':'990');}
 const g=game();choose(g,3,{action:'call',maxCall:'20'});moveHoldem(g,'p3',{action:'raise',amount:'40'});assert.equal(g.seats[3].timeoutChoice,undefined);
});
test('increased call, invalidated raise or check fall back without increasing the selected spend',()=>{
 for(const choice of [{action:'call',maxCall:'20'},{action:'raise',amount:'40'}]){const g=game();choose(g,0,choice);moveHoldem(g,'p3',{action:'raise',amount:'80'});timeoutHoldem(g,g.deadline);assert.equal(g.seats[0].folded,true);assert.equal(g.seats[0].stack,'990');}
 const g=flop();choose(g,2,{action:'check'});moveHoldem(g,'p1',{action:'raise',amount:'60'});timeoutHoldem(g,g.deadline);assert.equal(g.seats[2].folded,true);
});
test('cancel and lifecycle changes cannot reuse a previous choice; no selection checks when free',()=>{
 const g=game();choose(g,3,{action:'call',maxCall:'20'});choose(g,3,null);timeoutHoldem(g,g.deadline);assert.equal(g.seats[3].folded,true);
 const f=flop();timeoutHoldem(f,f.deadline);assert.equal(f.seats[1].action?.kind,'check');
 const h=game();choose(h,3,{action:'call',maxCall:'20'});h.seats[3].timeoutChoice!.round='old';timeoutHoldem(h,h.deadline);assert.equal(h.seats[3].folded,true);
 const k=game();assert.throws(()=>setHoldemTimeoutChoice(k,'p3',{action:'call',maxCall:'20'},{round:'old',street:k.street,bet:'10',stack:'990'}));
});

test('default rooms restore full raises and ante units while preserving saved v4 snapshots',()=>{
 const g=newHoldem('p0','甲',holdemRules({capacity:4}));g.seats=Array.from({length:4},(_,i)=>holdemSeat('p'+i,'玩家'+i,'1000'));g.seats.forEach(s=>s.ready=true);startHoldem(g);
 assert.equal(g.rules.id,'holdem-v3');assert.equal(holdemActionPreview(g,'p3')!.minRaise,'60');assert.equal(holdemActionPreview(g,'p3')!.betStep,'10');
 assert.throws(()=>moveHoldem(g,'p3',{action:'raise',amount:'40'}));assert.throws(()=>moveHoldem(g,'p3',{action:'raise',amount:'61'}));
 choose(g,3,{action:'raise',amount:'60'});timeoutHoldem(g,g.deadline);assert.equal(g.seats[3].bet,'60');
});
