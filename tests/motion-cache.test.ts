import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createMotionAssetStore} from '../lib/motion/asset-cache.ts';
import {MOTION_ASSETS} from '../lib/motion/asset-manifest.ts';
import {ANIMATION_SOURCES,ANIMATION_BYTES} from '../lib/motion/preload.ts';
import {EMOTES} from '../lib/emotes.ts';
import {TABLE_EFFECTS} from '../lib/motion/effects.ts';

const src='/emotes/royale-v2/king-laugh/atlas.webp',origin='https://club.example',body='fake-webp';
const manifest={[src]:{revision:'rev1',bytes:body.length}};
const image=()=>new Response(body,{headers:{'Content-Type':'image/webp','Set-Cookie':'must-not-persist=1','Vary':'Cookie'}});
function fakeCache(){
 const entries=new Map<string,Response>();
 const url=(v:RequestInfo|URL)=>typeof v==='string'?v:v instanceof URL?v.href:v.url;
 return {entries,async match(v:RequestInfo|URL){return entries.get(url(v))?.clone()},async put(v:RequestInfo|URL,r:Response){entries.set(url(v),r.clone())},async delete(v:RequestInfo|URL){return entries.delete(url(v))},async keys(){return [...entries.keys()].map(u=>new Request(u))}};
}
test('art persists across page instances and replays offline without another network request',async()=>{
 const cache=fakeCache();let requests=0;
 const store=createMotionAssetStore(manifest,{origin,openCache:async()=>cache,fetch:async(url,init)=>{requests++;assert.equal(init.credentials,'omit');assert.equal(new URL(url).searchParams.get('v'),'rev1');return image();}});
 assert.equal((await store.get(src)).persisted,true);assert.equal(requests,1);
 const freshPage=createMotionAssetStore(manifest,{origin,openCache:async()=>cache,fetch:async()=>{throw Error('offline')}});
 assert.equal(await(await freshPage.get(src)).blob.text(),body);assert.equal(requests,1);assert((await freshPage.cached()).has(src));
 const saved=[...cache.entries.values()][0];assert.equal(saved.headers.get('set-cookie'),null);assert.equal(saved.headers.get('vary'),null);
});
test('ten concurrent players share a request; a failed download can retry without poisoning cache',async()=>{
 const cache=fakeCache();let calls=0,fail=true;
 const store=createMotionAssetStore(manifest,{origin,openCache:async()=>cache,fetch:async()=>{calls++;if(fail)throw Error('offline');return image();}});
 const failures=await Promise.allSettled(Array.from({length:10},()=>store.get(src)));assert(failures.every(r=>r.status==='rejected'));assert.equal(calls,1);assert.equal(cache.entries.size,0);
 fail=false;const results=await Promise.all(Array.from({length:10},()=>store.get(src)));assert(results.every(r=>r.persisted));assert.equal(calls,2);
});
test('only changed image revisions redownload, replacing the previous revision of that image',async()=>{
 const cache=fakeCache(),other='/effects/v1/hu/atlas.webp';let calls=0;
 const defs={...manifest,[other]:{revision:'same',bytes:body.length}};
 const environment={origin,openCache:async()=>cache,fetch:async()=>{calls++;return image()}};
 const before=createMotionAssetStore(defs,environment);await before.get(src);await before.get(other);
 const after=createMotionAssetStore({...defs,[src]:{revision:'rev2',bytes:body.length}},environment);await after.get(other);assert.equal(calls,2);await after.get(src);assert.equal(calls,3);assert.equal(cache.entries.size,2);
 assert([...cache.entries.keys()].every(u=>!u.includes('rev1')));
});
test('disabled storage and quota failures still return playable image data',async()=>{
 for(const mode of ['disabled','quota']){
  const cache=fakeCache();cache.put=async()=>{throw Error('QuotaExceededError')};
  const store=createMotionAssetStore(manifest,{origin,openCache:async()=>{if(mode==='disabled')throw Error('SecurityError');return cache;},fetch:async()=>image()});
  const result=await store.get(src);assert.equal(result.persisted,false);assert.equal(await result.blob.text(),body);
 }
});
test('HTML challenges, missing files, bad cache entries and unlisted URLs never become cached art',async()=>{
 const cache=fakeCache();let response=new Response('blocked',{status:403});
 const store=createMotionAssetStore(manifest,{origin,openCache:async()=>cache,fetch:async()=>response.clone()});
 for(const bad of [new Response('no',{status:404}),new Response('login',{headers:{'Content-Type':'text/html'}}),new Response('short',{headers:{'Content-Type':'image/webp'}})]){response=bad;await assert.rejects(store.get(src));assert.equal(cache.entries.size,0);}
 await assert.rejects(store.get('/api/chat'));await assert.rejects(store.get('https://other.example/private.webp'));assert.equal(cache.entries.size,0);
 cache.entries.set(store.url(src),new Response('corrupt',{headers:{'Content-Type':'image/webp'}}));response=image();assert.equal(await(await store.get(src)).blob.text(),body);
 await store.invalidate(src);assert.equal(cache.entries.size,0);
});
test('precache includes every current emote and table effect; manifest fingerprints match shipped bytes',()=>{
 for(const e of EMOTES.filter(e=>e.enabled&&e.sendable!==false)){assert(ANIMATION_SOURCES.includes(e.src));for(const sheet of e.frames?.sheets??[])assert(ANIMATION_SOURCES.includes(sheet.src));}
 for(const e of TABLE_EFFECTS){assert(ANIMATION_SOURCES.includes(e.src));for(const sheet of e.motion?.sheets??[])assert(ANIMATION_SOURCES.includes(sheet.src));}
 assert.equal(new Set(ANIMATION_SOURCES).size,ANIMATION_SOURCES.length);assert(ANIMATION_BYTES<16*1024*1024);
 for(const [src,asset]of Object.entries(MOTION_ASSETS)){const data=readFileSync(new URL('../public'+src,import.meta.url));assert.equal(asset.bytes,data.length);assert.equal(asset.revision,createHash('sha256').update(data).digest('hex').slice(0,20));}
});
