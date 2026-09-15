import type {Practice} from '../practice/types.ts';
import {beats,classify,face,hints,rank,sorted,type Combo,type Seat,type TableAction} from './engine.ts';
import {DDZ_EFFECTS,emitVisual,publicVisuals,type VisualEvent} from '../motion/events.ts';

export type V3Equipment={instanceId:string;id:string;level:1|2|3|4;price:string};
export type V3Offer={offerId:string;id:string;level:1|2|3|4;price:string;bought:boolean};
export type V3Shop={offers:V3Offer[]};
export type LandlordV3Rules={id:'landlord-v3';equipmentCatalog:{id:string;level:1|2|3|4;price:string;name:string}[]};
export const V3_EQUIPMENT_CATALOG=([1,2,3,4] as const).map(level=>({id:`test-equipment-${level}`,level,price:String(2**(level-1)),name:`${level} 级测试装备`}));
export const DEFAULT_LANDLORD_V3_RULES:LandlordV3Rules={id:'landlord-v3',equipmentCatalog:V3_EQUIPMENT_CATALOG.map(x=>({...x}))};
export type V3Game={
 kind:'landlord-v3';rules:LandlordV3Rules;visualEvents?:VisualEvent[];practice?:Practice;
 phase:'waiting'|'shopping'|'bidding'|'playing'|'finished'|'closed';seats:Seat[];host:string;bottom:number[];turn:number;landlord:number;dealer:number;
 bid:string;stake:string;initialPasses:number;bidPasses:number;passes:number;last:{seat:number;cards:number[];combo:Combo}|null;tableActions:(TableAction|null)[];
 deadline:number;seconds:number;round:string;roundNumber:number;suddenDeath:boolean;winner:number;champion:number;victoryPoints:string[];coins:string[];equipment:V3Equipment[][];shops:V3Shop[];
 firstFinisher:number;deltas:number[];log:{text:string;at:number}[];roundHistory:{round:number;suddenDeath:boolean;winner:number;landlord:number;victoryPoints:string[];coins:string[]}[];
};
const coin=(value:string)=>BigInt(value);
const setCoin=(g:V3Game,seat:number,value:bigint)=>{if(value<0n)throw Error('金币不能为负数');g.coins[seat]=value.toString();};
const addCoin=(g:V3Game,seat:number,value:bigint)=>setCoin(g,seat,coin(g.coins[seat])+value);
const note=(g:V3Game,text:string,now:number)=>{g.log.push({text,at:now});g.log=g.log.slice(-250);};
const random=(n:number)=>{const max=Math.floor(0x100000000/n)*n;let value=0;do{value=crypto.getRandomValues(new Uint32Array(1))[0];}while(value>=max);return value%n;};
const shuffledDeck=()=>{const deck=Array.from({length:54},(_,i)=>i);for(let i=53;i>0;i--){const j=random(i+1);[deck[i],deck[j]]=[deck[j],deck[i]];}return deck;};
const next=(seat:number)=>(seat+1)%3;
const actions=(g:V3Game)=>g.tableActions.map(action=>action?.kind==='play'?{...action,cards:[...action.cards]}:action);

export function isLandlordV3(g:unknown):g is V3Game{return !!g&&typeof g==='object'&&(g as {kind?:unknown}).kind==='landlord-v3';}
export function newLandlordV3(host:string,name:string,seconds=30):V3Game{return{kind:'landlord-v3',rules:{id:'landlord-v3',equipmentCatalog:V3_EQUIPMENT_CATALOG.map(x=>({...x}))},phase:'waiting',seats:[{id:host,name,hand:[],ready:false,plays:0,last:''}],host,bottom:[],turn:0,landlord:-1,dealer:-1,bid:'0',stake:'0',initialPasses:0,bidPasses:0,passes:0,last:null,tableActions:[],deadline:0,seconds,round:'',roundNumber:0,suddenDeath:false,winner:-1,champion:-1,victoryPoints:['0','0','0'],coins:['2','2','2'],equipment:[[],[],[]],shops:[{offers:[]},{offers:[]},{offers:[]}],firstFinisher:-1,deltas:[0,0,0],log:[],roundHistory:[]};}

