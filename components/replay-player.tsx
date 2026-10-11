"use client";

import {useEffect,useState} from 'react';
import {ChevronLeft,ChevronRight,Pause,Play} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/poker-table';
import {HoldemCard} from '@/components/holdem-card';
import {MahjongTile} from '@/components/mahjong-tile';
import type {ReplayFrame,ReplayGame} from '@/lib/replay/types';

export type {ReplayFrame,ReplayGame} from '@/lib/replay/types';

function Cards({cards,game,wildcard}:{cards:number[];game:ReplayGame;wildcard?:number}){
 return <div className="replay-cards">{cards.map((card,i)=>game==='mahjong'?<MahjongTile key={`${card}-${i}`} tile={card} small wildcard={wildcard}/>:game==='holdem'?<HoldemCard key={`${card}-${i}`} card={card} size="report"/>:<Card key={`${card}-${i}`} card={card} small/>)}</div>;
}

export function ReplayPlayer({game,frames}:{game:ReplayGame;frames:ReplayFrame[]}){
 const [index,setIndex]=useState(0),[playing,setPlaying]=useState(false);
 useEffect(()=>{
  if(!playing)return;
  const timer=window.setInterval(()=>setIndex(current=>{
   if(current>=frames.length-1){setPlaying(false);return current;}
   return current+1;
  }),1400);
  return()=>window.clearInterval(timer);
 },[playing,frames.length]);
 if(!frames.length)return <p className="replay-empty">这局还没有可播放的记录。</p>;
 const frame=frames[Math.min(index,frames.length-1)],scene=frame.scene;
 return <section className="replay-player" aria-label="对局回放">
  <div className="replay-step"><span>第 {index+1} / {frames.length} 步</span><strong>{frame.action}</strong></div>
  <div className="replay-controls" role="group" aria-label="回放控制">
   <Button variant="outline" disabled={index===0} onClick={()=>{setPlaying(false);setIndex(i=>Math.max(0,i-1))}}><ChevronLeft size={17}/>上一步</Button>
   <Button variant="outline" disabled={frames.length<2} onClick={()=>{if(index===frames.length-1)setIndex(0);setPlaying(v=>!v)}}>{playing?<Pause size={17}/>:<Play size={17}/>}{playing?'暂停':'播放'}</Button>
   <Button variant="outline" disabled={index===frames.length-1} onClick={()=>{setPlaying(false);setIndex(i=>Math.min(frames.length-1,i+1))}}>下一步<ChevronRight size={17}/></Button>
  </div>
  <div className="replay-scene-meta"><span>{scene.phase}</span>{scene.street&&<span>{scene.street}</span>}{scene.pot!==undefined&&<span>底池 {scene.pot}</span>}{scene.wallRemaining!==undefined&&<span>牌墙剩余 {scene.wallRemaining}</span>}{scene.dealer!==undefined&&<span>庄家 {scene.seats[scene.dealer]?.name??scene.dealer+1}</span>}{scene.winner!==undefined&&<span>获胜 {scene.seats[scene.winner]?.name??scene.winner+1}</span>}</div>
  {scene.board&&scene.board.length>0&&<div className="replay-common"><b>公共牌</b><Cards cards={scene.board} game={game}/></div>}
  {scene.bottom&&scene.bottom.length>0&&<div className="replay-common"><b>底牌</b><Cards cards={scene.bottom} game={game}/></div>}
  {scene.last&&scene.last.length>0&&<div className="replay-common replay-last"><b>本轮出牌{frame.actor!==undefined?` · ${scene.seats[frame.actor]?.name??'玩家'}`:''}</b><Cards cards={scene.last} game={game} wildcard={scene.wildcard}/></div>}
  {scene.lastDiscard&&<div className="replay-common replay-last"><b>最近弃牌 · {scene.seats[scene.lastDiscard.seat]?.name??'玩家'}</b><Cards cards={[scene.lastDiscard.tile]} game={game} wildcard={scene.wildcard}/></div>}
  <div className="replay-seats">{scene.seats.map((seat,i)=><article className={`replay-seat${scene.turn===i?' is-turn':''}`} key={i}>
   <div className="replay-seat-title"><strong>{seat.name}{seat.bot?' · 人机':''}</strong>{seat.folded&&<span>已弃牌</span>}{seat.chips!==undefined&&<span>筹码 {seat.chips}</span>}{seat.bet!==undefined&&<span>本轮下注 {seat.bet}</span>}</div>
   <Cards cards={seat.hand??[]} game={game} wildcard={scene.wildcard}/>
   {seat.melds?.map((meld,n)=><div className="replay-meld" key={n}><span>{meld.kind}</span><Cards cards={meld.cards} game={game} wildcard={scene.wildcard}/></div>)}
   {seat.discards&&seat.discards.length>0&&<div className="replay-meld"><span>弃牌</span><Cards cards={seat.discards} game={game} wildcard={scene.wildcard}/></div>}
  </article>)}</div>
  <ol className="replay-log" aria-label="本局逐步记录">{frames.map((step,i)=><li key={i} aria-current={i===index?'step':undefined}><button type="button" onClick={()=>{setPlaying(false);setIndex(i)}}><span>{i+1}</span>{step.action}</button></li>)}</ol>
 </section>;
}
