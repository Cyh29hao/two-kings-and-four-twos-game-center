import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newHoldem,holdemRules,holdemSeat,startHoldem,holdemActionPreview,holdemOptions,holdemView,moveHoldem} from '../../lib/holdem/engine.ts';
import {newDraft,reconcileDraft,selectAction,raiseDetails,paymentDetails,canSubmitAction,type PreselectionContext,type BettingAction} from '../../lib/holdem/preselection.ts';
function game(){const g=newHoldem('p0','甲',{...holdemRules({capacity:4}),id:'holdem-v3'});g.seats=Array.from({length:4},(_,i)=>holdemSeat('p'+i,'玩家'+i,'1000'));g.seats.forEach(s=>s.ready=true);startHoldem(g);return g;}
function context():PreselectionContext{return {scope:'room:account:hand:preflop:connection',ownAction:'10:990:',eligible:true,acting:false,preview:holdemActionPreview(game(),'p0')};}
test('waiting preview and acting options share exact wager calculation without granting a turn or exposing cards',()=>{
 const g=game(),before=structuredClone(g),v=holdemView(g,'p0'),p=v.actionPreview!;
 assert.equal(p.call,'20');assert.equal(p.minRaise,'60');assert.equal(v.options.acting,false);
 assert.throws(()=>moveHoldem(g,'p0',{action:'call'}));assert.deepEqual(g,before);
 assert(v.seats.slice(1).every(s=>s.hand.length===0));assert(!('deck'in v));assert(!('burns'in v));
 g.turn=0;const {raiseReason,allInReason,betStep,...preview}=p;assert.deepEqual(holdemOptions(g,'p0'),{acting:true,...preview});
 assert.equal(holdemActionPreview(g,'outsider'),null);
 g.seats[0].folded=true;assert.equal(holdemActionPreview(g,'p0'),null);g.seats[0].folded=false;g.seats[0].allIn=true;assert.equal(holdemActionPreview(g,'p0'),null);
 g.seats[0].allIn=false;g.phase='finished';assert.equal(holdemActionPreview(g,'p0'),null);
});
test('preview caps a short call and preserves all-in and raise-right restrictions',()=>{
 const g=game();g.seats[0].stack='15';assert.equal(holdemActionPreview(g,'p0')!.call,'15');assert.equal(holdemActionPreview(g,'p0')!.canAllIn,true);assert.equal(holdemActionPreview(g,'p0')!.canRaise,false);
 g.seats[0].stack='990';g.currentBet='150';g.lastRaise='100';g.seats[0].actedAt='100';
 const p=holdemActionPreview(g,'p0')!;assert.equal(p.canRaise,false);assert.equal(p.canAllIn,false);assert.match(p.allInReason,/加注权/);
 g.currentBet='200';assert.equal(holdemActionPreview(g,'p0')!.canRaise,true);
 g.seats.slice(1).forEach(s=>s.allIn=true);assert.match(holdemActionPreview(g,'p0')!.raiseReason,/对手/);
});
test('every waiting action is local, toggles off, and becomes submittable only after a deliberate turn-time click',()=>{
 const c=context();for(const action of ['fold','call','allin','raise'] as BettingAction[]){
  const d=selectAction({...newDraft(c),raise:'60'},action,c.preview!);assert.equal(d.selected?.action,action);
  assert.equal(canSubmitAction(action,c,d.raise,'0'),false);
  assert.equal(reconcileDraft(d,{...c,acting:true}),d,'turn changing alone must not reset or consume selection');
  assert.equal(canSubmitAction(action,{...c,acting:true},d.raise,'0'),true);
  assert.equal(selectAction(d,action,c.preview!).selected,null);
 }
});
test('opponent raises preserve explicit input and follow-call intent; never raise the draft automatically',()=>{
 const c=context();let d=selectAction({...newDraft(c),raise:'75'},'call',c.preview!);
 const updated={...c,preview:{...c.preview!,call:'100',minRaise:'170'}};
 assert.equal(reconcileDraft(d,updated),d);assert.equal(d.selected!.callAtSelection,'20');assert.equal(d.raise,'75');
 assert.equal(raiseDetails(d.raise,updated.preview!,'0').valid,false);assert.match(raiseDetails(d.raise,updated.preview!,'0').error,/170/);
 assert.equal(canSubmitAction('raise',{...updated,acting:true},d.raise,'0'),false);
 d=selectAction(d,'raise',updated.preview!);assert.equal(reconcileDraft(d,updated).raise,'75');
});
test('free check never turns into a paid call, and a call no longer owed is cleared',()=>{
 const c=context(),free={...c,preview:{...c.preview!,check:true,call:'0'}};
 const checked=selectAction(newDraft(free),'check',free.preview);
 assert.equal(reconcileDraft(checked,c).selected,null);assert.match(reconcileDraft(checked,c).notice,/取消过牌/);
 assert.equal(canSubmitAction('check',{...c,acting:true},'60','0'),false);
 const called=selectAction(newDraft(c),'call',c.preview!);assert.equal(reconcileDraft(called,free).selected,null);
});
test('account, room, hand, street, reconnect, action and eligibility boundaries clear the entire intention',()=>{
 const c=context(),d=selectAction({...newDraft(c),raise:'234'},'allin',c.preview!);
 for(const scope of ['new-room','new-account','new-hand','flop','reconnect','conflict'])assert.equal(reconcileDraft(d,{...c,scope}).selected,null);
 assert.equal(reconcileDraft(d,{...c,ownAction:'30:960:跟注'}).selected,null);
 const inactive={...c,eligible:false},empty=reconcileDraft(d,inactive);assert.equal(empty.raise,'');assert.equal(empty.selected,null);
 assert.equal(reconcileDraft(empty,inactive),empty,'inactive rerenders must stabilize');
 assert.equal(reconcileDraft(empty,c).raise,'20');assert.equal(newDraft(c).selected,null,'page reload starts with no selection');
 assert.equal(reconcileDraft(d,{...c,preview:{...c.preview!,canAllIn:false,allInReason:'加注权未开放'}}).selected,null);
});
test('raise total, extra payment and validation stay exact above Number precision',()=>{
 const p={...context().preview!,betStep:'1',minRaise:'9007199254740995',maxRaise:'9999999999999999'};
 assert.deepEqual(raiseDetails('9007199254740997',p,'9007199254740990'),{valid:true,extra:'7',error:''});
 for(const value of ['','-1','1.2','1e4','Infinity','01','9'.repeat(101)])assert.equal(raiseDetails(value,p,'0').valid,false);
 assert.equal(raiseDetails('10000000000000000',p,'0').valid,false);
 assert.equal(canSubmitAction('allin',{...context(),eligible:false,acting:true},'60','0'),false);
});

