import {EMOTE_MS} from './emotes.ts';
export type ChatMessage={id:number;clientId?:string;senderId?:string;name:string;text:string;created:number;own:number;kind?:'text'|'emote';emoteId?:string|null};
export type ChatSnapshot={messages:ChatMessage[];serverNow:number;suppressReplay?:boolean;cursor?:number;delivery?:'preview'|'receipt'|'failed'};
export type ChatReceipt={sent:true;message:ChatMessage;serverNow:number;emoteReadyAt:number};
export type ChatBubble={message:ChatMessage;expires:number;pending?:boolean};
export type BubbleState={cursor:number|null;bubbles:Record<string,ChatBubble>;local?:string[]};
export const BUBBLE_MS=8000;
export const emptyBubbles=():BubbleState=>({cursor:null,bubbles:{}});
export function expireBubbles(state:BubbleState,now:number):BubbleState {
 return {...state,bubbles:Object.fromEntries(Object.entries(state.bubbles).filter(([,b])=>b.expires>now))};
}
/** The first response is history. Subsequent responses only animate new, recent messages. */
export function receiveBubbles(state:BubbleState,snapshot:ChatSnapshot,now:number):BubbleState {
 const next=expireBubbles(state,now),ordered=[...snapshot.messages].sort((a,b)=>a.id-b.id),last=Math.max(snapshot.cursor??0,ordered.at(-1)?.id??0);
 // Local previews and POST receipts must never advance the subscription cursor:
 // another player's earlier message may still be in flight on the polling GET.
 if(snapshot.delivery){
  for(const message of ordered){
   if(!message.clientId||!message.senderId)continue;
   const previous=next.bubbles[message.senderId],known=next.local?.includes(message.clientId);
   if(snapshot.delivery==='failed'){
    if(previous?.message.clientId===message.clientId&&previous.pending)delete next.bubbles[message.senderId];
    continue;
   }
   if(known||previous?.message.clientId===message.clientId){
    if(!known)next.local=[...(next.local??[]),message.clientId].slice(-80);
    if(snapshot.delivery==='receipt'&&previous?.message.clientId===message.clientId)next.bubbles[message.senderId]={...previous,message,pending:false};
    continue;
   }
   next.local=[...(next.local??[]),message.clientId].slice(-80);
   if(snapshot.delivery==='receipt'&&message.id<=(state.cursor??0))continue;
   const remaining=(message.kind==='emote'?EMOTE_MS:BUBBLE_MS)-Math.max(0,snapshot.serverNow-message.created);
   if(remaining>0&&!snapshot.suppressReplay)next.bubbles[message.senderId]={message,expires:now+remaining,pending:snapshot.delivery==='preview'};
  }
  return next;
 }
 if(state.cursor===null||snapshot.suppressReplay)return {...next,cursor:Math.max(state.cursor??0,last),bubbles:{}};
 if(last<=state.cursor)return next;
 for(const message of ordered){
  if(message.id<=state.cursor||!message.senderId)continue;
  if(message.clientId&&next.local?.includes(message.clientId)){
   const previous=next.bubbles[message.senderId];
   if(previous?.message.clientId===message.clientId)next.bubbles[message.senderId]={...previous,message,pending:false};
   continue;
  }
  const remaining=(message.kind==='emote'?EMOTE_MS:BUBBLE_MS)-Math.max(0,snapshot.serverNow-message.created);
  if(remaining>0)next.bubbles[message.senderId]={message,expires:now+remaining};
 }
 return {...next,cursor:last};
}
