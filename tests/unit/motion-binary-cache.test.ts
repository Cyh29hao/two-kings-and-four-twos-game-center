import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOTION_ASSETS} from '../../lib/motion/asset-manifest.ts';
import {createMotionAssetStore} from '../../lib/motion/asset-cache.ts';
import {ANIMATION_SOURCES,createAnimationPreloader} from '../../lib/motion/preload.ts';
const src='/emotes/royale-v2/king-laugh/atlas.webp';
const bytes=readFileSync(new URL('../../public'+src,import.meta.url));
const manifest={[src]:MOTION_ASSETS[src]},origin='https://club.example';
function cache(){const entries=new Map<string,Response>();return {async match(key:RequestInfo|URL){return entries.get(String(key))?.clone()},async put(key:RequestInfo|URL,value:Response){entries.set(String(key),value.clone())},async delete(key:RequestInfo|URL){return entries.delete(String(key))},async keys(){return [...entries.keys()].map(key=>new Request(key))}};}
test('automatic queue saves Sites binary WebP and a fresh page reuses it offline',async()=>{
 const storage=cache();let requests=0,completed=0;
 const store=createMotionAssetStore(manifest,{origin,openCache:async()=>storage,fetch:async()=>{requests++;return new Response(bytes,{headers:{'Content-Type':'application/octet-stream'}})}});
 const queue=createAnimationPreloader([src],manifest,{store:()=>store,idle:async()=>{},publish:s=>{completed=s.completed;}});
 await queue.run(false);assert.equal(completed,1);assert.equal(requests,1);
 const fresh=createMotionAssetStore(manifest,{origin,openCache:async()=>storage,fetch:async()=>{throw Error('offline')}});
 const result=await fresh.get(src);assert.equal(result.persisted,true);assert.equal(result.blob.type,'image/webp');assert.deepEqual(Buffer.from(await result.blob.arrayBuffer()),bytes);
});
test('generic binary must match both WebP signature and current content hash',async()=>{
 for(const mode of ['html','changed']){const storage=cache(),bad=Buffer.from(bytes);if(mode==='html')bad.write('<html>oops!!',0);else bad[bad.length-1]^=1;
 const store=createMotionAssetStore(manifest,{origin,openCache:async()=>storage,fetch:async()=>new Response(bad,{headers:{'Content-Type':'application/octet-stream'}})});
 await assert.rejects(store.get(src));assert.equal((await storage.keys()).length,0);
 }
});

test('all active shipped animations complete automatic caching with binary MIME',async()=>{
 const storage=cache();let completed=0,status='',requests=0;
 const store=createMotionAssetStore(MOTION_ASSETS,{origin,openCache:async()=>storage,fetch:async url=>{
  requests++;
  const body=readFileSync(new URL('../../public'+new URL(url).pathname,import.meta.url));
  return new Response(body,{headers:{'Content-Type':'Application/Octet-Stream; charset=binary'}});
 }});
 const queue=createAnimationPreloader(ANIMATION_SOURCES,MOTION_ASSETS,{store:()=>store,idle:async()=>{},publish:s=>{completed=s.completed;status=s.status;}});
 await queue.run(false);
 assert.equal(status,'done');assert.equal(completed,ANIMATION_SOURCES.length);assert.equal(requests,ANIMATION_SOURCES.length);
 await queue.run(false);assert.equal(requests,ANIMATION_SOURCES.length);
 for(const src of ANIMATION_SOURCES)assert.equal((await store.get(src)).blob.type,'image/webp');
});