test('waiting preview does not change either real actions or bot decisions through the options gate',()=>{
 const g=game();
 const snapshot=JSON.stringify(g);
 for(let i=0;i<4;i++)holdemActionPreview(g,'p'+i);
 assert.equal(JSON.stringify(g),snapshot);
});

test('payment editor shows and submits exactly the additional chips, including prior ante',()=>{
 const g=game(),p=holdemActionPreview(g,'p0')!;
 const c={...context(),alreadyBet:'10'};
 assert.equal(newDraft(c).raise,'20');
 const details=paymentDetails('80',p,'10','990');
 assert.deepEqual(details,{valid:true,extra:'80',target:'90',remaining:'910',error:''});
 g.turn=0;moveHoldem(g,'p0',{action:'raise',amount:details.target});
 assert.equal(g.seats[0].stack,'910');assert.equal(g.seats[0].total,'90');
 const changed={...p,minRaise:'120'};
 assert.match(paymentDetails('80',changed,'10','990').error,/110/);
 assert.equal(paymentDetails('',p,'10','990').valid,false);
 assert.equal(paymentDetails('1000',p,'10','990').remaining,null);
 const large={...p,betStep:'1',minRaise:'9007199254740995',maxRaise:'9999999999999999'};
 assert.equal(paymentDetails('7',large,'9007199254740990','100').target,'9007199254740997');
});
