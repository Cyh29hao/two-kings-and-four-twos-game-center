import test from 'node:test';
import assert from 'node:assert/strict';
import {HAM,HAM_V3,BASIC_CHIPS} from '../lib/mahjong/rules.ts';
import {winPlans,canWin,winPlanPage,findWinPlan,bestWinPlan,visitWinPlans,isWild,effectiveType,type WinContext} from '../lib/mahjong/solver.ts';
import {newModern,modernSeat,dealModern,modernOptions,moveModern,timeoutModern,modernView,closeModern,type ModernGame} from '../lib/mahjong/modern.ts';
import {mahjongDecision} from '../lib/practice/mahjong.ts';
import {roundReport} from '../lib/mahjong/report.ts';
const physical=(types:number[])=>{const n=Array(34).fill(0);return types.map(t=>t*4+n[t]++);};
function finishAwards(g:ModernGame){while(g.phase==='revealing')timeoutModern(g,g.deadline);}
const normal=[0,1,2,9,10,11,18,19,20,30,30,2,4,3];
function context(types:number[],patch:Partial<WinContext>={}):WinContext{const hand=physical(types);return {round:'v4-test',hand,melds:[],wildcard:32,incoming:hand.at(-1)!,winType:'self',flower:false,heaven:false,earth:false,selfDrawUnit:2,noWildBonus:false,closedBonus:false,...patch};}
function game(types:number[],patch:Partial<ModernGame>={}){const g=newModern('p0','A');g.seats=['A','B','C','D'].map((n,i)=>modernSeat('p'+i,n,'1000'));dealModern(g);g.wildcard=32;g.opening=false;g.seats[0].hand=physical(types);const rest=Array.from({length:136},(_,i)=>i).filter(t=>!g.seats[0].hand.includes(t));for(let i=1;i<4;i++)g.seats[i].hand=rest.splice(0,13);g.wall=rest;g.drawn=g.seats[0].hand.at(-1)!;return Object.assign(g,patch);}
test('ham-v4 removes closed factor only, preserving each plan and old v3 snapshots',()=>{
 for(const ts of [normal,[0,0,1,1,9,9,10,10,18,18,27,27,28,28],[0,1,2,9,10,11,18,19,20,27,27,32,32,4]])for(const winType of ['self','discard','rob'] as const){const ctx=context(ts,{winType}),old=winPlans({...ctx,closedBonus:undefined}),next=winPlans(ctx);assert.equal(next.length,old.length);for(const p of old){const n=next.find(x=>x.id===p.id)!;assert(n);assert.deepEqual(n.groups,p.groups);assert.deepEqual(n.assignments,p.assignments);assert.deepEqual(n.hitTypes,p.hitTypes);assert.equal(BigInt(n.multiplier),BigInt(p.multiplier)/(p.fans.some(f=>f.id==='closed')?2n:1n));assert(!n.fans.some(f=>f.id==='closed'));}}
 const old=game(normal,{rules:structuredClone(HAM_V3)}),g=game(normal);moveModern(old,0,{action:'hu'});moveModern(g,0,{action:'hu'});assert.equal(g.choice!.closedBonus,false);assert.equal(old.choice!.closedBonus,undefined);const saved=JSON.parse(JSON.stringify(old)) as ModernGame;timeoutModern(saved,saved.deadline);timeoutModern(g,g.deadline);finishAwards(g);assert.equal(saved.result!.plan!.multiplier,'4');assert.equal(g.result!.plan!.multiplier,'2');assert(!roundReport('新桌',g.result!).rounds[0].fans.some(f=>f.id==='closed'));assert(roundReport('旧桌',saved.result!).rounds[0].fans.some(f=>f.id==='closed'));
});
test('wild discards are rejected without state changes; converted white remains playable',()=>{
 const g=game([...normal.slice(0,-2),33,32]),wild=g.drawn!,before=structuredClone(g),o=modernOptions(g,0);assert(!o.discardable.includes(wild));assert(o.discardable.includes(132));assert.throws(()=>moveModern(g,0,{action:'discard',tile:wild}),/赖子不能打出/);assert.deepEqual(g,before);
 moveModern(g,0,{action:'discard',tile:132});assert(!g.seats[0].hand.includes(132));assert(g.seats[0].hand.includes(wild));
 for(const rules of [HAM_V3,BASIC_CHIPS]){const old=game([...normal.slice(0,-1),32],{rules});assert(modernOptions(old,0).discardable.includes(old.drawn!));moveModern(old,0,{action:'discard',tile:old.drawn!});}
});
test('timeout and robots select only legal non-wildcards when drawn tile is wild',()=>{
 const g=game([...normal.slice(0,-1),32]),wild=g.drawn!,last=modernOptions(g,0).discardable.at(-1)!;
 const v=modernView(g,'p0'),me=v.seats[0],decision=mahjongDecision({hand:me.hand,melds:me.melds,wildcard:v.wildcard,remaining:v.remaining,visible:v.seats.flatMap(s=>[...s.hand,...s.river,...s.melds.flatMap(m=>m.tiles)]),river:[],options:{...v.options,canHu:false,kongs:[]},pending:null});assert.equal(decision.action,'discard');assert(!isWild(decision.tile!,g.wildcard));
 timeoutModern(g,g.deadline);assert(g.seats[0].hand.includes(wild));assert(!g.seats[0].hand.includes(last));
});
const scattered=[0,2,5,8,10,13,17,20,24,28,32,32,32,32];
test('four wilds waive structure only in enabled self-draw context, after taking the turn draw',()=>{
 const c=context(scattered,{fourWildWin:true});assert(canWin(c));assert(!canWin({...c,fourWildWin:undefined}));assert(!canWin({...c,winType:'discard'}));assert(!canWin({...c,winType:'rob'}));assert(!canWin({...c,hand:c.hand.slice(0,-1)}));
 const g=game(scattered);assert(modernOptions(g,0).fourWildHu);assert(!modernOptions(g,1).canHu);const before=structuredClone(g);assert.throws(()=>moveModern(g,1,{action:'hu'}));assert.deepEqual(g,before);
 // A nondealer with thirteen tiles (including four wilds) must wait for a real draw.
 const thirteen=game(scattered);thirteen.seats[0].hand=thirteen.seats[0].hand.filter(t=>t!==0);thirteen.drawn=null;assert(!modernOptions(thirteen,0).canHu);
 const initial=game(scattered,{opening:true,discardCount:0});moveModern(initial,0,{action:'hu'});assert.equal(initial.phase,'choosing');assert(!bestWinPlan(initial.choice!)!.fans.some(f=>f.id==='heaven'),'unstructured opening is not heaven');
});
test('all 66035 loose assignments are paginated once, cap four copies and preserve target filters',()=>{
 const c=context(scattered,{fourWildWin:true}),first=winPlanPage(c),ids=new Set<string>();
 // 34 types choose 4 with repetition = C(37,4); ten natural singleton types
 // prohibit their all-four-wild assignment, giving 66045 - 10.
 assert.equal(first.allTotal,66035);assert.equal(first.total,66035);
 for(let page=0;page<Math.ceil(first.total/12);page++)for(const p of winPlanPage(c,{page}).plans){assert(!ids.has(p.id));ids.add(p.id);assert.equal(p.family,'fourWild');assert.equal(p.multiplier,'8');assert.equal(p.assignments.length,4);const counts=Array(34).fill(0);for(const t of p.groups.flatMap(g=>g.types))counts[t]++;assert(counts.every(n=>n<=4));assert.deepEqual(p.fans.map(f=>f.id),['fourWild','selfDraw']);}
 assert.equal(ids.size,first.total);assert.equal(winPlanPage(c,{page:999999}).page,Math.ceil(first.total/12)-1);assert.equal(winPlanPage(c,{fan:'seven'}).total,0);assert.equal(winPlanPage(c,{target:'34'}).total,0);
 for(const target of ['0','32','33']){const r=winPlanPage(c,{target});assert(r.total>0);assert(r.plans.every(p=>p.assignments.some(a=>String(a.type)===target)));}
 const white=winPlanPage(c,{target:'33',wild:String(c.hand.at(-1))});assert(white.total>0);assert(white.plans.every(p=>p.assignments.some(a=>a.tile===c.incoming&&a.type===33)));
 assert(!findWinPlan(c,'forged'));assert(!findWinPlan({...c,round:'different'},first.plans[0].id));assert.deepEqual(findWinPlan(c,first.plans[0].id),first.plans[0]);
});
test('four-wild composition factors and structured factors belong only to their own complete interpretation',()=>{
 const c=context([0,0,0,1,2,3,4,5,6,8,32,32,32,32],{fourWildWin:true,heaven:true});
 const pure=winPlanPage(c,{fan:'pure'});assert(pure.total>0);assert(pure.plans.every(p=>p.fans.some(f=>f.id==='fourWild')));
 const loose=winPlanPage(c,{page:999999}).plans.find(p=>p.family==='fourWild');assert(loose);assert(!loose.fans.some(f=>['heaven','pong','seven','gates'].includes(f.id)));
 const heaven=winPlanPage(c,{fan:'heaven'});assert(heaven.total>0);assert(heaven.plans.every(p=>p.family!=='fourWild'));
 const seven=context([0,0,1,1,9,9,10,10,18,18,32,32,32,32],{fourWildWin:true});const pairs=winPlanPage(seven,{fan:'seven'});assert(pairs.total);assert(pairs.plans.every(p=>p.family==='seven'&&p.fans.some(f=>f.id==='fourWild')&&!p.fans.some(f=>f.id==='doubleWild')));
 for(const [types,fan,multiple] of [
  [[1,1,2,2,4,4,5,5,7,7,32,32,32,32],'pure','32'],
  [[27,27,28,28,29,29,30,30,31,31,32,32,32,32],'honors','128'],
  [[0,0,8,8,9,9,17,17,27,27,32,32,32,32],'mixedTerminals','64'],
 ] as [number[],string,string][]){const x=context(types,{fourWildWin:true});let p:ReturnType<typeof bestWinPlan>;visitWinPlans(x,n=>{if(n.family==='fourWild'&&n.fans.some(f=>f.id===fan)){p=n;return false;}});assert(p);assert.equal(p.multiplier,multiple);assert(!p.fans.some(f=>['seven','pong','heaven'].includes(f.id)));}
});
test('four-wild confirmation preserves prizes, exact three-payer chips, reports and independent kong charges',()=>{
 const g=game(scattered,{baseChips:'100000000000000000000'});moveModern(g,0,{action:'hu'});const hidden=JSON.stringify(modernView(g,'p1'));assert(!hidden.includes('"wall"'));assert(!hidden.includes('"choice"'));assert(!hidden.includes('"awards"'));const p=bestWinPlan(g.choice!)!,n=g.wall.slice(-2).filter(t=>p.hitTypes.includes(effectiveType(t,g.wildcard))).length;
 const expected=BigInt(g.baseChips)*BigInt(1+n)*8n;moveModern(g,0,{action:'confirm_win',candidateId:p.id});finishAwards(g);assert.deepEqual(g.deltas,[String(expected*3n),String(-expected),String(-expected),String(-expected)]);assert.equal(g.result!.awards.length,2);assert.equal(roundReport('四赖',g.result!).rounds[0].family,'fourWild');assert.equal(g.seats.reduce((s,p)=>s+BigInt(p.balance),0n),4000n);assert.throws(()=>moveModern(g,0,{action:'confirm_win',candidateId:p.id}));
 const a=game(scattered);moveModern(a,0,{action:'hu'});const b=structuredClone(a);b.wall.reverse();timeoutModern(a,a.deadline);timeoutModern(b,b.deadline);finishAwards(a);finishAwards(b);assert.equal(a.result!.plan!.id,b.result!.plan!.id);
 const k=game([0,0,0,0,9,12,17,21,27,30,32,32,32,32]);const kong=modernOptions(k,0).kongs.find(o=>o.kind==='concealed')!;assert(kong);moveModern(k,0,{action:'kong',key:kong.key});assert(modernOptions(k,0).fourWildHu);assert.deepEqual(k.deltas,['60','-20','-20','-20']);moveModern(k,0,{action:'hu'});const kp=bestWinPlan(k.choice!)!;assert(kp.fans.some(f=>f.id==='flower'));assert(kp.fans.some(f=>f.id==='fourWild'));assert(kp.fans.some(f=>f.id==='selfDraw'));const aborted=structuredClone(k);closeModern(aborted,true);assert.deepEqual(aborted.deltas,['0','0','0','0']);timeoutModern(k,k.deadline);finishAwards(k);assert.equal(k.entries.filter(e=>e.kind==='concealed').length,1);assert.equal(k.entries.filter(e=>e.kind==='win').length,1);
});
test('manual prize reveal is winner-only, sequential, private until flipped, and settles exactly once',()=>{
 const g=game(normal),now=Date.now();moveModern(g,0,{action:'hu'},now);const p=bestWinPlan(g.choice!)!,wall=[...g.wall];moveModern(g,0,{action:'confirm_win',candidateId:p.id},now);
 assert.equal(g.phase,'revealing');assert.equal(g.deadline,now+15000);assert.equal(g.choice,null);assert.deepEqual(g.wall,wall);assert.equal(g.result,null);assert.equal(g.entries.filter(e=>e.kind==='win').length,0);
 for(let seat=0;seat<4;seat++){const v=modernView(g,'p'+seat);assert.deepEqual(v.awardReveal!.awards,[]);assert.equal(v.awardReveal!.canFlip,seat===0);assert(!Object.hasOwn(v,'wall'));assert(v.seats.filter((_,i)=>i!==seat).every(s=>s.hand.length===0));}
 const before=structuredClone(g);for(const [seat,awardIndex] of [[1,0],[0,1],[0,-1]])assert.throws(()=>moveModern(g,seat,{action:'flip_award',awardIndex},now));assert.deepEqual(g,before);
 assert.throws(()=>moveModern(g,0,{action:'confirm_win',candidateId:p.id},now));assert.throws(()=>moveModern(g,0,{action:'discard',tile:g.seats[0].hand[0]},now));
 moveModern(g,0,{action:'flip_award',awardIndex:0},now+500);assert.equal(g.phase,'revealing');assert.equal(g.deadline,now+15500);assert.equal(g.wall.length,wall.length-1);assert.equal(g.reveal!.awards[0].tile,wall.at(-1));assert.equal(modernView(g,'p2').awardReveal!.awards.length,1);assert.equal(g.result,null);assert.throws(()=>moveModern(g,0,{action:'flip_award',awardIndex:0},now+600));
 moveModern(g,0,{action:'flip_award',awardIndex:1},now+1000);assert.equal(g.phase,'finished');assert.deepEqual(g.result!.awards.map(a=>a.tile),wall.slice(-2).reverse());assert.equal(g.wall.length,wall.length-2);assert.equal(g.entries.filter(e=>e.kind==='win').length,1);assert(modernView(g,'p2').seats.every(s=>s.hand.length>0));assert.throws(()=>moveModern(g,0,{action:'flip_award',awardIndex:1},now+1100));
});
test('disconnected prize turns time out one at a time; mid-reveal abort returns tiles and kong charges',()=>{
 const g=game([0,0,0,0,9,10,11,18,19,20,27,27,28,28]),k=modernOptions(g,0).kongs[0];moveModern(g,0,{action:'kong',key:k.key});
 // Set a known legal winning concealed hand while preserving the four-tile meld.
 const used=new Set(g.seats[0].melds.flatMap(m=>m.tiles));g.seats[0].hand=physical([9,10,11,18,19,20,27,27,2,4,3]);g.seats[0].hand.forEach(t=>used.add(t));const rest=Array.from({length:136},(_,i)=>i).filter(t=>!used.has(t));for(let i=1;i<4;i++)g.seats[i].hand=rest.splice(0,13);g.wall=rest;g.drawn=g.seats[0].hand.at(-1)!;
 moveModern(g,0,{action:'hu'});moveModern(g,0,{action:'confirm_win',candidateId:bestWinPlan(g.choice!)!.id});const wall=[...g.wall];assert(!timeoutModern(g,g.deadline-1));timeoutModern(g,g.deadline);assert.equal(g.phase,'revealing');assert.equal(g.reveal!.awards.length,1);const second=structuredClone(g);timeoutModern(second,second.deadline);assert.equal(second.phase,'finished');assert.equal(second.entries.filter(e=>e.kind==='win').length,1);assert(second.log.filter(l=>l.text.includes('超时自动翻开')).length===2);
 closeModern(g,true);assert.equal(g.result!.winType,'aborted');assert.deepEqual(g.seats.map(s=>s.balance),['1000','1000','1000','1000']);assert.deepEqual(g.wall,wall);assert.equal(g.result!.awards.length,0);assert.equal(g.reveal,null);assert.equal(new Set([...g.wall,...g.seats.flatMap(s=>[...s.hand,...s.river,...s.melds.flatMap(m=>m.tiles)])]).size,136);
});
test('four desired representative tiles narrow the large choice set without losing duplicates',()=>{
 const c=context(scattered,{fourWildWin:true});const one=winPlanPage(c,{targets:'28,30,31,33'});assert.equal(one.total,1);assert.deepEqual(one.plans[0].assignments.map(a=>a.type),[28,30,31,33]);
 const repeated=winPlanPage(c,{targets:'33,33,33,33'});assert.equal(repeated.total,1);assert(repeated.plans[0].assignments.every(a=>a.type===33));assert.equal(winPlanPage(c,{targets:'0,0,0,0'}).total,0);assert.equal(winPlanPage(c,{targets:'33,33,33,33,33'}).total,0);
});
