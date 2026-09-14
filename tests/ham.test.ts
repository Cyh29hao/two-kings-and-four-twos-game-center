import test from 'node:test';
import assert from 'node:assert/strict';
import {winPlans,canWin,effectiveType,isWild,type WinContext} from '../lib/mahjong/solver.ts';
import {newModern,modernSeat,dealModern,modernOptions,moveModern,timeoutModern,closeModern,modernView,type ModernGame} from '../lib/mahjong/modern.ts';
import {HAM,HAM_V1,HAM_V2,HAM_V3,BASIC_CHIPS,isHamRules} from '../lib/mahjong/rules.ts';
import {isModern} from '../lib/mahjong/game.ts';
import {isWinning,type Meld} from '../lib/mahjong/engine.ts';
import {publicRound,roundReport} from '../lib/mahjong/report.ts';
const physical=(types:number[])=>{const c=Array(34).fill(0);return types.map(t=>{assert(c[t]<4);return t*4+c[t]++;});};
function ctx(types:number[],patch:Partial<WinContext>={}):WinContext{const hand=physical(types);return {round:'test',hand,melds:[],wildcard:32,incoming:hand.at(-1)!,winType:'self',flower:false,heaven:false,earth:false,...patch};}
const ids=(p:ReturnType<typeof winPlans>[number])=>p.fans.map(f=>f.id);
const normal=[0,1,2,9,10,11,18,19,20,30,30,2,4,3];
test('ham-v2 self draw is an independent factor on every complete plan, including special hands',()=>{
 for(const types of [normal,[0,0,1,1,9,9,10,10,18,18,27,27,28,28],[0,1,2,9,10,11,18,19,20,27,27,32,32,4]]){
  const before=winPlans(ctx(types,{selfDrawUnit:1})),after=winPlans(ctx(types,{selfDrawUnit:2}));
  assert(before.length);assert.equal(after.length,before.length);
  for(const p of before){const next=after.find(n=>n.id===p.id)!;assert(next);assert.deepEqual(next.groups,p.groups);assert.deepEqual(next.assignments,p.assignments);assert.deepEqual(next.hitTypes,p.hitTypes);
   assert.equal(next.multiplier,(BigInt(p.multiplier)*2n).toString());assert.deepEqual(next.fans.filter(f=>f.id==='selfDraw'),[{id:'selfDraw',name:'自摸',multiplier:'2'}]);
  }
 }
 const normalSelf=winPlans(ctx(normal,{selfDrawUnit:2}))[0];assert.equal(normalSelf.multiplier,'8');
 const flower=winPlans(ctx(normal,{selfDrawUnit:2,flower:true}))[0];assert.equal(flower.multiplier,'16');assert(ids(flower).includes('selfDraw'));assert(ids(flower).includes('flower'));
 for(const winType of ['discard','rob'] as const){const old=winPlans(ctx(normal,{winType,selfDrawUnit:1})),next=winPlans(ctx(normal,{winType,selfDrawUnit:2}));assert.deepEqual(next,old);assert(next.every(p=>!ids(p).includes('selfDraw')));}
 assert(!canWin(ctx([0,1,2,9,10,11,18,19,20,30,30,1,3,2],{selfDrawUnit:2})), 'self draw does not waive the middle restriction');
});
test('ordinary middle 4–8, exclusions and incoming wildcard',()=>{
 const ps=winPlans(ctx(normal));assert(ps.length);assert(ps.every(p=>p.middle&&p.incomingType===3&&p.multiplier==='4'));
 assert(!canWin(ctx([0,1,2,9,10,11,18,19,20,30,30,1,3,2])));
 assert(!canWin(ctx([0,1,2,9,10,11,18,19,20,30,30,6,7,8])));
 const wild=winPlans(ctx([...normal.slice(0,-1),32]));assert(wild.some(p=>p.incomingType===3&&p.middle));assert(wild.every(p=>p.incomingType%9>=3&&p.incomingType%9<=7));
 const invalid=ctx([27,27,27,28,28,29,29,30,30,31,31,31,31,32]);assert(!canWin({...invalid,wildcard:0,heaven:true}));
});
test('ham-v3 removes only the no-wildcard bonus for every win source and complete plan',()=>{
 const hands=[normal,[0,0,1,1,9,9,10,10,18,18,27,27,28,28],[0,0,0,1,2,3,4,5,6,7,8,8,8,4],[0,1,2,9,10,11,18,19,20,27,27,32,32,4]];
 for(const hand of hands)for(const winType of ['self','discard','rob'] as const){
  const before=winPlans(ctx(hand,{winType,selfDrawUnit:2})),after=winPlans(ctx(hand,{winType,selfDrawUnit:2,noWildBonus:false}));
  assert(before.length);assert.equal(after.length,before.length);
  for(const p of before){const next=after.find(n=>n.id===p.id)!;assert(next);assert.deepEqual(next.groups,p.groups);assert.deepEqual(next.hitTypes,p.hitTypes);assert.deepEqual(next.assignments,p.assignments);
   assert(!ids(next).includes('noWild'));assert.equal(BigInt(next.multiplier),BigInt(p.multiplier)/(ids(p).includes('noWild')?2n:1n));
   assert.deepEqual(next.fans.filter(f=>f.id!=='ordinary'),p.fans.filter(f=>f.id!=='noWild'&&f.id!=='ordinary'));
  }
 }
 const melds:Meld[]=[{kind:'chi',tiles:[0,4,8],from:3,concealed:false}];
 const c={...ctx(normal),hand:[36,40,44,72,76,80,120,121,9,16,12],incoming:12,melds,selfDrawUnit:2,noWildBonus:false};
 assert.equal(winPlans({...c,winType:'discard'})[0].multiplier,'1');assert.equal(winPlans({...c,winType:'self'})[0].multiplier,'2');assert.equal(winPlans({...c,winType:'self',flower:true})[0].multiplier,'4');
});
test('seven pairs, three luxury levels and naturally held quads',()=>{
 for(const [types,lux] of [
  [[0,0,1,1,9,9,10,10,18,18,27,27,28,28],0],
  [[2,2,2,2,9,9,10,10,18,18,27,27,28,28],1],
  [[2,2,2,2,11,11,11,11,18,18,27,27,28,28],2],
  [[2,2,2,2,11,11,11,11,20,20,20,20,28,28],3],
 ] as [number[],number][]){const p=winPlans(ctx(types)).find(p=>p.family==='seven')!;assert(p);assert(ids(p).includes(lux?'luxury'+lux:'seven'));assert(!ids(p).includes('closed'));assert.equal(p.multiplier,String(2**(lux+1)*2));}
 const p=winPlans(ctx([0,0,0,32,9,9,10,10,18,18,27,27,28,28])).find(p=>p.family==='seven'&&p.assignments[0].type===0)!;
 assert(p);assert(ids(p).includes('seven'));assert(!ids(p).some(i=>i.startsWith('luxury')));
});
test('all fan categories and exact non-duplication matrix',()=>{
 const cases:[number[],string,string[]][]=[
  [[1,1,1,10,10,10,19,19,19,27,27,27,28,28],'pong',[]],
  [[0,1,2,3,4,5,5,6,7,0,0,0,4,4],'pure',[]],
  [[0,1,2,3,4,5,5,6,7,27,27,27,4,4],'mixed',[]],
  [[27,27,27,28,28,28,29,29,29,30,30,9,10,11],'smallWinds',[]],
  [[27,27,27,28,28,28,29,29,29,30,30,30,31,31],'bigWinds',['pong','smallWinds']],
  [[27,27,27,28,28,28,29,29,29,31,31,31,30,30],'honors',['pong','mixedTerminals','terminals']],
  [[0,0,0,8,8,8,9,9,9,27,27,27,28,28],'mixedTerminals',['pong','terminals','honors']],
  [[0,0,0,8,8,8,9,9,9,17,17,17,18,18],'terminals',['pong','mixedTerminals','honors']],
 ];
 for(const [types,fan,excluded] of cases){const p=winPlans(ctx(types)).find(p=>ids(p).includes(fan));assert(p,fan);for(const id of excluded)assert(!ids(p).includes(id),fan+' excludes '+id);}
 const big=winPlans(ctx([31,31,31,32,32,32,0,0,0,9,10,11,27,27],{wildcard:0})).find(p=>ids(p).includes('bigDragons'));assert(big);assert(!ids(big).includes('smallDragons'));
 const small=winPlans(ctx([31,31,31,32,32,32,0,0,9,10,11,18,19,20],{wildcard:0})).find(p=>ids(p).includes('smallDragons'));assert(small);
 const orphanTypes=[33,8,9,17,18,26,27,28,29,30,31,32,0,27];const orphan=winPlans(ctx(orphanTypes,{wildcard:0})).find(p=>p.family==='orphans');assert(orphan);assert.equal(orphan.multiplier,'32');assert(!ids(orphan).includes('mixedTerminals'));
 const gates=winPlans(ctx([0,0,0,1,2,3,4,5,6,7,8,8,8,4])).find(p=>p.family==='gates');assert(gates);assert.equal(gates.multiplier,'64');assert(!ids(gates).includes('pure'));assert(!ids(gates).includes('closed'));
 const melds:Meld[]=[1,10,19,27].map(t=>({kind:'kong',tiles:[0,1,2,3].map(i=>t*4+i),from:0,concealed:true}));
 const kong=winPlans(ctx([28,28],{melds}))[0];assert(ids(kong).includes('fourKongs'));assert(!ids(kong).includes('pong'));assert.equal(kong.multiplier,'128');
 for(const extra of [{heaven:true},{earth:true},{flower:true},{winType:'rob' as const}]){
  const p=winPlans(ctx(normal,extra))[0];assert(p);const expected=extra.heaven?'heaven':extra.earth?'earth':extra.flower?'flower':'rob';assert(ids(p).includes(expected));if(extra.heaven||extra.earth)assert(!ids(p).includes('closed'));
 }
});
test('double wildcard requires the same middle sequence, never mixes interpretations',()=>{
 const c=ctx([3,4,5,9,10,11,18,19,20,27,27,32,32,4]);
 const ps=winPlans(c),double=ps.filter(p=>ids(p).includes('doubleWild'));assert(double.length);
 for(const p of double){assert(p.middle);assert.deepEqual(p.assignments.map(a=>a.type).sort((a,b)=>a-b),[3,5]);assert.equal(p.family,'standard');}
 assert(ps.some(p=>!ids(p).includes('doubleWild')));
 const alternate=winPlans(ctx([1,1,1,2,2,2,3,3,3,4,4,32,32,3]));assert(alternate.some(p=>p.family==='seven'));assert(alternate.some(p=>ids(p).includes('doubleWild')));assert(alternate.every(p=>p.family!=='seven'||!ids(p).includes('doubleWild')));
 const incoming=winPlans(ctx([0,1,2,9,10,11,18,19,20,27,27,32,32,32]));assert(incoming.some(p=>ids(p).includes('doubleWild')));
});
test('all wildcard assignments match an independent exhaustive ordinary/seven/orphan/gates oracle',()=>{
 for(let count=0;count<=4;count++){
  const types=[0,1,2,3,4,5,9,10,11,27,27,2,4,3].slice(0,14-count).concat(Array(count).fill(32));
  const c=ctx(types,{heaven:true}),start=performance.now(),actual=new Set(winPlans(c).map(p=>p.assignments.map(a=>a.type).sort((a,b)=>a-b).join(',')));
  const base=Array<number>(34).fill(0);for(const t of c.hand)if(!isWild(t,c.wildcard))base[effectiveType(t,c.wildcard)]++;
  const expected=new Set<string>(),chosen:number[]=[];
  function check(){const ts=base.flatMap((n,t)=>Array(n).fill(t));const cards=physical(ts);const orphan=[0,8,9,17,18,26,27,28,29,30,31,32,33];
   const isOrphan=orphan.every(t=>base[t]>=1)&&base.every((n,t)=>!n||orphan.includes(t))&&base.filter(n=>n===2).length===1;
   let gates=false;for(let s=0;s<3;s++){const required=[3,1,1,1,1,1,1,1,3];if(base.every((n,t)=>!n||Math.floor(t/9)===s)&&required.every((n,i)=>base[s*9+i]>=n))gates=true;}
   if(isWinning(cards,0,true)||isOrphan||gates)expected.add(chosen.join(','));
  }
  function assign(start:number,left:number){if(!left){check();return;}for(let t=start;t<34;t++)if(base[t]<4){base[t]++;chosen.push(t);assign(t,left-1);chosen.pop();base[t]--;}}
  assign(0,count);assert.deepEqual([...actual].sort(),[...expected].sort(),'wildcards='+count);console.log({wildcards:count,assignments:actual.size,oracleMs:Math.round(performance.now()-start)});
 }
});
function fixture(types:number[],patch:Partial<ModernGame>={}):ModernGame {
 const g=newModern('p0','小满',30,HAM_V3);g.seats=['小满','阿北','桃子','小川'].map((n,i)=>modernSeat('p'+i,n,'1000'));dealModern(g);g.wildcard=32;g.opening=false;
 g.seats[0].hand=physical(types);const unused=Array.from({length:136},(_,i)=>i).filter(t=>!g.seats[0].hand.includes(t));for(let i=1;i<4;i++)g.seats[i].hand=unused.splice(0,13);g.wall=unused;g.drawn=g.seats[0].hand.at(-1)!;return Object.assign(g,patch);
}
test('ham-v3 snapshots no-wildcard policy through choosing, settlement and reports; saved ham-v2 is unchanged',()=>{
 const old=fixture(normal,{rules:HAM_V2}),current=structuredClone(old);current.rules={...HAM_V3};
 assert(isModern(old)&&isModern(current));assert(isHamRules('ham-v1')&&isHamRules('ham-v2')&&isHamRules('ham-v3'));
 moveModern(old,0,{action:'hu'});moveModern(current,0,{action:'hu'});assert.equal(current.choice!.noWildBonus,false);
 // A serialized pre-update choosing state has no noWildBonus field in either snapshot or context.
 const restored=JSON.parse(JSON.stringify(old)) as ModernGame;assert(!Object.hasOwn(restored.choice!,'noWildBonus'));
 const p=winPlans(current.choice!)[0],previous=winPlans(restored.choice!)[0];assert.equal(p.multiplier,'4');assert.equal(previous.multiplier,'8');assert(ids(previous).includes('noWild'));
 moveModern(current,0,{action:'confirm_win',candidateId:p.id});timeoutModern(restored,restored.deadline);
 assert(current.deltas.every((d,i)=>BigInt(d)*2n===BigInt(restored.deltas[i])));assert.equal(current.deltas.reduce((n,d)=>n+BigInt(d),0n),0n);
 const report=roundReport('新规则',current.result!).rounds[0];assert.equal(report.multiplier,'4');assert(!report.fans.some(f=>f.id==='noWild'));assert(report.fans.some(f=>f.id==='selfDraw'));assert.deepEqual(report.players.map(p=>p.delta),current.deltas);
 const historical=roundReport('旧规则',JSON.parse(JSON.stringify(restored.result!))).rounds[0];assert.equal(historical.multiplier,'8');assert(historical.fans.some(f=>f.id==='noWild'));
 dealModern(current);dealModern(restored);assert.equal(current.rules.noWildBonus,false);assert.equal(restored.rules.id,'ham-v2');assert.notEqual(restored.rules.noWildBonus,false);
});
test('ham-v2 self draw settlement pays three players after awards and exposes the same factor in reports',()=>{
 const g=fixture(normal,{rules:HAM_V2});assert.equal(g.rules.id,'ham-v2');assert.equal(g.rules.selfDrawUnit,2);moveModern(g,0,{action:'hu'});assert.equal(g.choice!.selfDrawUnit,2);
 const p=winPlans(g.choice!)[0];assert.equal(p.multiplier,'8');const hits=g.wall.slice(-2).filter(t=>p.hitTypes.includes(effectiveType(t,g.wildcard))).length;
 const payment=10n*BigInt(1+hits)*8n;moveModern(g,0,{action:'confirm_win',candidateId:p.id});
 assert.deepEqual(g.deltas,[String(payment*3n),String(-payment),String(-payment),String(-payment)]);assert.equal(g.entries.filter(e=>e.kind==='win').length,1);
 const report=roundReport('自摸测试',g.result!).rounds[0];assert.equal(report.multiplier,'8');assert(report.fans.some(f=>f.id==='selfDraw'&&f.multiplier==='2'));assert.deepEqual(report.players.map(p=>p.delta),g.deltas);
});
test('ham-v1 rooms and saved choosing states keep their original multiplier; basic rooms stay unchanged',()=>{
 assert(isHamRules(HAM.id)&&isHamRules(HAM_V1.id));assert(isModern(fixture(normal)));assert(isModern(fixture(normal,{rules:HAM_V1})));
 for(const missingField of [false,true]){
  const g=fixture(normal,{rules:structuredClone(HAM_V1)});moveModern(g,0,{action:'hu'});assert.equal(g.choice!.selfDrawUnit,1);if(missingField)delete g.choice!.selfDrawUnit;
  const restored=JSON.parse(JSON.stringify(g)) as ModernGame,p=winPlans(restored.choice!)[0];assert.equal(p.multiplier,'4');assert(!ids(p).includes('selfDraw'));
  if(missingField)timeoutModern(restored,restored.deadline);else moveModern(restored,0,{action:'confirm_win',candidateId:p.id});
  assert.equal(restored.result!.plan!.multiplier,'4');const savedReport=roundReport('旧桌',JSON.parse(JSON.stringify(restored.result!)));assert(!savedReport.rounds[0].fans.some(f=>f.id==='selfDraw'));
  dealModern(restored);assert.equal(restored.rules.id,'ham-v1');assert.equal(restored.rules.selfDrawUnit,1);
 }
 const basic=fixture(normal,{rules:BASIC_CHIPS,wildcard:-1});moveModern(basic,0,{action:'hu'});assert.equal(basic.phase,'finished');assert.deepEqual(basic.deltas,['30','-10','-10','-10']);assert.equal(basic.result!.plan,null);
});
test('choose before awards, immutable selection, exact payment, redacted public report',()=>{
 const g=fixture(normal,{baseChips:'100000000000000000000'});moveModern(g,0,{action:'hu'});assert.equal(g.phase,'choosing');
 const before=g.wall.length,serialized=JSON.stringify(modernView(g,'p1'));assert(!serialized.includes('"wall"'));assert(!serialized.includes('"choice"'));assert(!serialized.includes('"awards"'));
 assert.throws(()=>moveModern(g,1,{action:'confirm_win',candidateId:'x'}));const p=winPlans(g.choice!)[0];
 const award=g.wall.slice(-2);const hits=award.filter(t=>p.hitTypes.includes(effectiveType(t,g.wildcard))).length;
 moveModern(g,0,{action:'confirm_win',candidateId:p.id});assert.equal(g.phase,'finished');assert.equal(g.wall.length,before-2);assert.equal(g.deltas[0],(BigInt(g.baseChips)*BigInt(1+hits)*BigInt(p.multiplier)*3n).toString());
 assert(g.seats.some(s=>BigInt(s.balance)<0n));assert.equal(g.deltas.reduce((n,v)=>n+BigInt(v),0n),0n);assert.throws(()=>moveModern(g,0,{action:'confirm_win',candidateId:p.id}));
 const report=roundReport('好友桌',g.result!),publicJson=JSON.stringify(report);assert(!publicJson.includes('p0'));assert(!publicJson.includes(g.round));assert(!publicJson.includes('candidate'));assert.equal(publicRound(g.result!).groups.length,p.groups.length);
});
test('timeout selects highest without looking at awards; ledger survives draws and refunds aborted round only',()=>{
 const a=fixture([0,1,2,9,10,11,18,19,20,27,27,32,32,4]);moveModern(a,0,{action:'hu'});const b=structuredClone(a);b.wall.reverse();const best=winPlans(a.choice!)[0].id;
 timeoutModern(a,a.deadline);timeoutModern(b,b.deadline);assert.equal(a.result!.plan!.id,best);assert.equal(b.result!.plan!.id,best);assert(a.result!.automatic);
 const k=fixture([0,0,0,0,9,10,11,18,19,20,27,27,28,28]);const tail=k.wall.at(-1);const op=modernOptions(k,0).kongs.find(o=>o.kind==='concealed')!;moveModern(k,0,{action:'kong',key:op.key});assert.equal(k.drawn,tail);assert.deepEqual(k.deltas,['60','-20','-20','-20']);
 const aborted=structuredClone(k);closeModern(aborted,true);assert.deepEqual(aborted.seats.map(s=>s.balance),['1000','1000','1000','1000']);assert.equal(aborted.result!.winType,'aborted');assert.equal(aborted.entries.at(-1)!.kind,'refund');assert(!aborted.result!.awards.length);
 k.wall=k.wall.slice(0,12);assert(!modernOptions(k,0).kongs.length);moveModern(k,0,{action:'discard',tile:k.drawn!});if(k.pending)timeoutModern(k,k.deadline);while(k.phase==='playing')timeoutModern(k,k.deadline);assert.equal(k.winType,'draw');assert.deepEqual(k.deltas,['60','-20','-20','-20']);
 const balances=k.seats.map(s=>s.balance);dealModern(k);closeModern(k,true);assert.deepEqual(k.seats.map(s=>s.balance),balances);
});
test('13 to 12 finishes the turn; dealer stays on win/draw, advances on farmer win',()=>{
 const g=fixture(normal);g.wall=g.wall.slice(0,13);moveModern(g,0,{action:'discard',tile:g.drawn!});if(g.pending)timeoutModern(g,g.deadline);assert.equal(g.wall.length,12);assert.equal(g.phase,'playing');assert.equal(g.turn,1);
 for(const type of ['draw','self','discard'] as const){const h=fixture(normal);h.phase='finished';h.winType=type;h.winner=type==='discard'?2:0;dealModern(h);assert.equal(h.dealer,type==='discard'?1:0);}
 const basic=fixture(normal,{rules:BASIC_CHIPS,wildcard:-1});basic.phase='finished';basic.winner=0;basic.winType='self';dealModern(basic);assert.equal(basic.dealer,1);
});
test('50 complete ham games conserve all 136 tiles and chips',()=>{
 let wins=0,kongs=0,choices=0;
 for(let run=0;run<50;run++){
  const g=newModern('p0','A',30,HAM);g.seats=['A','B','C','D'].map((n,i)=>modernSeat('p'+i,n,'1000'));dealModern(g);let moves=0;
  while(['playing','choosing','revealing'].includes(g.phase)){
   assert(++moves<650);
   if(g.phase==='revealing'){timeoutModern(g,g.deadline);continue;}
   if(g.phase==='choosing'){choices++;timeoutModern(g,g.deadline);continue;}
   if(g.pending){const i=g.pending.eligible.find(i=>!Object.hasOwn(g.pending!.responses,String(i)))!;const options=modernOptions(g,i);const best=options.claims.find(c=>c.kind==='hu')||options.claims.find(c=>c.kind==='kong')||options.claims.find(c=>c.kind==='pong');moveModern(g,i,best?{action:'claim',key:best.key}:{action:'pass'});}
   else {const o=modernOptions(g,g.turn);if(o.canHu)moveModern(g,g.turn,{action:'hu'});else if(o.kongs.length){kongs++;moveModern(g,g.turn,{action:'kong',key:o.kongs[0].key});}else{const h=o.discardable;moveModern(g,g.turn,{action:'discard',tile:h[(moves*7)%h.length]});}}
   const all=[...g.wall,...g.seats.flatMap(s=>[...s.hand,...s.river,...s.melds.flatMap(m=>m.tiles)]),...(g.result?.awards.map(a=>a.tile)||[])];assert.equal(all.length,136);assert.equal(new Set(all).size,136);assert.equal(g.seats.reduce((n,s)=>n+BigInt(s.balance),0n),4000n);
  }if(g.winner>=0)wins++;
 }console.log({hamGames:50,wins,kongs,choices});
});

