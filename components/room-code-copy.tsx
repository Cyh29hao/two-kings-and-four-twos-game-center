"use client";
import {useEffect,useRef,useState} from 'react';
import {Check,Copy} from 'lucide-react';
import {Button} from './ui/button';

export function RoomCodeCopy({code,compact=false}:{code:string;compact?:boolean}){
 const [status,setStatus]=useState<'idle'|'copied'|'failed'>('idle'),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{setStatus('idle');return()=>{if(timer.current)clearTimeout(timer.current)}},[code]);
 async function copy(){
  try{await navigator.clipboard.writeText(code);setStatus('copied');}
  catch{setStatus('failed');}
  if(timer.current)clearTimeout(timer.current);
  timer.current=setTimeout(()=>setStatus('idle'),3000);
 }
 return <span className={`room-code-copy ${compact?'is-compact':''}`}>
  <Button type="button" variant="outline" size="sm" aria-label="复制房间号" title="只复制六位房间号" onClick={copy}>{status==='copied'?<Check size={14}/>:<Copy size={14}/>}<span>{status==='copied'?'已复制':compact?'复制':'复制房间号'}</span></Button>
  <span className={status==='failed'?'room-copy-error':'sr-only'} role="status">{status==='copied'?`已复制房间号 ${code}`:status==='failed'?`未能访问剪贴板，房间号：${code}`:''}</span>
 </span>;
}

export function RoomCodeDigits({code}:{code:string}){
 return <div className="room-code-controls">
  <div className="room-code" aria-label={`房间号 ${code}`} onCopy={event=>{event.clipboardData.setData('text/plain',code);event.preventDefault();}}>{code.split('').map((n,i)=><span key={i}>{n}</span>)}</div>
  <RoomCodeCopy code={code}/>
 </div>;
}
