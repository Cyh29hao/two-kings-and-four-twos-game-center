import test from 'node:test';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
import {EMOTES,LEGACY_EMOTES,canSendEmote,EMOTE_MS,EMOTE_COOLDOWN_MS,getEmote,emoteText} from '../lib/emotes.ts';
import {emptyBubbles,receiveBubbles,expireBubbles,type ChatMessage} from '../lib/chat-bubbles.ts';
import {validMotion} from '../lib/motion/timeline.ts';
import {mergeMessages,sameMessage} from '../lib/chat-messages.ts';
const message=(id:number,kind:'text'|'emote'='emote',senderId='a',created=1000):ChatMessage=>({id,kind,senderId,name:'同名玩家',text:kind==='text'?'你好':emoteText('hello'),emoteId:kind==='emote'?'hello':null,created,own:0});
test('stable legacy ids remain renderable; only the versioned frame pack is sendable',()=>{
 assert.equal(LEGACY_EMOTES.length,12);assert.equal(new Set(EMOTES.map(e=>e.id)).size,EMOTES.length);assert.equal(EMOTE_MS,6000);assert.equal(EMOTE_COOLDOWN_MS,3000);
 for(const e of LEGACY_EMOTES){assert(e.enabled);assert.match(e.src,/^\/emotes\/royale-v1\/[a-z]+\.webp$/);assert(!canSendEmote(e.id));}
 const next=EMOTES.filter(e=>canSendEmote(e.id));assert.equal(next.length,21);for(const e of next){assert.match(e.id,/^royale-v2-/);assert(e.frames&&validMotion(e.frames));assert.equal(e.frames.frames.length>=24,true);assert.equal(getEmote(e.id),e);assert.equal(e.audio,undefined);}
 assert.equal(getEmote('https://evil/image'),undefined);assert.equal(emoteText('missing'),'[表情：暂不可用]');assert(!canSendEmote('missing'));
});
test('text and emotes replace only their sender; emotes expire after six seconds without refresh replay',()=>{
 const baseline=receiveBubbles(emptyBubbles(),{messages:[],serverNow:1000},5000);
 const s=receiveBubbles(baseline,{messages:[message(1),message(2,'text','b')],serverNow:1500},5500);
 assert.equal(s.bubbles.a.expires,11000);assert.equal(s.bubbles.b.expires,13000);
 const again=receiveBubbles(s,{messages:[message(1)],serverNow:2000},6000);assert.equal(again.bubbles.a.expires,11000);
 const text=receiveBubbles(again,{messages:[message(3,'text','a',2000)],serverNow:2000},6000);assert.equal(text.bubbles.a.message.kind,'text');assert.equal(text.bubbles.b.message.id,2);
 const expired=expireBubbles(s,11000);assert(!expired.bubbles.a);assert(expired.bubbles.b);
});
test('initial, reconnect and background catchup advance cursor silently; subsequent messages still animate',()=>{
 const initial=receiveBubbles(emptyBubbles(),{messages:[message(1)],serverNow:1000},1000);assert.deepEqual(initial.bubbles,{});
 const resumed=receiveBubbles(initial,{messages:[message(2)],serverNow:1001,suppressReplay:true},1001);assert.deepEqual(resumed.bubbles,{});assert.equal(resumed.cursor,2);
 const live=receiveBubbles(resumed,{messages:[message(3)],serverNow:1002},1002);assert.equal(live.bubbles.a.message.id,3);
 const stale=receiveBubbles(live,{messages:[message(1)],serverNow:1003,suppressReplay:true},1003);assert.equal(stale.cursor,3);
});
test('server-relative freshness and distinct ids handle skew, duplicate names and expired animations',()=>{
 const s=receiveBubbles({cursor:0,bubbles:{}},{messages:[message(1,'emote','a',0),message(2,'emote','b',6001)],serverNow:6001},-9000);
 assert(!s.bubbles.a);assert.equal(s.bubbles.b.expires,-3000);
});
test('incremental chat deduplicates, sorts, bounds history, and separates full reloads',()=>{
 const before=Array.from({length:80},(_,i)=>message(i+1));
 const merged=mergeMessages(before,[message(82),message(80),message(81)]);assert.equal(merged.length,80);assert.equal(merged[0].id,3);assert.equal(merged.at(-1)!.id,82);
 assert.deepEqual(mergeMessages(merged,[message(1)]).map(x=>x.id),merged.map(x=>x.id));
 assert.deepEqual(mergeMessages(merged,[message(10)],true).map(x=>x.id),[10]);
 assert(sameMessage({text:'old'},{kind:'text',emoteId:null,text:'old'}));assert(!sameMessage(message(1),{...message(1),emoteId:'like'}));assert(!sameMessage(message(1),{...message(1),kind:'text'}));
});

test('every enabled emote ships as a small local WebP, including the lazy picker assets',()=>{
 let total=0;for(const e of EMOTES){const bytes=readFileSync(new URL('../public'+e.src,import.meta.url));assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');assert(bytes.length<160000);total+=bytes.length;}assert(total<1500000);
});

test('all frame sheets are local, present and bounded for on-demand loading',()=>{for(const e of EMOTES){for(const sheet of e.frames?.sheets??[]){const bytes=readFileSync(new URL('../public'+sheet.src,import.meta.url));assert.equal(bytes.toString('ascii',8,12),'WEBP');assert(bytes.length<2200000);assert(sheet.cellWidth*sheet.columns<=2048);assert(sheet.cellHeight*sheet.rows<=2048);}}});
