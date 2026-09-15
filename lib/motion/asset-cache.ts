import {MOTION_ASSETS} from './asset-manifest.ts';

export const MOTION_CACHE_NAME='yule-motion-images-v1';
type Manifest=Record<string,{revision:string;bytes:number}>;
type ImageCache=Pick<Cache,'match'|'put'|'delete'|'keys'>;
type CacheResult={blob:Blob;persisted:boolean};
type Environment={origin:string;openCache:()=>Promise<ImageCache|null>;fetch:(url:string,init:RequestInit)=>Promise<Response>};

/** Only known, public artwork enters this cache. No service worker or API interception. */
export function createMotionAssetStore(manifest:Manifest,env:Environment){
 const pending=new Map<string,Promise<CacheResult>>();
 let cachePromise:Promise<ImageCache|null>|undefined;
 const cache=()=>cachePromise??=(env.openCache().catch(()=>null));
 function key(src:string){
  if(!Object.hasOwn(manifest,src)||!/^\/(?:emotes|effects)\/[a-zA-Z0-9_/-]+\.webp$/.test(src))throw Error('未知动画素材');
  const url=new URL(src,env.origin);url.searchParams.set('v',manifest[src].revision);return url.href;
 }
 async function imageBlob(response:Response,src:string){
  if(response.status!==200||!/^image\/webp(?:;|$)/i.test(response.headers.get('content-type')??''))throw Error('动画素材暂不可用');
  const blob=await response.blob();if(blob.size!==manifest[src].bytes)throw Error('动画素材尚未更新完成');return blob;
 }
 async function load(src:string):Promise<CacheResult>{
  const url=key(src),storage=await cache();
  if(storage){
   const hit=await storage.match(url).catch(()=>undefined);
   if(hit){try{return {blob:await imageBlob(hit,src),persisted:true};}catch{await storage.delete(url).catch(()=>false);}}
  }
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  let blob:Blob;
  try{blob=await imageBlob(await env.fetch(url,{credentials:'omit',cache:'force-cache',signal:controller.signal}),src);}finally{clearTimeout(timer);}
  let persisted=false;
  if(storage){
   try{
    // Store image data only, without response cookies, auth headers or Vary rules.
    await storage.put(url,new Response(blob,{headers:{'Content-Type':'image/webp'}}));persisted=true;
    // Old image revisions are retired individually; other assets remain reusable.
    const previous=await storage.keys();
    for(const request of previous)if(request.url!==url&&new URL(request.url).pathname===src)await storage.delete(request);
   }catch{/* Full or disabled storage must never prevent a normal playback. */}
  }
  return {blob,persisted};
 }
 return {
  supports:(src:string)=>Object.hasOwn(manifest,src),
  url:key,
  get(src:string){
   let promise=pending.get(src);if(promise)return promise;
   promise=load(src);pending.set(src,promise);
   void promise.finally(()=>{if(pending.get(src)===promise)pending.delete(src)}).catch(()=>{});
   return promise;
  },
  async available(){return !!await cache();},
  async cached(){const storage=await cache();if(!storage)return new Set<string>();const keys=new Set((await storage.keys().catch(()=>[])).map(r=>r.url));return new Set(Object.keys(manifest).filter(src=>keys.has(key(src))));},
  async invalidate(src:string){const storage=await cache();if(storage)await storage.delete(key(src)).catch(()=>false);},
 };
}
export type MotionAssetStore=ReturnType<typeof createMotionAssetStore>;
let browserStore:MotionAssetStore|undefined;
export function motionAssetStore(){
 return browserStore??=createMotionAssetStore(MOTION_ASSETS,{
  origin:window.location.origin,
  openCache:async()=>{try{return await window.caches.open(MOTION_CACHE_NAME);}catch{return null;}},
  fetch:(url,options)=>window.fetch(url,options),
 });
}
