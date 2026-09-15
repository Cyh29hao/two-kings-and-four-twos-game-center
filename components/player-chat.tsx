"use client";
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {emptyBubbles,expireBubbles,receiveBubbles,type ChatSnapshot,type ChatBubble} from '@/lib/chat-bubbles';
import {EmoteImage} from './emote';
import {useEmotePreferences} from './emote-preferences';
import {EMOTE_SOUND_EVENT,EMOTE_MS,type EmoteSoundEvent} from '@/lib/emotes';

export function useChatBubbles(code?:string,userId=''){
 const {prefs}=useEmotePreferences(userId),preferences=useRef(prefs);preferences.current=prefs;
 const tracker=useRef({code,state:emptyBubbles()});
 const [display,setDisplay]=useState<{code?:string;bubbles:Record<string,ChatBubble>}>({code,bubbles:{}});
 if(tracker.current.code!==code)tracker.current={code,state:emptyBubbles()};
 const onSnapshot=useCallback((snapshot:ChatSnapshot)=>{
  if(!code||tracker.current.code!==code||document.hidden)return;
  const old=tracker.current.state;
  tracker.current.state=receiveBubbles(old,snapshot,Date.now());
  const newest=Object.values(tracker.current.state.bubbles).filter(b=>b.message.kind==='emote'&&b.message.id>(old.cursor??Infinity)).sort((a,b)=>b.message.id-a.message.id)[0];
  if(newest?.message.emoteId&&preferences.current.sound)window.dispatchEvent(new CustomEvent<EmoteSoundEvent>(EMOTE_SOUND_EVENT,{detail:{code,emoteId:newest.message.emoteId,expires:newest.expires}}));
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
 return {bubbles:display.code===code?Object.fromEntries(Object.entries(display.bubbles).filter(([,b])=>b.message.kind!=='emote'||b.message.own||prefs.animateOthers)):{},onSnapshot};
}
export function PlayerChat({bubble,align='center',children}:{bubble?:ChatBubble;align?:'start'|'center'|'end';children:ReactNode}){
 return <div className={`chat-avatar chat-align-${align}`}>{children}{bubble&&<div key={bubble.message.id} className={`seat-chat-bubble${bubble.message.kind==='emote'?' seat-emote-bubble':''}`} role="note" aria-label={`${bubble.message.name}：${bubble.message.text}`} title={bubble.message.text}>{bubble.message.kind==='emote'?<EmoteImage id={bubble.message.emoteId??''} animate eager startAt={bubble.expires-EMOTE_MS} expiresAt={bubble.expires}/>:<p>{bubble.message.text}</p>}</div>}</div>;
}
