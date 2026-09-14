import {Card} from './poker-table';
import {MahjongTile} from './mahjong-tile';

export function PokerSeatHand({hand,name}:{hand:number[];name:string}){
 return <div className="seat-final-hand" aria-label={`${name}本局剩余手牌`}><span className="seat-final-label">剩余手牌 · {hand.length} 张</span>{hand.length?<div className="round-poker-cards">{hand.map(c=><Card card={c} key={c} small/>)}</div>:<p className="round-hands-empty">已出完全部手牌</p>}</div>;
}
export function MahjongSeatHand({hand,name,wildcard}:{hand:number[];name:string;wildcard:number}){
 return <div className="seat-final-hand" aria-label={`${name}本局手牌`}><span className="seat-final-label">本局手牌 · {hand.length} 张</span><div className="round-tiles">{hand.map(t=><MahjongTile tile={t} small key={t} wildcard={wildcard}/>)}</div></div>;
}
