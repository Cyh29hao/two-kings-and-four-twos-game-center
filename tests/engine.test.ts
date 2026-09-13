import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rank,classify,beats,newGame,deal,bid,play,view,hints,timeout} from '../lib/game/engine.ts';
const cards=(ranks:number[])=>{const used=new Map<number,number>();return ranks.map(r=>{if(r>=16)return r===16?52:53;const n=used.get(r)||0;used.set(r,n+1);return(r-3)*4+n})};
const check=(rs:number[],kind:string|null)=>assert.equal(classify(cards(rs))?.kind||null,kind);
test('all supported combinations and invalid boundaries',()=>{
 check([3],'单张');check([15,15],'对子');check([3,3,3],'三张');check([16,17],'王炸');check([4,4,4,4],'炸弹');check([3,3,3,17],'三带一');check([3,3,3,15,15],'三带二');check([10,11,12,13,14],'顺子');check([11,12,13,14,15],null);check([3,3,4,4,5,5],'连对');check([3,3,4,4],null);check([3,3,3,4,4,4],'飞机');check([3,3,3,4,4,4,7,7],'飞机带单');check([3,3,3,4,4,4,16,17],null);check([3,3,3,4,4,4,7,7,8,8],'飞机带对');check([3,3,3,4,4,4,7,7,7,7],null);check([3,3,3,3,7,7],'四带二');check([3,3,3,3,16,17],null);check([3,3,3,3,7,7,8,8],'四带两对');check([3,3,3,3,7,7,7,7],null);check([14,14,14,15,15,15],null);assert.equal(classify([0,0]),null);assert.equal(classify([54]),null);assert.equal(classify([]),null);
});
test('comparison respects family, length, kickers, bombs and rocket',()=>{const c=(r:number[])=>classify(cards(r))!;assert(beats(c([3,3,3,3]),c([14])));assert(!beats(c([15,15,15,15]),c([16,17])));assert(beats(c([16,17]),c([15,15,15,15])));assert(!beats(c([16,17]),c([16,17])));assert(!beats(c([4,5,6,7,8,9]),c([3,4,5,6,7])));assert(beats(c([5,5,5,3]),c([4,4,4,17])));assert(!beats(c([3,3,3,17]),c([4,4,4,6])));});
const game=()=>{const g=newGame('a','A');g.seats.push({id:'b',name:'B',hand:[],ready:true,plays:0,last:''},{id:'c',name:'C',hand:[],ready:true,plays:0,last:''});deal(g);return g};
test('deal, bidding, redeal and information visibility',()=>{const g=game();assert.equal(new Set([...g.seats.flatMap(s=>s.hand),...g.bottom]).size,54);assert(g.seats.every(s=>s.hand.length===17));assert.equal(view(g,'a').bottom.length,0);assert.equal(view(g,'a').seats[1].hand.length,0);const first=g.turn;assert.throws(()=>bid(g,(first+1)%3,1));bid(g,first,1);assert.throws(()=>bid(g,g.turn,1));bid(g,g.turn,2);bid(g,g.turn,0);bid(g,g.turn,0);assert.equal(g.phase,'playing');assert.equal(g.seats[g.landlord].hand.length,20);assert.equal(view(g,'b').bottom.length,3);const h=game();const id=h.round;for(let i=0;i<3;i++)bid(h,h.turn,0);assert.equal(h.phase,'bidding');assert.notEqual(h.round,id);});
test('turn ownership, duplicate cards, passing twice, spring and balanced scores',()=>{const g=game();bid(g,g.turn,3);const l=g.landlord;g.seats[l].hand=cards([3,4]);g.seats[(l+1)%3].hand=cards([5]);g.seats[(l+2)%3].hand=cards([6]);assert.throws(()=>play(g,l,[]));assert.throws(()=>play(g,(l+1)%3,[8]));assert.throws(()=>play(g,l,[0,0]));play(g,l,[0]);play(g,g.turn,[]);play(g,g.turn,[]);assert.equal(g.turn,l);assert.equal(g.last,null);play(g,l,[4]);assert.equal(g.phase,'finished');assert.equal(g.spring,true);assert.equal(g.multiplier,2);assert.equal(g.deltas.reduce((a,b)=>a+b,0),0);assert.equal(g.deltas[l],12);assert.throws(()=>play(g,l,[4]));});
test('timeout uses legal default action',()=>{const g=game();assert.equal(timeout(g,g.deadline-1),false);assert.equal(timeout(g,g.deadline),true);bid(g,g.turn,3);timeout(g,g.deadline);assert.equal(g.last?.cards.length,1);timeout(g,g.deadline);assert.equal(g.passes,1);timeout(g,g.deadline);assert.equal(g.last,null);});
test('250 full random games preserve cards and finish with zero-sum scores',()=>{for(let n=0;n<250;n++){const g=game();bid(g,g.turn,3);const played:number[]=[];let count=0;while(g.phase==='playing'){assert(++count<600);const s=g.seats[g.turn];const moves=hints(s.hand,g.last?.combo||null);for(const move of moves){assert(classify(move));assert(beats(classify(move)!,g.last?.combo||null));assert(move.every(c=>s.hand.includes(c)));}const move=moves.length&&(Math.random()>.2||!g.last)?moves[Math.floor(Math.random()*moves.length)]:[];played.push(...move);play(g,g.turn,move);const total=[...played,...g.seats.flatMap(s=>s.hand)];assert.equal(total.length,54);assert.equal(new Set(total).size,54);}assert.equal(g.phase,'finished');assert.equal(g.seats[g.winner].hand.length,0);assert.equal(g.deltas.reduce((a,b)=>a+b,0),0);}});

