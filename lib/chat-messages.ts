import type {ChatMessage} from './chat-bubbles.ts';
export const CHAT_LIMIT=80;
export function mergeMessages(previous:ChatMessage[],incoming:ChatMessage[],reset=false){
 const byId=new Map((reset?[]:previous).map(m=>[m.id,m]));
 for(const message of incoming)byId.set(message.id,message);
 return [...byId.values()].sort((a,b)=>a.id-b.id).slice(-CHAT_LIMIT);
}
export function sameMessage(a:{kind?:string;emoteId?:string|null;text:string},b:{kind?:string;emoteId?:string|null;text:string}){
 return (a.kind||'text')===(b.kind||'text')&&(a.emoteId??null)===(b.emoteId??null)&&a.text===b.text;
}