function arranged(hands:number[][],meldTypes:{seat:number;type:number}[]=[]){
 const g=fixture(normal),used=new Set<number>();
 const cards=(ts:number[])=>ts.map(t=>{const id=[0,1,2,3].map(i=>t*4+i).find(i=>!used.has(i));assert(id!==undefined);used.add(id);return id;});
 g.seats.forEach(s=>{s.hand=[];s.melds=[];s.river=[];});
 for(const m of meldTypes)g.seats[m.seat].melds.push({kind:'pong',tiles:cards([m.type,m.type,m.type]),from:3,concealed:false});
 hands.forEach((h,i)=>g.seats[i].hand=cards(h));const unused=Array.from({length:136},(_,i)=>i).filter(i=>!used.has(i));
 for(let i=0;i<4;i++){const expected=(i===0?14:13)-3*g.seats[i].melds.length;g.seats[i].hand.push(...unused.splice(0,expected-g.seats[i].hand.length));}
 g.wall=unused;g.drawn=g.seats[0].hand.at(-1)!;return g;
}
test('exposed kong pays all three, takes wall tail and starts an 8-second response only when needed',()=>{
 const g=arranged([[0],[0,0,0,9,10,11,18,19,20,27,27,28,28]]),tile=g.seats[0].hand[0],now=1000;
 moveModern(g,0,{action:'discard',tile},now);assert(g.pending);assert.equal(g.deadline,9000);const o=modernOptions(g,1).claims.find(c=>c.kind==='kong')!;assert(o);const tail=g.wall.at(-1);
 moveModern(g,1,{action:'claim',key:o.key},2000);assert.equal(g.pending,null);assert.deepEqual(g.deltas,['-10','30','-10','-10']);assert.equal(g.drawn,tail);assert.equal(g.turn,1);
 const no=arranged([[32],[0,0,1,1,2,2,9,9,10,10,18,18,19],[3,3,4,4,5,5,11,11,12,12,20,20,21],[6,6,7,7,8,8,13,13,14,14,22,22,23]]);
 // Each opponent is one off seven pairs: a 发 wildcard can hu, so use an ordinary unused honor instead.
 const honor=no.wall.find(t=>Math.floor(t/4)===31)!;const replaced=no.seats[0].hand[0];no.seats[0].hand[0]=honor;no.wall[no.wall.indexOf(honor)]=replaced;
 moveModern(no,0,{action:'discard',tile:honor},1000);assert.equal(no.pending,null);assert.equal(no.turn,1);assert.equal(no.deadline,31000);
});
test('added kong can be robbed with no attempted-kong charge, or completes after pass',()=>{
 const setup=()=>arranged([[4],[0,1,2,9,10,11,18,19,20,27,27,3,5]],[{seat:0,type:4}]);
 const g=setup(),op=modernOptions(g,0).kongs.find(k=>k.kind==='added')!;assert(op);moveModern(g,0,{action:'kong',key:op.key});assert.equal(g.entries.length,0);assert(g.pending);const h=modernOptions(g,1).claims.find(c=>c.kind==='hu')!;assert(h);
 moveModern(g,1,{action:'claim',key:h.key});if(g.pending)timeoutModern(g,g.deadline);assert.equal(g.phase,'choosing');assert.equal(g.winType,'rob');assert.equal(g.entries.length,0);assert.equal(g.seats[0].melds[0].kind,'pong');
 timeoutModern(g,g.deadline);assert.equal(g.entries.length,1);assert.equal(g.entries[0].kind,'win');assert.equal(g.deltas[2],'0');assert.equal(g.deltas[3],'0');assert.equal(BigInt(g.deltas[0]),-BigInt(g.deltas[1]));assert(ids(g.result!.plan!).includes('rob'));
 const complete=setup();moveModern(complete,0,{action:'kong',key:modernOptions(complete,0).kongs.find(k=>k.kind==='added')!.key});const tail=complete.wall.at(-1);timeoutModern(complete,complete.deadline);assert.equal(complete.seats[0].melds[0].kind,'kong');assert.deepEqual(complete.deltas,['30','-10','-10','-10']);assert.equal(complete.drawn,tail);assert(!complete.opening);assert(complete.flower);
});
test('nearest hu wins regardless of reply order, and lower-priority responses do not delay it',()=>{
 const wait=[0,1,2,9,10,11,18,19,20,27,27,2,4],g=arranged([[3],wait,wait]);const incoming=g.seats[0].hand[0];moveModern(g,0,{action:'discard',tile:incoming});
 const second=modernOptions(g,2).claims.find(c=>c.kind==='hu')!,first=modernOptions(g,1).claims.find(c=>c.kind==='hu')!;assert(second&&first);
 moveModern(g,2,{action:'claim',key:second.key});assert.equal(g.phase,'playing');assert(g.pending);
 moveModern(g,1,{action:'claim',key:first.key});assert.equal(g.phase,'choosing');assert.equal(g.winner,1);
});
test('white conversion governs ordinary calls; physical wildcard is never a pong/kong substitute',()=>{
 const g=arranged([[33],[33,33,9,10,11,18,19,20,27,27,28,28]]);g.wildcard=4;moveModern(g,0,{action:'discard',tile:g.seats[0].hand[0]});assert(modernOptions(g,1).claims.some(o=>o.kind==='pong'));
 const wild=arranged([[4],[4,4,9,10,11,18,19,20,27,27,28,28]]);wild.wildcard=4;moveModern(wild,0,{action:'discard',tile:wild.seats[0].hand[0]});assert(!modernOptions(wild,1).claims.some(o=>['chi','pong','kong'].includes(o.kind)));
});

