"use client";
import {useEffect,useState,type ImgHTMLAttributes} from 'react';
import {motionAssetStore} from '@/lib/motion/asset-cache';

export function MotionImage({src,...props}:ImgHTMLAttributes<HTMLImageElement>&{src:string}){
 const [loaded,setLoaded]=useState<{source:string;url:string}|null>(null);
 useEffect(()=>{
  let live=true,url='';const store=motionAssetStore();
  if(!store.supports(src)){setLoaded({source:src,url:src});return;}
  void store.get(src).then(({blob})=>{if(!live)return;url=URL.createObjectURL(blob);setLoaded({source:src,url});}).catch(()=>{if(live)setLoaded({source:src,url:store.url(src)});});
  return()=>{live=false;if(url)URL.revokeObjectURL(url);};
 },[src]);
 return <img {...props} src={loaded?.source===src?loaded.url:undefined} onError={event=>{const store=motionAssetStore();if(store.supports(src))void store.invalidate(src);props.onError?.(event);}}/>;
}
