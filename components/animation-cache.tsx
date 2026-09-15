"use client";
import {useEffect,useSyncExternalStore} from 'react';
import {Download,Check,LoaderCircle} from 'lucide-react';
import {ANIMATION_BYTES,animationCacheSnapshot,animationCacheServerSnapshot,subscribeAnimationCache,inspectAnimationCache,cacheAllAnimations,allowAutomaticAnimationCache} from '@/lib/motion/preload';

export function AnimationPreload(){
 useEffect(()=>{if(!allowAutomaticAnimationCache())return;const timer=setTimeout(()=>void cacheAllAnimations(),1800);return()=>clearTimeout(timer)},[]);
 return null;
}
export function AnimationCacheControl(){
 const state=useSyncExternalStore(subscribeAnimationCache,animationCacheSnapshot,animationCacheServerSnapshot);
 useEffect(()=>{void inspectAnimationCache()},[]);
 const busy=state.status==='running',done=state.status==='done',unavailable=state.status==='unavailable';
 return <section className="animation-cache" aria-label="动画缓存"><button type="button" disabled={busy||done||unavailable} onClick={()=>void cacheAllAnimations()}>
  {done?<Check size={16}/>:busy?<LoaderCircle size={16} className="cache-spinner"/>:<Download size={16}/>}
  {done?'全部动画已缓存':busy?`缓存中 ${state.completed} / ${state.total}`:state.status==='partial'?'继续缓存剩余动画':'缓存全部动画'}
 </button><small role="status">{unavailable?'浏览器暂不支持保存缓存，仍可正常播放':done?'表情与牌型动画已备好，之后直接从本机加载':busy?'可以继续打牌，缓存会在后台分批完成':`约 ${(ANIMATION_BYTES/1024/1024).toFixed(1)} MB · 含全部表情与牌型特效`}</small></section>;
}
