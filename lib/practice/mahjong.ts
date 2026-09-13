import {canWin,effectiveType,isWild,winPlans,type WinContext} from '../mahjong/solver.ts';
import {isWinning,type Meld,type Option} from '../mahjong/engine.ts';
import type {ModernMove} from '../mahjong/modern.ts';

export type MahjongInformation={hand:number[];melds:Meld[];wildcard:number;remaining:number;visible:number[];river:number[];options:{canHu:boolean;canPass:boolean;claims:Option[];kongs:Option[]};pending:{tile:number;from:number}|null};
const orphans=[0,8,9,17,18,26,27,28,29,30,31,32,33];
/** Structural distance is an estimate for wildcards; actual winning draws use the complete rule solver. */
function distanceEvaluator(){
 const cache=new Map<string,number>();
 return function distance(hand:number[],open:number,wildcard:number){
  const ns=Array<number>(34).fill(0);let wild=0;for(const t of hand){if(isWild(t,wildcard))wild++;else ns[effectiveType(t,wildcard)]++;}
  const key=ns.join('')+':'+open+':'+wild;if(cache.has(key))return cache.get(key)!;
  let best=8;const visited=new Set<string>();
  function search(start:number,m:number,t:number,p:number){
   while(start<34&&!ns[start])start++;
   if(start===34){best=Math.min(best,8-2*(open+m)-Math.min(t,4-open-m)-p);return;}
   const k=ns.slice(start).join('')+':'+start+':'+m+':'+t+':'+p;if(visited.has(k))return;visited.add(k);
   const n=start;
   if(open+m<4){if(ns[n]>=3){ns[n]-=3;search(n,m+1,t,p);ns[n]+=3;}if(n<27&&n%9<=6&&ns[n+1]&&ns[n+2]){ns[n]--;ns[n+1]--;ns[n+2]--;search(n,m+1,t,p);ns[n]++;ns[n+1]++;ns[n+2]++;}}
   if(ns[n]>=2){ns[n]-=2;if(!p)search(n,m,t,1);if(open+m+t<4)search(n,m,t+1,p);ns[n]+=2;}
   if(n<27&&open+m+t<4)for(const gap of [1,2])if(n%9+gap<9&&ns[n+gap]){ns[n]--;ns[n+gap]--;search(n,m,t+1,p);ns[n]++;ns[n+gap]++;}
   ns[n]--;search(n,m,t,p);ns[n]++;
  }search(0,0,0,0);best-=wild;
  if(!open&&wildcard>=0){const pairs=ns.reduce((n,c)=>n+Math.floor(c/2),0),singles=ns.filter(c=>c%2).length;const wildPairs=Math.min(wild,singles)+Math.floor(Math.max(0,wild-singles)/2);best=Math.min(best,6-pairs-wildPairs,13-orphans.filter(t=>ns[t]>0).length-Number(orphans.some(t=>ns[t]>1))-wild);}
  best=Math.max(-1,best);cache.set(key,best);return best;
 };
}
export function mahjongDiscard(info:MahjongInformation){
 const distance=distanceEvaluator(),known=new Set(info.visible),seen=Array<number>(34).fill(0),discarded=Array<number>(34).fill(0);
 for(const tile of known)seen[effectiveType(tile,info.wildcard)]++;for(const t of info.river)discarded[effectiveType(t,info.wildcard)]++;
 const unique=[...new Map(info.hand.map(t=>[Math.floor(t/4),t])).values()];
 const candidates=unique.map(tile=>{const rest=info.hand.filter(t=>t!==tile),d=distance(rest,info.melds.length,info.wildcard);return {tile,rest,d};});
 const min=Math.min(...candidates.map(c=>c.d));let best=candidates[0],bestScore=-Infinity;
 for(const c of candidates){
  if(c.d>min)continue;let outs=0,wins=0;
  for(let type=0;type<34;type++){
   const copies=[0,1,2,3].map(n=>type*4+n).filter(t=>!known.has(t));if(!copies.length)continue;
   const tile=copies[0],hand=[...c.rest,tile],d=distance(hand,info.melds.length,info.wildcard);
   if(d<c.d)outs+=copies.length;
   if(d<=0){const win=info.wildcard>=0?canWin({round:'bot-lookahead',hand,melds:info.melds,wildcard:info.wildcard,incoming:tile,winType:'self',flower:false,heaven:false,earth:false}):isWinning(hand,info.melds.length,false);if(win)wins+=copies.length;}
  }
  const type=effectiveType(c.tile,info.wildcard),risk=Math.max(0,4-seen[type])*(type<27&&type%9>=2&&type%9<=6?1.4:1)-discarded[type]*.3;
  const keepWild=isWild(c.tile,info.wildcard)?-1000:0;
  const score=wins*100+outs*4-risk*(info.remaining<32?2:0.5)+keepWild;
  if(score>bestScore||(score===bestScore&&c.tile>best.tile)){best=c;bestScore=score;}
 }return best.tile;
}
export function mahjongDecision(info:MahjongInformation):ModernMove{
 const o=info.options;if(o.canPass){
  const hu=o.claims.find(c=>c.kind==='hu');if(hu)return {action:'claim',key:hu.key};
  const kong=o.claims.find(c=>c.kind==='kong');if(kong)return {action:'claim',key:kong.key};
  const distance=distanceEvaluator(),before=distance(info.hand,info.melds.length,info.wildcard);
  let best:Option|undefined,bestD=before;
  for(const claim of o.claims.filter(c=>c.kind==='chi'||c.kind==='pong')){
   const rest=info.hand.filter(t=>!claim.tiles.includes(t));const d=Math.min(...rest.map(t=>distance(rest.filter(c=>c!==t),info.melds.length+1,info.wildcard)));
   // Opening a hand costs the closed-hand multiplier, so require real progress.
   if(d<bestD||(d===bestD&&best&&claim.kind==='pong')){best=claim;bestD=d;}
  }return best?{action:'claim',key:best.key}:{action:'pass'};
 }
 if(o.canHu)return {action:'hu'};
 if(o.kongs.length){const distance=distanceEvaluator(),discardDistance=Math.min(...info.hand.map(t=>distance(info.hand.filter(c=>c!==t),info.melds.length,info.wildcard)));
  const kong=o.kongs.find(k=>k.kind==='added'||distance(info.hand.filter(t=>!k.tiles.includes(t)),info.melds.length+1,info.wildcard)<=discardDistance);if(kong)return {action:'kong',key:kong.key};
 }
 return {action:'discard',tile:mahjongDiscard(info)};
}
/** Plan choice cannot consult the wall or prize tiles. */
export function mahjongPlan(ctx:WinContext){const p=winPlans(ctx)[0];if(!p)throw Error('机器人没有可用胡牌方案');return p.id;}
