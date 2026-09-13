import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newMahjong,newSeat,dealMahjong,isWinning,mahjongOptions,moveMahjong,timeoutMahjong,mahjongView,tileType,tileLabel,type MahjongGame,type Meld} from '../lib/mahjong/engine.ts';
function tiles(types:number[]){const n=Array(34).fill(0);return types.map(t=>{assert(n[t]<4);return t*4+n[t]++;});}
function fixture(hands:number[][],melds:{seat:number;types:number[];kind:Meld['kind'];concealed?:boolean}[]=[]){
 const g=newMahjong('p0','玩家0');g.seats=[0,1,2,3].map(i=>newSeat('p'+i,'玩家'+i));g.phase='playing';g.round='test';g.roundNumber=1;g.deadline=100000;
 const used=new Set<number>();function take(type:number){for(let c=type*4;c<type*4+4;c++)if(!used.has(c)){used.add(c);return c;}throw Error('Fixture exceeds four copies: '+type);}
 for(let i=0;i<4;i++)g.seats[i].hand=(hands[i]||[]).map(take);
 for(const m of melds)g.seats[m.seat].melds.push({kind:m.kind,tiles:m.types.map(take),from:3,concealed:!!m.concealed});
 const rest=Array.from({length:136},(_,i)=>i).filter(t=>!used.has(t));
 for(let i=0;i<4;i++){const s=g.seats[i],length=(i===0?14:13)-s.melds.length*3;while(s.hand.length<length)s.hand.push(rest.shift()!);s.hand.sort((a,b)=>a-b);}
 g.wall=rest;g.drawn=g.seats[0].hand.at(-1)!;return g;
}
function allTiles(g:MahjongGame){return [...g.wall,...g.seats.flatMap(s=>[...s.hand,...s.river,...s.melds.flatMap(m=>m.tiles)])];}
function conserved(g:MahjongGame){const all=allTiles(g);assert.equal(all.length,136);assert.equal(new Set(all).size,136);assert(all.every(t=>Number.isInteger(t)&&t>=0&&t<136));assert.equal(g.deltas.reduce((a,b)=>a+b,0),0);}
function passOthers(g:MahjongGame){while(g.pending){const seat=g.pending.eligible.find(s=>!Object.hasOwn(g.pending!.responses,String(s)));if(seat===undefined)break;moveMahjong(g,seat,{action:'pass'},1);}}

