"use client";
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {emptyBubbles,expireBubbles,receiveBubbles,type ChatSnapshot,type ChatBubble} from '@/lib/chat-bubbles';

export function useChatBubbles(code?:string){
 const tracker=useRef({code,state:emptyBubbles()});
 const [display,setDisplay]=useState<{code?:string;bubbles:Record<string,ChatBubble>}>({code,bubbles:{}});
 if(tracker.current.code!==code)tracker.current={code,state:emptyBubbles()};
 const onSnapshot=useCallback((snapshot:ChatSnapshot)=>{
  if(!code||tracker.current.code!==code||document.hidden)return;
  tracker.current.state=receiveBubbles(tracker.current.state,snapshot,Date.now());
  setDisplay({code,bubbles:tracker.current.state.bubbles});
 },[code]);
 useEffect(()=>{
  if(display.code!==code)return;
  const expiries=Object.values(display.bubbles).map(b=>b.expires);if(!expiries.length)return;
  const timer=setTimeout(()=>{if(tracker.current.code!==code)return;tracker.current.state=expireBubbles(tracker.current.state,Date.now());setDisplay({code,bubbles:tracker.current.state.bubbles});},Math.max(0,Math.min(...expiries)-Date.now()));
  return()=>clearTimeout(timer);
 },[code,display]);
 useEffect(()=>{
  const hide=()=>{if(document.hidden){tracker.current.state={...tracker.current.state,bubbles:{}};setDisplay({code,bubbles:{}});}};
  document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);
 },[code]);
 return {bubbles:display.code===code?display.bubbles:{},onSnapshot};
}
export function PlayerChat({bubble,align='center',children}:{bubble?:ChatBubble;align?:'start'|'center'|'end';children:ReactNode}){
 return <div className={`chat-avatar chat-align-${align}`}>{children}{bubble&&<div key={bubble.message.id} className="seat-chat-bubble" role="note" aria-label={`${bubble.message.name}说：${bubble.message.text}`} title={bubble.message.text}><p>{bubble.message.text}</p></div>}</div>;
}
