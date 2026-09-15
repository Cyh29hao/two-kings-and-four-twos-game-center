"use client";
import {useEffect,useRef,useState} from 'react';
import {FrameMotionView} from './frame-motion';
import {frameAt,motionDuration,type FrameMotion} from '@/lib/motion/timeline';

export function useReducedMotion(){
 const [reduced,setReduced]=useState(true);
 useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[]);
 return reduced;
}
/** Decode and playback share a deadline: a late load cannot restart an old cue. */
export function MotionPlayback({motion,animate,startAt,expiresAt,className=''}:{motion:FrameMotion;animate:boolean;startAt?:number;expiresAt?:number;className?:string}){
 const reduced=useReducedMotion(),[ready,setReady]=useState(false),[time,setTime]=useState(0),[hidden,setHidden]=useState(false),[expired,setExpired]=useState(false);
 const born=useRef(startAt??Date.now()),token=`${motion.id}:${startAt??''}`;
 const length=motionDuration(motion),deadline=expiresAt??(startAt===undefined?Infinity:startAt+length);
 useEffect(()=>{born.current=startAt??Date.now();setTime(0);setReady(false);setExpired(false)},[token,animate]);
 useEffect(()=>{const hide=()=>{setHidden(document.hidden);if(document.hidden)setExpired(true)};hide();document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide)},[]);
 const play=animate&&!reduced&&!hidden&&!expired;
 useEffect(()=>{
  if(!play||!ready)return;let handle=0,previousFrame=-1;
  // Local replays start after decoding; live cues retain their original deadline.
  born.current=startAt??Date.now();
  const tick=()=>{
   const now=Date.now(),elapsed=Math.max(0,now-born.current),frame=frameAt(motion,elapsed);
   // A held pose needs no React render. Ten-player tables share that saving.
   if(frame!==previousFrame){previousFrame=frame;setTime(Math.min(elapsed,length));}
   if(now>=deadline||elapsed>=length){setExpired(true);return;}handle=requestAnimationFrame(tick);
  };
  tick();return()=>cancelAnimationFrame(handle);
 },[play,ready,length,deadline,token,startAt,motion]);
 const onReady=(value:boolean)=>{setReady(value);if(value&&Date.now()>=deadline)setExpired(true)};
 // At completion keep the final generated pose. On a failed/late decode keep cover.
 return <FrameMotionView motion={motion} time={expired&&ready?length:time} active={animate&&!reduced&&!hidden&&(ready||!expired)} className={className} onReady={onReady}/>;
}