test('seat displays persist until the next turn, clear together on a fresh trick, preserve winning cards',()=>{
 const g=game();g.turn=0;bid(g,0,1);assert.deepEqual(view(g,'a').tableActions,[{kind:'bid',value:1},null,null]);bid(g,1,0);assert.deepEqual(view(g,'c').tableActions,[{kind:'bid',value:1},{kind:'bid',value:0},null]);bid(g,2,0);assert.deepEqual(g.tableActions,[null,null,null]);
 g.seats[0].hand=cards([3,6,9]);g.seats[1].hand=cards([4,7]);g.seats[2].hand=cards([5,8]);
 play(g,0,cards([3]));play(g,1,cards([4]));play(g,2,cards([5]));
 assert.equal(g.tableActions![0],null);assert.equal(view(g,'a').tableActions[1]?.kind,'play');assert.equal(g.last?.seat,2);
 play(g,0,[]);assert.deepEqual(g.tableActions![0],{kind:'pass'});assert.equal(g.tableActions![1],null);
 play(g,1,[]);assert.equal(g.turn,2);assert.equal(g.last,null);assert.deepEqual(g.tableActions,[null,null,null]);
 play(g,2,cards([8]));assert.equal(g.phase,'finished');assert.deepEqual(view(g,'a').tableActions![2],{kind:'play',cards:cards([8]),label:'单张'});
 deal(g);assert.deepEqual(g.tableActions,[null,null,null]);
});
test('legacy seat display recovery uses only confirmed public cards; timeout uses the same display transitions',()=>{
 const g=game();g.turn=0;bid(g,0,3);g.seats[0].hand=cards([3,4]);play(g,0,cards([3]));delete g.tableActions;g.seats[2].last='不出';
 const publicView=view(g,'a');assert.deepEqual(publicView.tableActions,[{kind:'play',cards:cards([3]),label:'单张'},null,{kind:'pass'}]);assert.deepEqual(publicView.seats[1].hand,[]);
 const displayed=publicView.tableActions[0];if(displayed?.kind==='play')displayed.cards.push(53);assert.deepEqual(g.last!.cards,cards([3]));
 timeout(g,g.deadline);assert.deepEqual(g.tableActions![1],{kind:'pass'});timeout(g,g.deadline);assert.deepEqual(g.tableActions,[null,null,null]);
});
