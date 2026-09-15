"use client";
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {freshVisuals,publicVisuals,IMPORTANT_EFFECTS,type VisualEvent,type VisualFrame,type EffectId} from '@/lib/motion/events';
import {getTableEffect} from '@/lib/motion/effects';
import {useEmotePreferences} from './emote-preferences';
import {MotionPlayback,useReducedMotion} from './motion-playback';
import {MotionImage} from './motion-image';

type Playing={event:VisualEvent;start:number;end:number};
const Context=createContext<{enabled:boolean;playing:Record<string,Playing>;events:VisualEvent[]}>({enabled:false,playing:{},events:[]});
export function TableEffectsProvider({room,userId,children,connected=true}:{room:VisualFrame|null;userId:string;children:ReactNode;connected?:boolean}){
 const {prefs}=useEmotePreferences(userId),reduced=useReducedMotion(),enabled=prefs.effects&&!reduced;
 const previous=useRef<VisualFrame|null>(null),hidden=useRef(false);
 const [state,setState]=useState<{key:string;playing:Record<string,Playing>}>({key:'',playing:{}});
 const key=room?`${room.code}:${room.game.round}`:'';
 useEffect(()=>{
  if(!room||!connected){previous.current=null;setState({key:'',playing:{}});return;}
  const prior=previous.current;
  if(prior&&prior.code===room.code&&prior.game.round===room.game.round&&room.revision<prior.revision)return;
  const fresh=hidden.current?[]:freshVisuals(prior,room);previous.current=room;
  if(!enabled||document.hidden||room.game.phase==='closed'||!prior||prior.code!==room.code||prior.game.round!==room.game.round){setState({key,playing:{}});return;}
  setState(old=>{
   let playing=old.key===key?Object.fromEntries(Object.entries(old.playing).filter(([,value])=>value.end>Date.now())):{};
   for(const event of fresh){
    if(event.type==='discard'){playing=Object.fromEntries(Object.entries(playing).filter(([,v])=>v.event.seat!==event.seat));continue;}
    const definition=getTableEffect(event.type);if(!definition)continue;
    const start=room.receivedAt-(room.serverNow-event.at),end=start+definition.duration;if(end<=Date.now())continue;
    if(IMPORTANT_EFFECTS.has(event.type))playing=Object.fromEntries(Object.entries(playing).filter(([,v])=>!IMPORTANT_EFFECTS.has(v.event.type as EffectId)));
    playing[event.id]={event,start,end};
   }return {key,playing};
  });
 },[room,enabled,key,connected]);
 useEffect(()=>{const values=Object.values(state.playing);if(!values.length)return;const timer=setTimeout(()=>setState(current=>({...current,playing:Object.fromEntries(Object.entries(current.playing).filter(([,v])=>v.end>Date.now()))})),Math.max(1,Math.min(...values.map(v=>v.end))-Date.now()));return()=>clearTimeout(timer)},[state]);
 useEffect(()=>{const change=()=>{hidden.current=document.hidden;previous.current=null;setState({key:'',playing:{}})};document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change)},[]);
 return <Context.Provider value={{enabled,playing:connected&&enabled&&state.key===key?state.playing:{},events:room&&room.game.phase!=='closed'?publicVisuals(room.game):[]}}>{children}</Context.Provider>;
}
const detailLabel={exposed:'明杠',concealed:'暗杠',added:'补杠',self:'自摸',discard:'点炮胡',rob:'抢杠胡'};
export function EffectBadge({id,eventId,detail,placement='seat'}:{id:EffectId;eventId?:string;detail?:VisualEvent['detail'];placement?:'seat'|'result'}){
 const {enabled,playing}=useContext(Context),art=getTableEffect(id),[failed,setFailed]=useState(false);
 const run=eventId?playing[eventId]:undefined,active=!!run&&enabled;
 if(!art)return null;
 return <span className={`table-effect effect-${id} effect-at-${placement}${active?' effect-enter':''}${active&&IMPORTANT_EFFECTS.has(id)?' effect-emphasis':''}`} role="img" aria-label={art.label+(detail?' · '+detailLabel[detail]:'')} data-effect={id} data-event={eventId??''}>
  {art.motion?<MotionPlayback motion={art.motion} animate={active} startAt={run?.start} expiresAt={run?.end}/>:failed?<b className="effect-text-fallback">{art.label}</b>:<MotionImage src={art.src} width={256} height={256} alt="" draggable={false} decoding="async" onError={()=>setFailed(true)}/>}
  {detail&&<small>{detailLabel[detail]}</small>}
 </span>;
}
export function MahjongSeatEffect({seat}:{seat:number}){
 const {events}=useContext(Context),event=events.filter(e=>e.seat===seat).at(-1);
 return event&&event.type!=='discard'?<EffectBadge key={event.id} id={event.type} eventId={event.id} detail={event.detail}/>:null;
}
export function SpringEffect({winner,landlord,spring}:{winner:number;landlord:number;spring:boolean}){
 const {events}=useContext(Context);if(!spring)return null;const type=winner===landlord?'spring':'anti-spring',event=events.findLast(e=>e.type===type);
 return <EffectBadge id={type} eventId={event?.id} placement="result"/>;
}
