"use client";
import {useEffect,useRef,useState} from 'react';
import {api} from '@/lib/client';
import {mergeMessages,mergePolledMessages} from '@/lib/chat-messages';
import type {ChatMessage,ChatSnapshot,ChatReceipt} from '@/lib/chat-bubbles';

/** One serial, abortable subscription for the chat panel and every seat in this room. */
export function useRoomMessages(code:string,onSnapshot?:(snapshot:ChatSnapshot)=>void){
 const [state,setState]=useState({code,messages:[] as ChatMessage[],initialized:false,closed:false,readyAt:0,error:''});
 const callback=useRef(onSnapshot);callback.current=onSnapshot;
 const controls=useRef<{code:string;refresh:()=>Promise<void>;signal:AbortSignal;receive:(receipt:ChatReceipt)=>void}|null>(null);
 useEffect(()=>{
  let live=true,cursor:number|null=null,failed=0,suppress=true,fullNext=true,blocked=false;
  let epoch=0;
  let timer:ReturnType<typeof setTimeout>|undefined,active:Promise<void>|null=null;
  const lifetime=new AbortController();let request:AbortController|null=null;
  let receipts:ChatMessage[]=[];
  setState({code,messages:[],initialized:false,closed:false,readyAt:0,error:''});
  async function refresh():Promise<void>{
   if(!live||blocked||document.hidden)return;
   if(active){await active;if(live&&!blocked&&!document.hidden)return refresh();return;}
   if(timer)clearTimeout(timer);timer=undefined;
   const run=async()=>{
    request=new AbortController();const abort=()=>request?.abort();lifetime.signal.addEventListener('abort',abort,{once:true});
    const timeout=setTimeout(()=>request?.abort(),12000);
    try{
     const full=fullNext||cursor===null,quiet=suppress,requestEpoch=epoch;
     const data=await api('/api/chat?room='+code+(full?'':'&after='+cursor),undefined,request.signal);
     if(!live||document.hidden||requestEpoch!==epoch)return;
     cursor=data.cursor;fullNext=false;failed=0;suppress=false;
     const unpolled=receipts;receipts=receipts.filter(m=>m.id>data.cursor);
     setState(prev=>({code,messages:mergePolledMessages(prev.code===code?prev.messages:[],data.messages,unpolled,full),initialized:true,closed:data.closed,readyAt:Math.max(prev.code===code?prev.readyAt:0,Date.now()+Math.max(0,data.emoteReadyAt-data.serverNow)),error:''}));
     callback.current?.({...data,suppressReplay:quiet});
     blocked=!!data.closed;
     if(data.hasMore)timer=setTimeout(()=>{timer=undefined;void refresh()},0);
    }catch(e){
     if(!live||document.hidden)return;failed++;suppress=true;fullNext=true;
     const error=e as Error&{status?:number};blocked=error.status===401||error.status===403;
     setState(prev=>prev.code===code?{...prev,initialized:blocked?false:prev.initialized,error:blocked?error.message:'聊天连接中断，正在重连…'}:prev);
    }finally{
     clearTimeout(timeout);lifetime.signal.removeEventListener('abort',abort);request=null;
    }
   };
   active=run();await active;active=null;
   if(live&&!blocked&&!document.hidden&&!timer)timer=setTimeout(()=>{timer=undefined;void refresh()},Math.min(1000*2**failed,15000));
  }
  const receive=(receipt:ChatReceipt)=>{
   if(!live)return;
   receipts=mergeMessages(receipts,[receipt.message]);
   setState(prev=>prev.code!==code?prev:{...prev,messages:mergeMessages(prev.messages,[receipt.message]),readyAt:Math.max(prev.readyAt,Date.now()+Math.max(0,receipt.emoteReadyAt-receipt.serverNow))});
   callback.current?.({delivery:'receipt',messages:[receipt.message],serverNow:receipt.serverNow,suppressReplay:document.hidden});
  };
  controls.current={code,refresh,receive,signal:lifetime.signal};
  const visibility=()=>{epoch++;if(timer)clearTimeout(timer);timer=undefined;suppress=true;fullNext=true;if(document.hidden)request?.abort();else void refresh();};
  document.addEventListener('visibilitychange',visibility);void refresh();
  return()=>{live=false;lifetime.abort();request?.abort();if(timer)clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);if(controls.current?.code===code)controls.current=null;};
 },[code]);
 return {...(state.code===code?state:{code,messages:[],initialized:false,closed:false,readyAt:0,error:''}),receive:(receipt:ChatReceipt)=>{if(controls.current?.code===code)controls.current.receive(receipt);},refresh:async()=>{if(controls.current?.code===code)await controls.current.refresh();},signal:()=>controls.current?.code===code?controls.current.signal:AbortSignal.abort()};
}
