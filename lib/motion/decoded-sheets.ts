import {motionAssetStore} from './asset-cache.ts';
type Sheet={promise:Promise<HTMLImageElement>;users:number;used:number;bytes:number;image?:HTMLImageElement};
const sheets=new Map<string,Sheet>();
const IDLE_BYTES=32*1024*1024;
function evict(){
 let bytes=0;
 for(const [src,entry]of [...sheets].filter(([,e])=>e.users===0).sort((a,b)=>b[1].used-a[1].used)){
  bytes+=entry.bytes;
  if(bytes>IDLE_BYTES){sheets.delete(src);if(entry.image)entry.image.src='';}
 }
}
async function decode(src:string){
 const store=motionAssetStore();let objectUrl:string|undefined;
 try{
  const image=new Image();image.decoding='async';
  const url=store.supports(src)?objectUrl=URL.createObjectURL((await store.get(src)).blob):src;
  await new Promise<void>((resolve,reject)=>{
   const timer=setTimeout(()=>{image.onload=image.onerror=null;image.src='';reject(Error('动画解码超时'))},8000);
   const done=(error?:unknown)=>{clearTimeout(timer);image.onload=image.onerror=null;error?reject(error):resolve();};
   image.onerror=()=>done(Error('动画图片无法解码'));
   image.src=url;
   if(typeof image.decode==='function')void image.decode().then(()=>done(),done);
   else {image.onload=()=>done();if(image.complete&&image.naturalWidth)done();}
  });
  return image;
 }catch(error){if(store.supports(src))await store.invalidate(src);throw error;}
 finally{if(objectUrl)URL.revokeObjectURL(objectUrl);}
}
export function retainMotionSheet(src:string){
 let entry=sheets.get(src);
 if(!entry){
  entry={promise:decode(src),users:0,used:Date.now(),bytes:0};const current=entry;sheets.set(src,current);
  void current.promise.then(image=>{current.image=image;current.bytes=image.naturalWidth*image.naturalHeight*4;evict();},()=>{if(sheets.get(src)===current)sheets.delete(src)});
 }
 entry.users++;entry.used=Date.now();let released=false;
 return {promise:entry.promise,release:()=>{if(released)return;released=true;entry!.users--;entry!.used=Date.now();evict();}};
}
/** Pointer/focus prewarming does not send a message or start an animation. */
export function warmMotionSheet(src:string){const held=retainMotionSheet(src);void held.promise.finally(held.release).catch(()=>{});}
