"use client";
import {useEffect,useRef,useState} from 'react';
import {frameAt,validMotion,type FrameMotion} from '@/lib/motion/timeline';

// Cache decoded sheets shared by the preview, avatar, and table. Evict idle sheets.
const sheets=new Map<string,{promise:Promise<HTMLImageElement>;users:number;used:number}>();
function retain(src:string){
 let entry=sheets.get(src);
 if(!entry){
  const image=new Image();
  const promise=new Promise<HTMLImageElement>((resolve,reject)=>{
   const timer=setTimeout(()=>{image.onload=image.onerror=null;image.src='';reject(Error('动画加载超时'));},8000);
   image.onload=()=>{clearTimeout(timer);resolve(image);};image.onerror=()=>{clearTimeout(timer);reject(Error('动画图片无法加载'));};image.src=src;
  });
  entry={promise,users:0,used:Date.now()};sheets.set(src,entry);
  promise.catch(()=>{if(sheets.get(src)===entry)sheets.delete(src)});
 }
 entry.users++;entry.used=Date.now();
 return {promise:entry.promise,release:()=>{entry!.users=Math.max(0,entry!.users-1);entry!.used=Date.now();const idle=[...sheets.entries()].filter(([,e])=>e.users===0).sort((a,b)=>b[1].used-a[1].used);for(const [key]of idle.slice(4))sheets.delete(key);}};
}

/** A supplied time controls both reference and redraw without independent animation loops. */
export function FrameMotionView({motion,time=0,active=false,className='',onReady}:{motion:FrameMotion;time?:number;active?:boolean;className?:string;onReady?:(ready:boolean)=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),images=useRef<HTMLImageElement[]>([]),callback=useRef(onReady);callback.current=onReady;
 const [ready,setReady]=useState(''),[failed,setFailed]=useState(''),[posterFailed,setPosterFailed]=useState('');
 const valid=validMotion(motion),shouldLoad=valid&&active;
 const sources=motion.sheets.map(sheet=>sheet.src).join('|');
 useEffect(()=>{
  if(!shouldLoad)return;let live=true;const retained=motion.sheets.map(sheet=>retain(sheet.src));
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
  {valid&&posterFailed!==motion.poster?<img src={motion.poster} alt="" draggable={false} decoding="async" style={{visibility:draw?'hidden':'visible'}} onError={()=>setPosterFailed(motion.poster)}/>:<span className="frame-motion-fallback">{motion.label}</span>}
  <canvas ref={canvas} aria-hidden="true" style={{visibility:draw?'visible':'hidden'}}/>
 </span>;
}
