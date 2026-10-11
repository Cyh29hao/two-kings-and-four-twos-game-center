"use client";

import {useEffect,useMemo,useState} from 'react';
import {ChevronLeft,ChevronRight,Pause,Play} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {ReplayLandlordTable} from '@/components/replay-landlord-table';
import {ReplayMahjongTable} from '@/components/replay-mahjong-table';
import {ReplayHoldemTable} from '@/components/replay-holdem-table';
import type {ChatBubble} from '@/lib/chat-bubbles';
import {EMOTE_MS,emoteText} from '@/lib/emotes';
import type {ReplayFrame,ReplayGame} from '@/lib/replay/types';

export type {ReplayFrame,ReplayGame} from '@/lib/replay/types';
export type ReplayMessage={id:number;at:number;seat:number;kind:'text'|'emote';text?:string;emoteId?:string};
type Moment={kind:'action'|'message';frameIndex:number;event?:ReplayMessage};
const EMPTY_EVENTS:ReplayMessage[]=[];

function timeline(frames:ReplayFrame[],events:ReplayMessage[]):Moment[]{
 const moments:Moment[]=[];
 const ordered=[...events].sort((a,b)=>a.at-b.at||a.id-b.id);
 let cursor=0;
 for(let i=0;i<frames.length;i++){
  moments.push({kind:'action',frameIndex:i});
  const end=frames[i+1]?.at??Infinity;
  while(cursor<ordered.length&&ordered[cursor].at<end){
   if(ordered[cursor].at>=frames[i].at)moments.push({kind:'message',frameIndex:i,event:ordered[cursor]});
   cursor++;
  }
 }
 return moments;
}

function duration(moment:Moment,speed:number):number{
 if(moment.kind==='action')return 2000/speed;
 const event=moment.event!;
 if(event.kind==='emote')return 1600/speed;
 return (event.text?.length??0)>45?2200/speed:1100/speed;
}

function thinkTime(frame:ReplayFrame):string{
 const timed=frame as ReplayFrame&{durationMs?:number;timing?:'manual'|'timeout'|'automatic'};
 if(timed.timing==='automatic')return '自动';
 if(timed.durationMs===undefined)return '';
 const seconds=(timed.durationMs/1000).toFixed(1);
 return timed.timing==='timeout'?`超时 · ${seconds} 秒`:`用时 ${seconds} 秒`;
}

export function ReplayPlayer({game,frames,events=EMPTY_EVENTS,perspective=0}:{game:ReplayGame;frames:ReplayFrame[];events?:ReplayMessage[];perspective?:number}){
 const moments=useMemo(()=>timeline(frames,events),[frames,events]);
 const [cursor,setCursor]=useState(()=>({index:0,enteredAt:Date.now()})),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1);
 const safePosition=Math.min(cursor.index,Math.max(0,moments.length-1));
 const moment=moments[safePosition],frame=moment?frames[moment.frameIndex]:undefined;
 useEffect(()=>{
  if(!playing||!moment)return;
  const timer=window.setTimeout(()=>{
   if(safePosition>=moments.length-1){setPlaying(false);return;}
   const next=safePosition+1;
   setCursor({index:next,enteredAt:Date.now()});
  },duration(moment,speed));
  return()=>window.clearTimeout(timer);
 },[playing,safePosition,moments,moment,speed]);
 if(!frame)return <p className="replay-empty">这局还没有可播放的记录。</p>;

 const event=moment.event,seat=event?frame.scene.seats[event.seat]:undefined;
 const bubble:ChatBubble|undefined=event&&seat?.id?{message:{id:event.id,senderId:seat.id,name:seat.name,text:event.text??emoteText(event.emoteId),created:event.at,own:0,kind:event.kind,emoteId:event.emoteId},expires:cursor.enteredAt+EMOTE_MS}:undefined;
 const bubbles=bubble&&seat?.id?{[seat.id]:bubble}:{};
 const currentAction=moment.frameIndex;
 const actionPositions=moments.flatMap((item,i)=>item.kind==='action'?[i]:[]);
 const previousAction=actionPositions.findLast(i=>i<safePosition);
 const nextAction=actionPositions.find(i=>i>safePosition);
 const jump=(target:number)=>{setPlaying(false);setCursor({index:target,enteredAt:Date.now()})};

 return <section className="replay-player" aria-label="对局回放">
  <div className="replay-table-stage">
   {game==='mahjong'?<ReplayMahjongTable frame={frame} perspective={perspective} bubbles={bubbles} onInspect={()=>setPlaying(false)} showResult={safePosition===moments.length-1}/>:game==='holdem'?<ReplayHoldemTable frame={frame} perspective={perspective} bubbles={bubbles}/>:<ReplayLandlordTable frame={frame} perspective={perspective} bubbles={bubbles} onInspect={()=>setPlaying(false)}/>}
  </div>
  <div className="replay-viewer-bar">
   <div className="replay-now"><span>第 {currentAction+1} / {frames.length} 步</span><strong>{event?`${seat?.name??'玩家'}：${event.kind==='emote'?'发送表情':event.text??''}`:frame.action}</strong>{!event&&thinkTime(frame)&&<small>{thinkTime(frame)}</small>}</div>
   <div className="replay-controls" role="group" aria-label="回放控制">
    <Button variant="outline" size="sm" disabled={previousAction===undefined} onClick={()=>jump(previousAction!)} aria-label="上一步"><ChevronLeft size={17}/></Button>
    <Button variant="outline" size="sm" onClick={()=>{if(safePosition===moments.length-1)setCursor({index:0,enteredAt:Date.now()});setPlaying(v=>!v)}} aria-label={playing?'暂停':'播放'}>{playing?<Pause size={17}/>:<Play size={17}/>}</Button>
    <Button variant="outline" size="sm" disabled={nextAction===undefined} onClick={()=>jump(nextAction!)} aria-label="下一步"><ChevronRight size={17}/></Button>
    <select aria-label="播放速度" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select>
   </div>
   <input className="replay-progress" type="range" aria-label="回放进度" min={0} max={Math.max(0,moments.length-1)} value={safePosition} onChange={e=>jump(Number(e.target.value))}/>
  </div>
  <details className="replay-timeline"><summary>逐步记录与聊天 · {frames.length} 步{events.length?` · ${events.length} 条消息`:''}</summary><ol>{moments.map((item,i)=>{const step=frames[item.frameIndex],message=item.event;return <li key={`${item.kind}-${i}`} aria-current={i===safePosition?'step':undefined}><button type="button" onClick={()=>jump(i)}><span>{item.kind==='action'?`第 ${item.frameIndex+1} 步`:'聊天'}</span><strong>{message?`${step.scene.seats[message.seat]?.name??'玩家'}：${message.kind==='emote'?'[表情]':message.text??''}`:step.action}</strong>{item.kind==='action'&&thinkTime(step)&&<small>{thinkTime(step)}</small>}</button></li>})}</ol></details>
 </section>;
}
