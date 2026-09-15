"use client";
import {useEffect,useRef,useState} from 'react';
import {FrameMotionView} from './frame-motion';
import {motionDuration,type FrameMotion} from '@/lib/motion/timeline';

export function useReducedMotion(){
 const [reduced,setReduced]=useState(true);
 useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[]);
 return reduced;
}
/** Decode and playback share a deadline: a late load cannot restart an old cue. */
export function MotionPlayback({motion,animate,startAt,expiresAt,className=''}:{motion:FrameMotion;animate:boolean;startAt?:number;expiresAt?:number;className?:string}){
 const reduced=useReducedMotion(),[ready,setReady]=useState(false),[time,setTime]=useState(0),[hidden,setHidden]=useState(false),[expired,setExpired]=useState(false);
 const born=useRef(startAt??Date.now()),token=`${motion.id}:${startAt??''}`;
 const length=motionDuration(motion),deadline=expiresAt??born.current+length;
 useEffect(()=>{born.current=startAt??Date.now();setTime(0);setReady(false);setExpired(false)},[token,animate]);
 useEffect(()=>{const hide=()=>{setHidden(document.hidden);if(document.hidden)setExpired(true)};hide();document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide)},[]);
 const play=animate&&!reduced&&!hidden&&!expired;
 useEffect(()=>{
  if(!play)return;let handle=0;
  const tick=()=>{const now=Date.now(),elapsed=Math.max(0,now-born.current);setTime(Math.min(elapsed,length));if(now>=deadline||elapsed>=length){setExpired(true);return;}handle=requestAnimationFrame(tick)};
  tick();return()=>cancelAnimationFrame(handle);
 },[play,length,deadline,token]);
 const onReady=(value:boolean)=>{setReady(value);if(value&&(Date.now()>=deadline||Date.now()-born.current>=length))setExpired(true)};
 // At completion keep the final generated pose. On a failed/late decode keep cover.
 return <FrameMotionView motion={motion} time={expired&&ready?length:time} active={animate&&!reduced&&!hidden&&(ready||!expired)} className={className} onReady={onReady}/>;
}