test('award identity is fixed, repeated awards count separately, and choices change hits',()=>{
 const g=fixture([0,1,2,9,10,11,18,19,20,2,4,32,32,3]);
 // These two physical tiles are white and the third 发: both compare as 发, not as an automatic hit.
 g.wall=[...g.wall.filter(t=>t!==132&&t!==130),130,132];moveModern(g,0,{action:'hu'});
 const other=structuredClone(g),plans=winPlans(g.choice!);
 const fa=plans.find(p=>p.assignments.every(a=>a.type===32))!,white=plans.find(p=>p.assignments.every(a=>a.type===33))!;assert(fa&&white);
 confirm(g,fa.id);confirm(other,white.id);assert.equal(g.result!.awards.filter(a=>a.hit).length,2);assert.equal(other.result!.awards.filter(a=>a.hit).length,0);
 assert.equal(BigInt(g.deltas[0]),3n*BigInt(other.deltas[0]));
 function confirm(h:ModernGame,id:string){moveModern(h,0,{action:'confirm_win',candidateId:id});}
});
test('four-copy cap counts all kong tiles and converted-white sequences stay ordered',()=>{
 const c=ctx([0,1,2,9,10,11,2,4,32,32,3],{melds:[{kind:'kong',tiles:[108,109,110,111],from:0,concealed:true}],heaven:false});
 const ps=winPlans(c);assert(ps.length);assert(ps.every(p=>!p.assignments.some(a=>a.type===27)));
 const converted=ctx([9,10,11,18,19,20,27,27,2,4,3],{wildcard:5,melds:[{kind:'chi',tiles:[17,24,132],from:3,concealed:false}]});
 const p=winPlans(converted)[0];assert(p);assert.deepEqual(p.groups.find(g=>g.exposed)!.types,[4,5,6]);
});
test('initial dealer hu and first discard earth; a preceding kong cancels both',()=>{
 const heaven=fixture(normal,{opening:true});moveModern(heaven,0,{action:'hu'});assert(heaven.choice!.heaven);assert(winPlans(heaven.choice!).every(p=>ids(p).includes('heaven')));
 const make=()=>arranged([[3],[0,1,2,9,10,11,18,19,20,27,27,2,4]]);
 const earth=make();earth.opening=true;moveModern(earth,0,{action:'discard',tile:earth.seats[0].hand[0]});moveModern(earth,1,{action:'claim',key:modernOptions(earth,1).claims.find(o=>o.kind==='hu')!.key});if(earth.pending)timeoutModern(earth,earth.deadline);assert(earth.choice!.earth);
 const after=make();after.opening=false;moveModern(after,0,{action:'discard',tile:after.seats[0].hand[0]});moveModern(after,1,{action:'claim',key:modernOptions(after,1).claims.find(o=>o.kind==='hu')!.key});if(after.pending)timeoutModern(after,after.deadline);assert(!after.choice!.earth);
 timeoutModern(after,after.deadline);assert.equal(after.deltas[2],'0');assert.equal(after.deltas[3],'0');assert.equal(BigInt(after.deltas[0]),-BigInt(after.deltas[1]));
 const k=fixture([0,0,0,0,9,10,11,18,19,20,27,27,28,28],{opening:true});moveModern(k,0,{action:'kong',key:modernOptions(k,0).kongs[0].key});assert(!k.opening);
});
test('administrator abort while selecting refunds only this round and never draws prizes',()=>{
 const k=fixture([0,0,0,0,9,10,11,18,19,20,27,27,28,28]);moveModern(k,0,{action:'kong',key:modernOptions(k,0).kongs[0].key});
 k.seats[0].hand=physical([9,10,11,18,19,20,27,27,2,4,3]);k.drawn=k.seats[0].hand.at(-1)!;moveModern(k,0,{action:'hu'});const left=k.wall.length;
 assert.equal(k.phase,'choosing');closeModern(k,true);assert.equal(k.wall.length,left);assert.equal(k.result!.awards.length,0);assert.deepEqual(k.deltas,['0','0','0','0']);assert.deepEqual(k.entries.map(e=>e.kind),['concealed','refund']);
});