function refreshShops(g:V3Game){g.shops=g.seats.map((_,seat)=>({offers:g.rules.equipmentCatalog.flatMap(item=>Array.from({length:3},(_,slot)=>({offerId:`${g.round}:${seat}:${item.level}:${slot}`,id:item.id,level:item.level,price:item.price,bought:false})))}));}
function startRound(g:V3Game,now:number){
 if(g.seats.length!==3)throw Error('需要三人入座');
 g.roundNumber++;g.suddenDeath=g.roundNumber===13;g.dealer=g.dealer<0?random(3):next(g.dealer);g.round=crypto.randomUUID();g.winner=-1;g.landlord=-1;g.bid='0';g.stake='0';g.initialPasses=0;g.bidPasses=0;g.passes=0;g.last=null;g.firstFinisher=-1;g.tableActions=[null,null,null];g.deltas=[0,0,0];g.visualEvents=[];g.log=[];
 const deck=shuffledDeck(),cardsEach=g.suddenDeath?18:17;
 g.seats.forEach((seat,index)=>{seat.hand=sorted(deck.slice(index*cardsEach,index*cardsEach+cardsEach));seat.plays=0;seat.last='';seat.ready=false;});
 g.bottom=g.suddenDeath?[]:deck.slice(51);g.turn=g.dealer;g.deadline=now+g.seconds*1000;
 if(g.suddenDeath){g.phase='playing';note(g,'第 13 局突然死亡开始：三人各自为战',now);}else{refreshShops(g);g.phase='shopping';note(g,`第 ${g.roundNumber} 局商店已刷新`,now);}
}
export function readyV3(g:V3Game,seat:number,now=Date.now()){
 if(!['waiting','finished'].includes(g.phase))throw Error('对局中不能修改准备状态');if(g.champion>=0)throw Error('本桌赛制已经结束');
 g.seats[seat].ready=!g.seats[seat].ready;
 if(g.seats.length===3&&g.seats.every(player=>player.ready))startRound(g,now);
}
export function finishShopping(g:V3Game,seat:number,now=Date.now()){
 if(g.phase!=='shopping')throw Error('当前不在商店阶段');if(g.seats[seat].last==='商店完成')throw Error('你已经完成购买');g.seats[seat].last='商店完成';note(g,`${g.seats[seat].name} 完成商店`,now);
 if(g.seats.every(player=>player.last==='商店完成')){g.phase='bidding';g.turn=g.dealer;g.seats.forEach(player=>player.last='');g.tableActions=[null,null,null];g.deadline=now+g.seconds*1000;note(g,`${g.seats[g.dealer].name} 先叫地主`,now);}
}
export function buyV3Equipment(g:V3Game,seat:number,offerId:unknown,now=Date.now()){
 if(g.phase!=='shopping')throw Error('只能在商店阶段购买装备');if(typeof offerId!=='string')throw Error('装备选择无效');const offer=g.shops[seat]?.offers.find(x=>x.offerId===offerId);if(!offer||offer.bought)throw Error('该装备不可购买');if(g.equipment[seat].length>=8)throw Error('最多持有 8 件装备');const price=coin(offer.price);if(coin(g.coins[seat])<price)throw Error('金币不足');
 setCoin(g,seat,coin(g.coins[seat])-price);offer.bought=true;g.equipment[seat].push({instanceId:crypto.randomUUID(),id:offer.id,level:offer.level,price:offer.price});note(g,`${g.seats[seat].name} 购买 ${offer.level} 级测试装备`,now);
}
export function sellV3Equipment(g:V3Game,seat:number,instanceId:unknown,now=Date.now()){
 if(typeof instanceId!=='string')throw Error('装备选择无效');const index=g.equipment[seat].findIndex(item=>item.instanceId===instanceId);if(index<0)throw Error('没有这件装备');const [item]=g.equipment[seat].splice(index,1),refund=item.level===1?0n:coin(item.price)/2n;addCoin(g,seat,refund);note(g,`${g.seats[seat].name} 出售 ${item.level} 级测试装备`,now);
}
function appointLandlord(g:V3Game,seat:number,stake:bigint,now:number,forced=false){
 g.landlord=seat;g.stake=stake.toString();g.bid=stake.toString();g.phase='playing';g.turn=seat;g.seats[seat].hand=sorted([...g.seats[seat].hand,...g.bottom]);g.seats.forEach(player=>player.last='');g.tableActions=[null,null,null];g.deadline=now+g.seconds*1000;note(g,`${g.seats[seat].name}${forced?'被指定':'成为'}地主${stake?`，托管 ${stake} 金币`:''}`,now);
}
function forceLandlord(g:V3Game,now:number){
 const amounts=g.coins.map(coin),maximum=amounts.reduce((a,b)=>a>b?a:b,0n);if(maximum===0n){appointLandlord(g,g.dealer,0n,now,true);return;}
 const seat=[0,1,2].map(offset=>(g.dealer+offset)%3).find(index=>amounts[index]===maximum)!;setCoin(g,seat,amounts[seat]-1n);appointLandlord(g,seat,1n,now,true);
}
export function bidV3(g:V3Game,seat:number,call:unknown,now=Date.now()){
 if(g.phase!=='bidding'||g.turn!==seat)throw Error('还没轮到你叫地主');if(typeof call!=='boolean')throw Error('叫地主选择无效');const a=actions(g);a[seat]={kind:'bid',value:call?1:0};g.tableActions=a;
 if(!call){g.seats[seat].last='不叫';note(g,`${g.seats[seat].name} 不叫`,now);if(g.landlord<0){g.initialPasses++;if(g.initialPasses===3){forceLandlord(g,now);return;}}else{g.bidPasses++;if(g.bidPasses===2){appointLandlord(g,g.landlord,coin(g.stake),now);return;}}g.turn=next(seat);g.tableActions[g.turn]=null;g.deadline=now+g.seconds*1000;return;}
 const stake=coin(g.stake)+1n;if(coin(g.coins[seat])<stake)throw Error('可用金币不足，不能叫/抢地主');if(g.landlord>=0)addCoin(g,g.landlord,coin(g.stake));setCoin(g,seat,coin(g.coins[seat])-stake);g.landlord=seat;g.stake=stake.toString();g.bid=stake.toString();g.bidPasses=0;g.seats[seat].last=`下注 ${stake}`;note(g,`${g.seats[seat].name} 抢地主，托管 ${stake} 金币`,now);g.turn=next(seat);g.tableActions[g.turn]=null;g.deadline=now+g.seconds*1000;
}
function settleV3(g:V3Game,winner:number,now:number){
 const landlordWon=winner===g.landlord,stake=coin(g.stake),farmers=[0,1,2].filter(index=>index!==g.landlord);
 if(landlordWon){addCoin(g,g.landlord,stake);let payments:[bigint,bigint];if(stake%2n===0n)payments=[stake/2n+1n,stake/2n+1n];else{const low=stake/2n+1n,high=(stake+1n)/2n+1n;const [first,second]=farmers;if(g.seats[first].hand.length<g.seats[second].hand.length)payments=[low,high];else if(g.seats[first].hand.length>g.seats[second].hand.length)payments=[high,low];else{const highSeat=[0,1,2].map(offset=>(g.dealer+offset)%3).find(index=>farmers.includes(index))!;payments=highSeat===first?[high,low]:[low,high];}}
  farmers.forEach((farmer,index)=>{const paid=coin(g.coins[farmer])<payments[index]?coin(g.coins[farmer]):payments[index];setCoin(g,farmer,coin(g.coins[farmer])-paid);addCoin(g,g.landlord,paid);});
 }else{const first=stake/2n,second=stake-first;const high=stake%2n===1n?g.firstFinisher:-1;farmers.forEach(farmer=>addCoin(g,farmer,farmer===high?second:first));}
 g.seats.forEach((_,index)=>addCoin(g,index,1n));addCoin(g,g.firstFinisher,1n);
 const points=g.victoryPoints.map(Number);if(landlordWon)points[g.landlord]+=1;else farmers.forEach(farmer=>points[farmer]+=.5);g.victoryPoints=points.map(value=>String(value));
 const reached=points.map((value,index)=>value>=4?index:-1).filter(index=>index>=0);if(reached.length){g.champion=reached.length===1?reached[0]:g.firstFinisher;note(g,`${g.seats[g.champion].name} 达到 4 胜利点，获得整桌胜利`,now);}else if(g.roundNumber===12){const lowest=Math.min(...points);points.forEach((value,index)=>{if(value===lowest)addCoin(g,index,8n);});note(g,'12 局结束，最低胜利点玩家获得 8 金币，进入突然死亡',now);}
}
function finishSuddenDeath(g:V3Game,winner:number,now:number){g.champion=winner;note(g,`${g.seats[winner].name} 首位出完牌，获得整桌胜利`,now);}
function endRound(g:V3Game,winner:number,now:number){g.winner=winner;g.phase='finished';g.deadline=0;g.deltas=[0,0,0];if(g.suddenDeath)finishSuddenDeath(g,winner,now);else settleV3(g,winner,now);g.roundHistory.push({round:g.roundNumber,suddenDeath:g.suddenDeath,winner,landlord:g.landlord,victoryPoints:[...g.victoryPoints],coins:[...g.coins]});}
export function playV3(g:V3Game,seat:number,cards:number[],now=Date.now()){
 if(g.phase!=='playing'||g.turn!==seat)throw Error('还没轮到你出牌');const player=g.seats[seat],a=actions(g);
 if(!cards.length){if(!g.last||g.last.seat===seat)throw Error('新一轮必须出牌');player.last='不出';a[seat]={kind:'pass'};g.passes++;if(g.passes===2){g.turn=g.last.seat;g.last=null;g.passes=0;g.seats.forEach(item=>item.last='');a.fill(null);}else g.turn=next(seat);}else{if(cards.some(card=>!player.hand.includes(card)))throw Error('只能出自己手中的牌');const combo=classify(cards);if(!combo)throw Error('这些牌不能组成合法牌型');if(!beats(combo,g.last?.combo??null))throw Error('需要出相同牌型中更大的牌，或使用炸弹');player.hand=player.hand.filter(card=>!cards.includes(card));player.plays++;player.last=combo.kind;a[seat]={kind:'play',cards:sorted(cards),label:combo.kind,...(DDZ_EFFECTS[combo.kind]?{eventId:emitVisual(g,seat,DDZ_EFFECTS[combo.kind],now)}:{})};g.last={seat,cards:sorted(cards),combo};g.passes=0;note(g,`${player.name}：${combo.kind} ${sorted(cards).map(face).join(' ')}`,now);if(!player.hand.length){g.firstFinisher=seat;endRound(g,seat,now);g.tableActions=a;return;}g.turn=next(seat);}
 a[g.turn]=null;g.tableActions=a;g.deadline=now+g.seconds*1000;
}
export function timeoutV3(g:V3Game,now=Date.now()){if(g.deadline>now||!['shopping','bidding','playing'].includes(g.phase))return false;if(g.phase==='shopping'){for(let seat=0;seat<3;seat++)if(g.seats[seat].last!=='商店完成')finishShopping(g,seat,now);return true;}if(g.phase==='bidding')bidV3(g,g.turn,false,now);else playV3(g,g.turn,g.last?[]:[sorted(g.seats[g.turn].hand).at(-1)!],now);return true;}
export function v3BotAction(g:V3Game,seat:number,now=Date.now()){
 if(g.phase==='shopping'){for(const offer of g.shops[seat].offers)if(!offer.bought&&coin(g.coins[seat])>=coin(offer.price)&&g.equipment[seat].length<8)buyV3Equipment(g,seat,offer.offerId,now);finishShopping(g,seat,now);return;}
 if(g.phase==='bidding'){bidV3(g,seat,coin(g.coins[seat])>coin(g.stake),now);return;}
 const options=hints(g.seats[seat].hand,g.last?.combo??null);playV3(g,seat,options.length?options[0]:[],now);
}
export function viewV3(g:V3Game,id:string){const own=g.seats.findIndex(seat=>seat.id===id);return {...g,visualEvents:publicVisuals(g),tableActions:actions(g),shops:g.shops.map((shop,index)=>index===own?{offers:shop.offers.map(offer=>({...offer}))}:{offers:[]}),equipment:g.equipment.map((items,index)=>index===own?items.map(item=>({...item})):[]),seats:g.seats.map(seat=>({...seat,count:seat.hand.length,hand:seat.id===id||g.phase==='finished'?seat.hand:[]}))};}
