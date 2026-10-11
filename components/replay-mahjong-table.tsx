"use client";

import {useEffect,useRef,useState,type CSSProperties} from 'react';
import type {ChatBubble} from '@/lib/chat-bubbles';
import type {ReplayFrame} from '@/lib/replay/types';
import type {MahjongView} from '@/lib/mahjong/game';
import {getMahjongLayout} from '@/lib/mahjong/layout';
import {BASIC_136,HAM,MODERN_PRESETS} from '@/lib/mahjong/rules';
import {typeName} from '@/lib/mahjong/solver';
import {chips} from '@/lib/mahjong/report';
import {MahjongMelds,MahjongSurface} from './mahjong-board';
import {MahjongTile} from './mahjong-tile';
import {Button} from './ui/button';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from './ui/dialog';
import '@/app/mahjong/table.css';
import '@/app/replay-mahjong.css';

type MahjongScene=ReplayFrame['scene']&{
 mahjong?:{
  round?:string;roundNumber?:number;remaining?:number;drawn?:number|null;
  pending?:{kind:string;from:number;tile:number}|null;winType?:string;
  deltas?:Array<string|number>;rulesId?:string;rulesName?:string;schemaVersion?:number;
 };
};
type MahjongSeat=MahjongScene['seats'][number]&{
 id?:string;count?:number;balance?:string|null;ready?:boolean;river?:number[];
 melds?:Array<{kind:string;tiles?:number[];cards?:number[];from?:number;concealed?:boolean}>;
};

/** The snapshot is already settled and authorized by the replay API. This adapter never runs rules. */
export function replayMahjongView(frame:ReplayFrame):MahjongView{
 const scene=frame.scene as MahjongScene,details=scene.mahjong;
 const rules=details?.schemaVersion===1?BASIC_136:MODERN_PRESETS.find(rule=>rule.id===details?.rulesId)??HAM;
 const seats=(scene.seats as MahjongSeat[]).map((seat,index)=>({
  id:seat.id??`replay-seat-${index}`,name:seat.name,bot:!!seat.bot,
  leaving:false,departed:false,ready:seat.ready??false,last:'',
  count:seat.count??seat.hand.length,hand:seat.hand,
  river:seat.river??seat.discards??[],
  balance:seat.balance??seat.chips??null,
  melds:(seat.melds??[]).map(meld=>({kind:meld.kind,tiles:meld.tiles??meld.cards??[],from:meld.from??index,concealed:!!meld.concealed})),
 }));
 const phase=scene.phase==='closed'?'finished':scene.phase;
 return {
  kind:'mahjong',schemaVersion:details?.schemaVersion===1?1:2,
  rules:{...rules,id:details?.rulesId??rules.id,name:details?.rulesName??rules.name},
  phase,host:'',turn:scene.turn??0,dealer:scene.dealer??0,
  round:details?.round??'replay',roundNumber:details?.roundNumber??1,
  seconds:0,deadline:0,remaining:details?.remaining??scene.wallRemaining??0,
  drawn:details?.drawn??null,lastDiscard:scene.lastDiscard??null,pending:details?.pending??null,
  winner:scene.winner??-1,winType:details?.winType??'',source:-1,
  deltas:details?.deltas??[],log:[],options:{},wildcard:scene.wildcard??-1,
  result:null,session:null,entries:[],canChoose:false,awardReveal:null,practice:null,
  visualEvents:[],seats,
 } as unknown as MahjongView;
}

