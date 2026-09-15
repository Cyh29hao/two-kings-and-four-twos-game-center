"use client";
import {useEffect,useRef,useState} from 'react';
import {MessageCircle,Send,X,Play} from 'lucide-react';
import {api} from '@/lib/client';
import {Button} from './ui/button';
import type {ChatSnapshot} from '@/lib/chat-bubbles';
import {EMOTE_COOLDOWN_MS,EMOTE_MS,EMOTE_SOUND_EVENT,getEmote,type EmoteSoundEvent} from '@/lib/emotes';
import {EmoteImage} from './emote';
import {EmotePicker} from './emote-picker';
import {useRoomMessages} from './use-room-messages';
import {useEmotePreferences} from './emote-preferences';
type Payload={kind:'text';text:string}|{kind:'emote';emoteId:string};
export function RoomChat({code,userId,closed=false,onSnapshot}:{code:string;userId:string;closed?:boolean;onSnapshot?:(snapshot:ChatSnapshot)=>void}){
 const stream=useRoomMessages(code,onSnapshot),{prefs}=useEmotePreferences(userId),messages=stream.messages,isClosed=closed||stream.closed;
 const [open,setOpen]=useState(false),[draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[seen,setSeen]=useState<number|null>(null),[localReady,setLocalReady]=useState(0),[now,setNow]=useState(Date.now),[replay,setReplay]=useState<{id:number;key:number}|null>(null);
 const list=useRef<HTMLDivElement>(null),atBottom=useRef(true),pending=useRef<{id:string;signature:string}|null>(null),input=useRef<HTMLTextAreaElement>(null),sending=useRef(false);
 useEffect(()=>{if(stream.initialized&&seen===null)setSeen(messages.at(-1)?.id||0);},[stream.initialized,seen,messages]);
 useEffect(()=>{if(open){setSeen(messages.at(-1)?.id||0);if(atBottom.current)list.current?.scrollTo({top:list.current.scrollHeight});}},[open,messages]);
 useEffect(()=>{if(open){atBottom.current=true;list.current?.scrollTo({top:list.current.scrollHeight});input.current?.focus();}const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};if(open)document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape)},[open]);
 const readyAt=Math.max(stream.readyAt,localReady),cooldown=Math.max(0,Math.ceil((readyAt-now)/1000));
 useEffect(()=>{setNow(Date.now());if(readyAt<=Date.now())return;const timer=setInterval(()=>setNow(Date.now()),200);return()=>clearInterval(timer)},[readyAt]);
 useEffect(()=>{if(!replay)return;const timer=setTimeout(()=>setReplay(null),EMOTE_MS);return()=>clearTimeout(timer)},[replay]);
 useEffect(()=>{const hide=()=>{if(document.hidden)setReplay(null)};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide)},[]);
 async function sendValue(payload:Payload):Promise<boolean>{
  if(sending.current||isClosed||!stream.initialized||(payload.kind==='emote'&&readyAt>Date.now()))return false;
  const signal=stream.signal();if(!signal||signal.aborted)return false;
  sending.current=true;setBusy(true);setError('');const signature=JSON.stringify(payload);
  if(pending.current?.signature!==signature)pending.current={id:crypto.randomUUID(),signature};
  try{
   await api('/api/chat',{code,...payload,clientId:pending.current.id},AbortSignal.any([signal,AbortSignal.timeout(12000)]));
   if(signal.aborted)return false;pending.current=null;
   if(payload.kind==='text')setDraft('');else setLocalReady(Date.now()+EMOTE_COOLDOWN_MS);
   atBottom.current=true;await stream.refresh();if(payload.kind==='text')input.current?.focus();return true;
  }catch(e){if(signal.aborted)return false;const problem=e as Error&{status?:number;retryAfterMs?:number};if(problem.status&&problem.status<500)pending.current=null;
   if(problem.retryAfterMs)setLocalReady(Date.now()+problem.retryAfterMs);
   setError(problem.name==='TimeoutError'?'发送结果尚未确认，再点一次可安全重试':problem.message);return false;
  }finally{sending.current=false;if(!signal.aborted)setBusy(false);}
 }
 function replayMessage(id:number,emoteId:string){
  setReplay({id,key:Date.now()});if(prefs.sound)window.dispatchEvent(new CustomEvent<EmoteSoundEvent>(EMOTE_SOUND_EVENT,{detail:{code,emoteId,expires:Date.now()+EMOTE_MS}}));
 }
 const unread=seen===null?0:messages.filter(m=>m.id>seen&&!m.own).length,problem=error||stream.error;
 return <div className="room-chat"><div className="room-social-launches"><EmotePicker userId={userId} disabled={busy||isClosed||!stream.initialized} cooldown={cooldown} error={problem} onSend={emoteId=>sendValue({kind:'emote',emoteId})}/><Button className="chat-launch" variant="outline" aria-label={`房间聊天${unread?'，'+unread+' 条新消息':''}`} aria-expanded={open} onClick={()=>{setOpen(!open);setError('')}}><MessageCircle size={18}/><span>房间聊天</span>{unread>0&&<b>{unread>9?'9+':unread}</b>}</Button></div>{open&&<section className="chat-panel" role="dialog" aria-label="房间聊天"><header><div><b>同桌聊两句</b><span>仅本房间玩家可见 · 最近 80 条</span></div><Button variant="ghost" size="icon" aria-label="收起聊天" onClick={()=>setOpen(false)}><X size={18}/></Button></header><div className="chat-messages" ref={list} role="log" aria-live="polite" aria-relevant="additions" onScroll={()=>{if(list.current)atBottom.current=list.current.scrollHeight-list.current.scrollTop-list.current.clientHeight<45;}}>{messages.length?messages.map(m=><article key={m.id} className={m.own?'is-own':''}><div><b>{m.own?'你':m.name}</b><time>{new Date(m.created).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}</time></div>{m.kind==='emote'?<button className={`chat-emote${replay?.id===m.id?' is-replaying':''}`} aria-label={'重播表情：'+(getEmote(m.emoteId)?.name??'暂不可用')} onClick={()=>replayMessage(m.id,m.emoteId??'')}><EmoteImage key={`${m.id}-${replay?.id===m.id?replay.key:0}`} id={m.emoteId??''} animate={replay?.id===m.id}/><Play className="emote-replay" size={19}/></button>:<p>{m.text}</p>}</article>):<div className="chat-empty"><MessageCircle size={30}/><p>跟朋友打个招呼吧。</p><span>机器人不会参与聊天。</span></div>}</div>{problem&&<p className="chat-error" role="alert">{problem}</p>}<form onSubmit={e=>{e.preventDefault();if(draft.trim())void sendValue({kind:'text',text:draft.trim()})}}><textarea ref={input} aria-label="聊天内容" placeholder={isClosed?'牌桌已结束，聊天记录只读':'说点什么…'} maxLength={500} value={draft} disabled={isClosed} onChange={e=>setDraft(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing&&e.nativeEvent.keyCode!==229){e.preventDefault();if(draft.trim())void sendValue({kind:'text',text:draft.trim()});}}}/><div><small>{draft.length} / 500 · Enter 发送</small><Button type="submit" disabled={busy||isClosed||!stream.initialized||!draft.trim()}><Send size={14}/>{busy?'发送中':'发送'}</Button></div></form></section>}</div>;
}
