import {tileLabel,tileType} from '@/lib/mahjong/engine';
export function MahjongTile({tile,hidden=false,small=false,selected=false,onClick,drawn=false}:{tile?:number;hidden?:boolean;small?:boolean;selected?:boolean;onClick?:()=>void;drawn?:boolean}){
 const type=tile===undefined?0:tileType(tile),suit=Math.floor(type/9),honor=type>=27;
 const content=hidden?<span className="mj-tile-back-mark">◇</span>:<><b>{honor?['東','南','西','北','中','發','白'][type-27]:['一','二','三','四','五','六','七','八','九'][type%9]}</b>{!honor&&<span>{['萬','筒','条'][suit]}</span>}</>;
 const className=`mj-tile suit-${honor?type>=31?4:3:suit} ${hidden?'is-back':''} ${small?'is-small':''} ${selected?'is-selected':''} ${drawn?'is-drawn':''}`;
 return onClick?<button type="button" className={className} onClick={onClick} aria-label={tileLabel(tile!)} aria-pressed={selected}>{content}</button>:<span className={className} aria-label={hidden?'牌背':tileLabel(tile!)}>{content}</span>;
}
