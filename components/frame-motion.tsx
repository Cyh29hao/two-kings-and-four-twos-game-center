"use client";
import {useEffect,useRef,useState} from 'react';
import {frameAt,validMotion,type FrameMotion} from '@/lib/motion/timeline';

import {retainMotionSheet} from '@/lib/motion/decoded-sheets';
import {MotionImage} from './motion-image';

/** A supplied time controls both reference and redraw without independent animation loops. */
export function FrameMotionView({motion,time=0,active=false,className='',onReady}:{motion:FrameMotion;time?:number;active?:boolean;className?:string;onReady?:(ready:boolean)=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),images=useRef<HTMLImageElement[]>([]),callback=useRef(onReady);callback.current=onReady;
 const [ready,setReady]=useState(''),[failed,setFailed]=useState(''),[posterFailed,setPosterFailed]=useState('');
 const valid=validMotion(motion),shouldLoad=valid&&active;
 const sources=motion.sheets.map(sheet=>sheet.src).join('|');
 useEffect(()=>{
  if(!shouldLoad)return;let live=true;const retained=motion.sheets.map(sheet=>retainMotionSheet(sheet.src));
  images.current=[];setReady('');setFailed('');callback.current?.(false);
  Promise.all(retained.map(value=>value.promise)).then(loaded=>{
   if(!live)return;
   if(loaded.some((image,i)=>image.naturalWidth!==motion.sheets[i].columns*motion.sheets[i].cellWidth||image.naturalHeight!==motion.sheets[i].rows*motion.sheets[i].cellHeight))throw Error('动画尺寸不匹配');
   images.current=loaded;setReady(sources);callback.current?.(true);
  }).catch(()=>{if(live){setFailed(sources);callback.current?.(false);}});
  return()=>{live=false;retained.forEach(value=>value.release());images.current=[];};
 },[motion.id,sources,shouldLoad]);
 const index=frameAt(motion,time),draw=valid&&active&&ready===sources&&failed!==sources;
 useEffect(()=>{
  if(!draw)return;const frame=motion.frames[index],sheet=motion.sheets[frame.sheet],image=images.current[frame.sheet],surface=canvas.current;
  if(!surface||!image)return;
  if(surface.width!==sheet.cellWidth)surface.width=sheet.cellWidth;
  if(surface.height!==sheet.cellHeight)surface.height=sheet.cellHeight;
  const context=surface.getContext('2d');if(!context)return;
  context.clearRect(0,0,surface.width,surface.height);
  context.drawImage(image,(frame.cell%sheet.columns)*sheet.cellWidth,Math.floor(frame.cell/sheet.columns)*sheet.cellHeight,sheet.cellWidth,sheet.cellHeight,0,0,surface.width,surface.height);
 },[motion,index,draw]);
 return <span className={`frame-motion ${className}`} role="img" aria-label={motion.label} data-frame={draw?index:0} data-ready={draw?'true':'false'}>
  {valid&&posterFailed!==motion.poster?<MotionImage src={motion.poster} alt="" draggable={false} decoding="async" style={{visibility:draw?'hidden':'visible'}} onError={()=>setPosterFailed(motion.poster)}/>:<span className="frame-motion-fallback">{motion.label}</span>}
  <canvas ref={canvas} aria-hidden="true" style={{visibility:draw?'visible':'hidden'}}/>
 </span>;
}
