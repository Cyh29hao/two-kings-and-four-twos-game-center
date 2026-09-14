// Physical IDs match the site's poker art: 0..47 are 3..A; 48..51 are 2.
export const pokerRank=(c:number)=>Math.floor(c/4)===12?2:Math.floor(c/4)+3;
export const HAND_NAMES=['高牌','一对','两对','三条','顺子','同花','葫芦','四条','同花顺'] as const;
export type HandValue={category:number;name:string;score:number;cards:number[];ranks:number[]};
function value(cards:number[]):HandValue{
 const ranks=cards.map(pokerRank).sort((a,b)=>b-a),counts=new Map<number,number>();for(const r of ranks)counts.set(r,(counts.get(r)||0)+1);
 const groups=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]),flush=cards.every(c=>c%4===cards[0]%4),unique=[...new Set(ranks)];
 const straight=unique.length===5?(unique[0]-unique[4]===4?unique[0]:unique.join(',')==='14,5,4,3,2'?5:0):0;
 let category=0,key=ranks;
 if(flush&&straight){category=8;key=[straight];}
 else if(groups[0][1]===4){category=7;key=groups.map(x=>x[0]);}
 else if(groups[0][1]===3&&groups[1][1]===2){category=6;key=groups.map(x=>x[0]);}
 else if(flush){category=5;}
 else if(straight){category=4;key=[straight];}
 else if(groups[0][1]===3){category=3;key=groups.map(x=>x[0]);}
 else if(groups[0][1]===2&&groups[1][1]===2){category=2;key=groups.map(x=>x[0]);}
 else if(groups[0][1]===2){category=1;key=groups.map(x=>x[0]);}
 let score=category;for(let i=0;i<5;i++)score=score*15+(key[i]||0);
 return {category,name:category===8&&straight===14?'皇家同花顺':HAND_NAMES[category],score,cards:[...cards],ranks:key};
}
/** Best five of five, six or seven. Suits never break a tie. */
export function evaluate(cards:number[]):HandValue{
 if(cards.length<5||cards.length>7||new Set(cards).size!==cards.length||cards.some(c=>!Number.isInteger(c)||c<0||c>=52))throw Error('无效的德州牌张');
 let best:HandValue|null=null;for(let a=0;a<cards.length-4;a++)for(let b=a+1;b<cards.length-3;b++)for(let c=b+1;c<cards.length-2;c++)for(let d=c+1;d<cards.length-1;d++)for(let e=d+1;e<cards.length;e++){
  const v=value([cards[a],cards[b],cards[c],cards[d],cards[e]]);if(!best||v.score>best.score)best=v;
 }return best!;
}