export function ReplayMahjongTable({frame,perspective,bubbles={},onInspect,showResult=false}:{frame:ReplayFrame;perspective:number;bubbles?:Record<string,ChatBubble>;onInspect?:()=>void;showResult?:boolean}){
 const scene=frame.scene as MahjongScene,game=replayMahjongView(frame);
 const seat=Math.max(0,Math.min(game.seats.length-1,perspective));
 const roomElement=useRef<HTMLElement>(null);
 const [layout,setLayout]=useState(()=>getMahjongLayout(1600,900));
 const [layoutReady,setLayoutReady]=useState(false);
 const [inspectOpen,setInspectOpen]=useState(false);
 useEffect(()=>{
  const element=roomElement.current;if(!element)return;
  let tick=0;
  const measure=()=>{cancelAnimationFrame(tick);tick=requestAnimationFrame(()=>{
   const {width,height}=element.getBoundingClientRect();
   setLayout(previous=>previous.viewport.width===width&&previous.viewport.height===height?previous:getMahjongLayout(width,height));
   setLayoutReady(true);
  });};
  const observer=new ResizeObserver(measure);observer.observe(element);measure();
  return()=>{observer.disconnect();cancelAnimationFrame(tick)};
 },[]);
  const [resultChoice,setResultChoice]=useState<{at:number;open:boolean}|null>(null);
  const resultOpen=game.phase==='finished'&&(resultChoice?.at===frame.at?resultChoice.open:showResult);
  const setResultOpen=(open:boolean)=>setResultChoice({at:frame.at,open});
 const handLayout=layout.selfRack,me=game.seats[seat];
 const restingCount=Math.max(0,13-me.melds.length*3);
 const hand=[...me.hand.filter(tile=>tile!==game.drawn),...(game.drawn!==null&&me.hand.includes(game.drawn)?[game.drawn]:[])];
 const drawn=hand.length>restingCount?hand.at(-1):undefined;
 const style={'--hand-w':`${handLayout.tileW}px`,'--hand-h':`${handLayout.tileH}px`,'--mj-selection-lift':`${handLayout.lift}px`,'--actions-y':`${layout.actionsY}px`,'--self-portrait-y':`${layout.actionsY-24}px`,'--message-y':`${layout.camera.cy}px`} as CSSProperties;
 const winner=game.seats[game.winner]?.name;
 const settlement=game.winType==='draw'?'本局流局':game.winType==='aborted'?'本局中止':winner?`${winner}${game.winType==='self'?'自摸':game.winType==='rob'?'抢杠胡':'胡牌'}`:'本局结算';
 return <>
  <main ref={roomElement} className="mj-room mj-immersive table-light replay-mj-table" data-layout={layout.mode} data-phase={game.phase} data-layout-ready={layoutReady} style={style} aria-label="麻将原牌桌回放">
   <div className="mj-table-info"><span>第 {game.roundNumber} 局</span>{game.wildcard>=0&&<div className="mj-wild-info"><MahjongTile tile={game.wildcard*4} wildcard={game.wildcard} small/><div><b>本局赖子</b><small>白板代 {typeName(game.wildcard)}</small></div></div>}</div>
   <MahjongSurface riverTools={null} g={game} seat={seat} layout={layout} bubbles={bubbles} revealHands/>
   <div className="mj-self-rack" style={{left:handLayout.x,top:handLayout.y,width:handLayout.width,height:handLayout.height}} aria-label={`${me.name}的手牌区`}><div className="mj-hand" aria-label={`${me.name}的手牌`}>{hand.map((tile,index)=><div className="mj-hand-slot" key={tile} style={{left:(index%handLayout.columns)*(handLayout.tileW+handLayout.gap)+(drawn===tile?handLayout.drawGap:0),top:Math.floor(index/handLayout.columns)*(handLayout.tileH+handLayout.rowGap)-handLayout.lift,height:handLayout.tileH+handLayout.lift}}><MahjongTile tile={tile} wildcard={game.wildcard} drawn={drawn===tile}/></div>)}</div></div>
   <div className="replay-mj-tools"><Button type="button" variant="outline" onClick={()=>{onInspect?.();setInspectOpen(true)}}>放大查看四家手牌</Button>{game.phase==='finished'&&<Button type="button" variant="outline" onClick={()=>{onInspect?.();setResultOpen(true)}}>查看结算</Button>}</div>
  </main>
  <Dialog open={inspectOpen} onOpenChange={setInspectOpen}><DialogContent className="mj-expanded-modal replay-mj-inspect"><DialogHeader><DialogTitle>本步四家手牌</DialogTitle><DialogDescription>按投稿者当时的座位顺序查看；牌桌仍保留原位明牌。</DialogDescription></DialogHeader><div className="mj-public-overview">{Array.from({length:4},(_,relative)=>{const player=game.seats[(seat+relative)%4];return player?<section key={player.id}><h3>{player.name}{relative===0?' · 投稿视角':''}{game.dealer===(seat+relative)%4?' · 庄':''}</h3><div className="mj-overview-hand" aria-label={`${player.name}的手牌`}>{player.hand.map(tile=><MahjongTile key={tile} tile={tile} small wildcard={game.wildcard}/>)}</div><MahjongMelds s={player} own finished wildcard={game.wildcard}/><div className="mj-overview-river" aria-label={`${player.name}的全部弃牌`}>{player.river.map(tile=><MahjongTile key={tile} tile={tile} small wildcard={game.wildcard}/>)}</div></section>:null})}</div></DialogContent></Dialog>
  <Dialog open={resultOpen} onOpenChange={setResultOpen}><DialogContent className="mj-result-modal"><DialogHeader><DialogTitle>{settlement}</DialogTitle><DialogDescription>四家手牌已在原牌桌明牌展示。</DialogDescription></DialogHeader><strong className="mj-result-own">本局 {game.deltas[seat]!==undefined?chips(game.deltas[seat],true):'已结束'}</strong><div className="mj-result-seats">{game.seats.map((player,index)=><div key={player.id}><span>{player.name}</span><b>{game.deltas[index]!==undefined?chips(game.deltas[index],true):'—'}</b></div>)}</div><Button type="button" variant="outline" onClick={()=>setResultOpen(false)}>收起，查看牌桌</Button></DialogContent></Dialog>
 </>;
}
