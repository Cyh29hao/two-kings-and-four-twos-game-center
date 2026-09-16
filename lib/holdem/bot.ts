import {evaluate,pokerRank} from './evaluate.ts';
import {holdemBetStep,holdemView,moveHoldem,type HoldemGame,type HoldemView,type HoldemMove} from './engine.ts';
function sample(max:number){return crypto.getRandomValues(new Uint32Array(1))[0]%max;}
/** Receives exactly a player's public view, never the deck or opponents' hole cards. */
export function holdemDecision(v:HoldemView,id:string):HoldemMove{
 const me=v.seats.find(s=>s.id===id)!,o=v.options;if(!o.acting)throw Error('机器人未轮到行动');
 const rivals=v.seats.filter(s=>s.id!==id&&!s.folded).length,known=new Set([...me.hand,...v.board]);let equity=0;
 const pack=Array.from({length:52},(_,i)=>i).filter(c=>!known.has(c));
 for(let trial=0;trial<32;trial++){
  const remaining=[...pack],draw=()=>{const i=sample(remaining.length);return remaining.splice(i,1)[0];},board=[...v.board];while(board.length<5)board.push(draw());
  const ours=evaluate([...board,...me.hand]).score;let tied=1,won=true;for(let r=0;r<rivals;r++){const theirs=evaluate([...board,draw(),draw()]).score;if(theirs>ours)won=false;else if(theirs===ours)tied++;}if(won)equity+=1/tied;
 }equity/=32;
 const call=Number(o.call),pot=Number(v.pot),stack=Number(me.stack),big=Number(v.rules.big),odds=call/(pot+call||1),position=(v.seats.findIndex(s=>s.id===id)-v.button+v.seats.length)%v.seats.length;
 if(!v.board.length){const r=me.hand.map(pokerRank);if(r[0]===r[1]&&r[0]>=11)equity=Math.max(equity,.63);}
 const aggression=equity>Math.max(.57,1/(rivals+1)+.24)||o.check&&position===0&&sample(100)<9;
 if(o.canRaise&&aggression){let target=BigInt(Math.floor(Number(me.bet)+call+Math.max(big,pot*(equity>.78?.85:.55))));if(target<BigInt(o.minRaise))target=BigInt(o.minRaise);const step=BigInt(holdemBetStep(v.rules));target=(target+step-1n)/step*step;if(target>BigInt(o.maxRaise))target=BigInt(o.maxRaise)/step*step;return{action:'raise',amount:target.toString()};}
 if(o.check)return{action:'check'};
 if(equity>odds+.035&&(call<stack*.35||equity>.56)||call<=big&&equity>.2)return{action:'call'};
 return{action:'fold'};
}
export function advanceHoldemBot(g:HoldemGame,now=Date.now()){
 if(g.phase!=='playing'||!g.seats[g.turn]?.bot||g.deadline>now)return false;const id=g.seats[g.turn].id;moveHoldem(g,id,holdemDecision(holdemView(g,id),id),now);return true;
}
