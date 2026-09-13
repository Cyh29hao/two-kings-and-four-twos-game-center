import {classify,hints,rank} from '../game/engine.ts';

/** Policy input contains own cards and public information only. */
export type LandlordInformation={hand:number[];phase:'bidding'|'playing';bid:number;last:ReturnType<typeof classify>;lastIsTeammate:boolean;nextOpponentCount:number;opponentMinimum:number};
const counts=(hand:number[])=>Array.from({length:15},(_,i)=>hand.filter(c=>rank(c)===i+3).length);
function cards(count:number[]){return count.flatMap((n,i)=>Array.from({length:n},(_,j)=>i<13?i*4+j:i===13?52:53));}

/** Bounded rank-count partition search, sharing its cache across all candidate moves. */
function partitioner(){
 const memo=new Map<string,number>();let budget=1200;
 function greedy(cs:number[]){let left=cs,n=0;while(left.length){const best=hints(left,null).sort((a,b)=>b.length-a.length||rank(a[0])-rank(b[0]))[0];left=left.filter(c=>!best.includes(c));n++;}return n;}
 function turns(ns:number[]):number{
  if(!ns.some(Boolean))return 0;const key=ns.join(''),known=memo.get(key);if(known!==undefined)return known;
  const hand=cards(ns);if(budget--<=0)return greedy(hand);
  let best=greedy(hand);if(best===1){memo.set(key,1);return 1;}
  const anchor=ns.findIndex(Boolean)+3;
  // Every partition has one group containing the lowest remaining rank.
  for(const move of hints(hand,null).filter(m=>m.some(c=>rank(c)===anchor)).sort((a,b)=>b.length-a.length)){
   const rest=[...ns];for(const c of move)rest[rank(c)-3]--;best=Math.min(best,1+turns(rest));if(best===2||budget<=0)break;
  }memo.set(key,best);return best;
 }return turns;
}
export function landlordDecision(info:LandlordInformation):{action:'bid';value:number}|{action:'play';cards:number[]}|{action:'pass'}{
 const {hand}=info,ns=counts(hand),turns=partitioner();
 if(info.phase==='bidding'){
  const control=ns[14]*2.5+ns[13]*1.5+ns[12]*.9+ns.filter(n=>n===4).length*2.5;
  const shape=turns(ns),want=control>=5.5&&shape<=7?3:control>=3.5&&shape<=8?2:1;
  return {action:'bid',value:want>info.bid?want:0};
 }
 const options=hints(hand,info.last);const finish=options.find(cs=>cs.length===hand.length);if(finish)return {action:'play',cards:finish};
 if(!options.length||info.lastIsTeammate)return {action:'pass'};
 const regular=options.filter(cs=>!['炸弹','王炸'].includes(classify(cs)!.kind));
 if(info.last&&!regular.length&&info.opponentMinimum>4&&hand.length>6)return {action:'pass'};
 // Block the next opponent's last single instead of feeding it a small card.
 if(info.nextOpponentCount===1&&(!info.last||info.last.kind==='单张')){
  const nonSingles=options.filter(cs=>cs.length>1&&!['炸弹','王炸'].includes(classify(cs)!.kind));
  if(!nonSingles.length){const singles=options.filter(cs=>cs.length===1).sort((a,b)=>rank(b[0])-rank(a[0]));if(singles.length)return {action:'play',cards:singles[0]};}
 }
 let best=options[0],bestScore=Infinity;
 for(const cs of [...options].sort((a,b)=>b.length-a.length)){
  const remaining=[...ns];for(const c of cs)remaining[rank(c)-3]--;const combo=classify(cs)!;
  const bomb=['炸弹','王炸'].includes(combo.kind),splitBomb=ns.some((n,i)=>n===4&&remaining[i]>0&&remaining[i]<4);
  const score=turns(remaining)*100+(hand.length-cs.length)*1.5+cs.reduce((n,c)=>n+Math.max(0,rank(c)-13)*4,0)+(bomb?25:0)+(splitBomb?22:0)+combo.rank*.2;
  if(score<bestScore||(score===bestScore&&cs.join(',')<best.join(','))){best=cs;bestScore=score;}
 }return {action:'play',cards:best};
}
