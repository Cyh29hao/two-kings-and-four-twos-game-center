import {EMOTES} from '../emotes.ts';
import {TABLE_EFFECTS} from './effects.ts';
import {MOTION_ASSETS} from './asset-manifest.ts';
import {motionAssetStore} from './asset-cache.ts';

export const ANIMATION_SOURCES=[...new Set([
 ...EMOTES.filter(e=>e.enabled&&e.sendable!==false).flatMap(e=>[e.src,...(e.frames?.sheets.map(s=>s.src)??[])]),
 ...TABLE_EFFECTS.flatMap(e=>[e.src,...(e.motion?.sheets.map(s=>s.src)??[])]),
])];
export const ANIMATION_BYTES=ANIMATION_SOURCES.reduce((n,src)=>n+MOTION_ASSETS[src].bytes,0);
type Progress={status:'idle'|'running'|'done'|'partial'|'unavailable';completed:number;total:number};
const initial:Progress={status:'idle',completed:0,total:ANIMATION_SOURCES.length};
let progress=initial,job:Promise<void>|undefined;
const listeners=new Set<()=>void>();
function update(next:Progress){progress=next;for(const listener of listeners)listener();}
export const animationCacheSnapshot=()=>progress;
export const animationCacheServerSnapshot=()=>initial;
export function subscribeAnimationCache(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)};}
export async function inspectAnimationCache(){
 if(job)return;
 const store=motionAssetStore();if(!await store.available()){update({...initial,status:'unavailable'});return;}
 const cached=await store.cached(),completed=ANIMATION_SOURCES.filter(src=>cached.has(src)).length;
 if(!job)update({...initial,completed,status:completed===initial.total?'done':'idle'});
}
async function idle(){
 if(document.hidden)await new Promise<void>(resolve=>{
  const visible=()=>{if(!document.hidden){document.removeEventListener('visibilitychange',visible);resolve();}};
  document.addEventListener('visibilitychange',visible);visible();
 });
 await new Promise<void>(resolve=>{
  if('requestIdleCallback'in window)window.requestIdleCallback(()=>resolve(),{timeout:1000});else setTimeout(resolve,60);
 });
}
/** One low-priority download at a time, shared by all three games and the gallery. */
export function cacheAllAnimations(){
 if(job)return job;
 job=(async()=>{
  const store=motionAssetStore();if(!await store.available()){update({...initial,status:'unavailable'});return;}
  const saved=await store.cached();let completed=ANIMATION_SOURCES.filter(src=>saved.has(src)).length;
  update({...initial,status:'running',completed});
  for(const src of ANIMATION_SOURCES){
   if(saved.has(src))continue;
   await idle();
   try{if((await store.get(src)).persisted)completed++;}catch{/* A bad asset does not stop the rest of the pack. */}
   update({...initial,status:'running',completed});
  }
  update({...initial,status:completed===initial.total?'done':'partial',completed});
 })().catch(()=>update({...progress,status:'partial'})).finally(()=>{job=undefined});
 return job;
}
export function allowAutomaticAnimationCache(){
 const connection=(navigator as Navigator&{connection?:{saveData?:boolean;effectiveType?:string}}).connection;
 return !connection?.saveData&&!['slow-2g','2g'].includes(connection?.effectiveType??'');
}