test('winning decomposition: suits, honors, open melds and disabled special hands',()=>{
 assert(isWinning(tiles([0,1,2,9,10,11,18,19,20,27,27,27,31,31])));
 assert(isWinning(tiles([0,0,0,1,1,1,2,2,2,3,3,3,4,4])));
 assert(isWinning(tiles([0,1,2,31,31]),3));
 assert(!isWinning(tiles([0,1,2,9,10,11,18,19,20,27,28,29,31,31])));
 assert(!isWinning(tiles([7,8,9,12,13,14,18,19,20,27,27,27,31,31])));
 const pairs=tiles([0,0,3,3,9,9,12,12,18,18,21,21,31,31]);assert(!isWinning(pairs));assert(isWinning(pairs,0,true));
 assert(!isWinning(Array(14).fill(0)));assert(!isWinning([136]));
});
test('136 unique physical tiles, rotating dealer, concealed information',()=>{
 const g=newMahjong('p0','玩家0');g.seats=[0,1,2,3].map(i=>newSeat('p'+i,'玩家'+i));dealMahjong(g,1);conserved(g);
 assert.deepEqual(g.seats.map(s=>s.hand.length),[14,13,13,13]);assert.equal(g.wall.length,83);
 const v=mahjongView(g,'p1');assert(!('wall' in v));assert.equal(v.drawn,null);assert.equal(v.seats[0].hand.length,0);assert.equal(v.seats[1].hand.length,13);
 dealMahjong(g,2);assert.equal(g.dealer,1);assert.deepEqual(g.seats.map(s=>s.hand.length),[13,14,13,13]);conserved(g);
});
test('only next seat can chi; response priority cannot be won by network speed',()=>{
 const g=fixture([[4],[3,5,4,4],[0,1,2,9,10,11,18,19,20,27,27,27,4],[3,5]]),card=g.seats[0].hand.find(t=>tileType(t)===4)!;
 moveMahjong(g,0,{action:'discard',tile:card},1);const p=mahjongOptions(g,1),winner=mahjongOptions(g,2);
 assert(p.claims.some(o=>o.kind==='chi'));assert(!mahjongOptions(g,3).claims.some(o=>o.kind==='chi'));
 assert(winner.claims.some(o=>o.kind==='hu'));moveMahjong(g,1,{action:'claim',key:p.claims.find(o=>o.kind==='pong')!.key},2);assert.equal(g.phase,'playing');
 assert.throws(()=>moveMahjong(g,1,{action:'pass'},2));moveMahjong(g,2,{action:'claim',key:'hu:'},3);passOthers(g);
 assert.equal(g.phase,'finished');assert.equal(g.winner,2);assert.deepEqual(g.deltas,[-1,0,1,0]);assert(!g.seats[0].river.includes(card));conserved(g);
});
test('honors cannot chi and invalid tile / out-of-turn moves are rejected',()=>{
 const g=fixture([[28],[27,29],[],[]]);const card=g.seats[0].hand.find(t=>tileType(t)===28)!;
 assert.throws(()=>moveMahjong(g,1,{action:'discard',tile:g.seats[1].hand[0]},1));assert.throws(()=>moveMahjong(g,0,{action:'discard',tile:g.wall[0]},1));
 moveMahjong(g,0,{action:'discard',tile:card},1);assert(!mahjongOptions(g,1).claims.some(o=>o.kind==='chi'));conserved(g);
});
test('concealed kong hides face from other players and takes replacement from tail',()=>{
 const g=fixture([[4,4,4,4],[],[],[]]),tail=g.wall.at(-1)!;
 const k=mahjongOptions(g,0).kongs.find(o=>o.kind==='concealed'&&tileType(o.tiles[0])===4)!;assert(k);
 moveMahjong(g,0,{action:'kong',key:k.key},1);assert.equal(g.drawn,tail);assert.equal(g.seats[0].hand.length,11);
 assert.equal(mahjongView(g,'p1').seats[0].melds[0].tiles.length,0);assert.equal(mahjongView(g,'p0').seats[0].melds[0].tiles.length,4);conserved(g);
});
test('added kong can be robbed; declined rob completes kong atomically',()=>{
 const make=()=>fixture([[4],[0,1,2,9,10,11,18,19,20,27,27,3,5],[],[]],[{seat:0,types:[4,4,4],kind:'pong'}]);
 const g=make(),key=mahjongOptions(g,0).kongs.find(o=>o.kind==='added')!.key;
 moveMahjong(g,0,{action:'kong',key},1);assert.equal(g.pending?.kind,'added');assert(mahjongOptions(g,1).claims.some(o=>o.kind==='hu'));
 moveMahjong(g,1,{action:'claim',key:'hu:'},2);passOthers(g);assert.equal(g.winType,'rob');assert.equal(g.seats[0].melds[0].kind,'pong');assert.deepEqual(g.deltas,[-1,1,0,0]);conserved(g);
 const h=make(),tail=h.wall.at(-1)!;moveMahjong(h,0,{action:'kong',key:mahjongOptions(h,0).kongs.find(o=>o.kind==='added')!.key},1);passOthers(h);assert.equal(h.seats[0].melds[0].kind,'kong');assert.equal(h.drawn,tail);conserved(h);
});
test('self draw is zero sum and all future actions stop after settlement',()=>{
 const g=fixture([[0,1,2,9,10,11,18,19,20,27,27,27,31,31],[],[],[]]);assert(mahjongOptions(g,0).canHu);
 moveMahjong(g,0,{action:'hu'},1);assert.deepEqual(g.deltas,[3,-1,-1,-1]);assert.equal(g.deadline,0);assert.throws(()=>moveMahjong(g,0,{action:'hu'},2));conserved(g);
});
test('200 complete games conserve all tiles, hide hands, and always terminate',()=>{
 let claims=0,kongs=0,wins=0;let seed=90213;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let run=0;run<200;run++){
  const g=newMahjong('p0','玩家0');g.seats=[0,1,2,3].map(i=>newSeat('p'+i,'玩家'+i));dealMahjong(g,1);let turns=0;
  while(g.phase==='playing'){
   assert(++turns<650);conserved(g);
   if(g.pending){const seat=g.pending.eligible.find(s=>!Object.hasOwn(g.pending!.responses,String(s)))!;const o=mahjongOptions(g,seat);const choice=o.claims.find(c=>c.kind==='hu')||(random()>.3?o.claims[Math.floor(random()*o.claims.length)]:null);moveMahjong(g,seat,choice?{action:'claim',key:choice.key}:{action:'pass'},turns);if(choice)claims++;}
   else {const o=mahjongOptions(g,g.turn);if(o.canHu){moveMahjong(g,g.turn,{action:'hu'},turns);wins++;}else if(o.kongs.length){moveMahjong(g,g.turn,{action:'kong',key:o.kongs[0].key},turns);kongs++;}else if(run%7===0){assert(timeoutMahjong(g,g.deadline));}else{const hand=g.seats[g.turn].hand;moveMahjong(g,g.turn,{action:'discard',tile:hand[Math.floor(random()*hand.length)]},turns);}}
   for(let i=0;i<4;i++){const v=mahjongView(g,'p'+i);assert(!('wall' in v));if((g.phase as string)!=='finished'){assert(v.seats.every((s,j)=>j===i||s.hand.length===0));assert(!v.pending||!('responses' in v.pending));}}
  }
  conserved(g);assert.equal(g.phase,'finished');assert(['self','discard','rob','draw'].includes(g.winType!));
 }
 assert(claims>100);assert(kongs>0);console.log({randomGames:200,claims,kongs,selfDraws:wins});
});
