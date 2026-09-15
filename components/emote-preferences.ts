"use client";
import {useCallback,useSyncExternalStore} from 'react';
import {canSendEmote} from '@/lib/emotes';
export type EmotePreferences={animateOthers:boolean;sound:boolean;effects:boolean;favorites:string[]};
const DEFAULT:EmotePreferences={animateOthers:true,sound:true,effects:true,favorites:[]};
const cache=new Map<string,{raw:string|null;value:EmotePreferences}>();
const changed='yule:emote-preferences';
const key=(id:string)=>`yule-emotes-v1:${id}`;
export function parseEmotePreferences(raw:string|null):EmotePreferences{
 try{const p=JSON.parse(raw||'null');if(!p||typeof p!=='object')return DEFAULT;
  return {animateOthers:typeof p.animateOthers==='boolean'?p.animateOthers:true,sound:typeof p.sound==='boolean'?p.sound:true,effects:typeof p.effects==='boolean'?p.effects:true,favorites:Array.isArray(p.favorites)?[...new Set(p.favorites.filter(canSendEmote))] as string[]:[]};
 }catch{return DEFAULT;}
}
function snapshot(id:string){if(!id)return DEFAULT;let raw:string|null=null;try{raw=localStorage.getItem(key(id));}catch{return cache.get(id)?.value??DEFAULT;}
 const saved=cache.get(id);if(saved?.raw===raw)return saved.value;const value=parseEmotePreferences(raw);cache.set(id,{raw,value});return value;
}
function subscribe(notify:()=>void){window.addEventListener('storage',notify);window.addEventListener(changed,notify);return()=>{window.removeEventListener('storage',notify);window.removeEventListener(changed,notify);};}
export function useEmotePreferences(id:string){
 const get=useCallback(()=>snapshot(id),[id]);
 const prefs=useSyncExternalStore(subscribe,get,()=>DEFAULT);
 const update=useCallback((patch:Partial<EmotePreferences>)=>{if(!id)return;const value={...snapshot(id),...patch},raw=JSON.stringify(value);try{localStorage.setItem(key(id),raw);cache.delete(id);}catch{cache.set(id,{raw:null,value});}window.dispatchEvent(new Event(changed));},[id]);
 return {prefs,update};
}
