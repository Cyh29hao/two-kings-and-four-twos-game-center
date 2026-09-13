import {tileLabel,tileType} from '@/lib/mahjong/engine';
import {typeName} from '@/lib/mahjong/solver';
import {tileFaceSrc} from '@/lib/mahjong/art';
export function MahjongTile({tile,hidden=false,small=false,selected=false,onClick,drawn=false,wildcard=-1,represented=false}:{tile?:number;hidden?:boolean;small?:boolean;selected?:boolean;onClick?:()=>void;drawn?:boolean;wildcard?:number;represented?:boolean}){
 const type=tile===undefined?0:tileType(tile),suit=Math.floor(type/9),honor=type>=27;
 const wild=!hidden&&(represented||type===wildcard),white=!hidden&&type===33&&wildcard>=0&&!represented;
 const content=<><img className="mj-face" src={hidden?'/tiles/Back.svg':tileFaceSrc(type)} alt="" draggable={false}/>{wild&&<em className="tile-mark">赖</em>}{white&&<em className="tile-white-as">{typeName(wildcard)}</em>}</>;
 const className=`mj-tile suit-${honor?type>=31?4:3:suit} ${hidden?'is-back':''} ${small?'is-small':''} ${selected?'is-selected':''} ${drawn?'is-drawn':''} ${wild?'is-wild':''} ${white?'is-white-as':''}`;
 const label=hidden?'牌背':`${tileLabel(tile!)}${wild?'（赖子）':white?'，代 '+typeName(wildcard):''}`;
 return onClick?<button type="button" className={className} onClick={onClick} aria-label={label} aria-pressed={selected}>{content}</button>:<span className={className} aria-label={label}>{content}</span>;
}
