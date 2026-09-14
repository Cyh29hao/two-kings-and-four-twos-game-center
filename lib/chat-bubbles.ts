export type ChatMessage={id:number;senderId?:string;name:string;text:string;created:number;own:number};
export type ChatSnapshot={messages:ChatMessage[];serverNow:number};
export type ChatBubble={message:ChatMessage;expires:number};
export type BubbleState={cursor:number|null;bubbles:Record<string,ChatBubble>};
export const BUBBLE_MS=8000;
export const emptyBubbles=():BubbleState=>({cursor:null,bubbles:{}});
export function expireBubbles(state:BubbleState,now:number):BubbleState {
 return {...state,bubbles:Object.fromEntries(Object.entries(state.bubbles).filter(([,b])=>b.expires>now))};
}
/** The first response is history. Subsequent responses only animate new, recent messages. */
export function receiveBubbles(state:BubbleState,snapshot:ChatSnapshot,now:number):BubbleState {
 const next=expireBubbles(state,now),ordered=[...snapshot.messages].sort((a,b)=>a.id-b.id),last=ordered.at(-1)?.id??0;
 if(state.cursor===null)return {cursor:last,bubbles:{}};
 if(last<=state.cursor)return next;
 for(const message of ordered){
  if(message.id<=state.cursor||!message.senderId)continue;
  const remaining=BUBBLE_MS-Math.max(0,snapshot.serverNow-message.created);
  if(remaining>0)next.bubbles[message.senderId]={message,expires:now+remaining};
 }
 return {...next,cursor:last};
}
