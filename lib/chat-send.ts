import type {ChatMessage,ChatReceipt,ChatSnapshot} from './chat-bubbles.ts';
import {emoteText} from './emotes.ts';

export type ChatPayload={kind:'text';text:string}|{kind:'emote';emoteId:string};
export type ChatSignal=ChatPayload&{code:string;clientId:string};

/** Only a message ID and an emote ID travel over the wire. Media stays in the local cache. */
export function chatSignal(code:string,clientId:string,payload:ChatPayload):ChatSignal{
 return payload.kind==='emote'?{code,clientId,kind:'emote',emoteId:payload.emoteId}:{code,clientId,kind:'text',text:payload.text};
}

/** The preview is synchronous; delivery never depends on animation loading or a polling GET. */
export async function deliverChatSignal(options:{
 code:string;userId:string;clientId:string;payload:ChatPayload;signal:AbortSignal;now?:()=>number;
 post:(body:ChatSignal,signal:AbortSignal)=>Promise<ChatReceipt>;
 snapshot:(snapshot:ChatSnapshot)=>void;receipt:(receipt:ChatReceipt)=>void;
}){
 const {code,userId,clientId,payload,signal,post,snapshot,receipt}=options,now=options.now??Date.now;
 signal.throwIfAborted();
 const created=now(),message:ChatMessage={id:0,clientId,senderId:userId,name:'你',own:1,created,...payload,text:payload.kind==='text'?payload.text:emoteText(payload.emoteId)};
 if(payload.kind==='emote')snapshot({delivery:'preview',messages:[message],serverNow:created});
 try{
  const result=await post(chatSignal(code,clientId,payload),signal);
  if(!signal.aborted)receipt(result);
  return result;
 }catch(error){
  if(!signal.aborted&&payload.kind==='emote')snapshot({delivery:'failed',messages:[message],serverNow:now()});
  throw error;
 }
}
