import test from 'node:test';
import assert from 'node:assert/strict';
import {chatSignal,deliverChatSignal,type ChatSignal} from '../../lib/chat-send.ts';
import {emptyBubbles,receiveBubbles,type ChatMessage,type ChatReceipt,type ChatSnapshot} from '../../lib/chat-bubbles.ts';
import {mergePolledMessages} from '../../lib/chat-messages.ts';

const clientId='ea2d4d88-6021-42bd-bd61-9f7b7f17c2ac';
const own:ChatMessage={id:12,clientId,senderId:'me',name:'我',text:'[表情：国王大笑]',created:1000,own:1,kind:'emote',emoteId:'royale-v2-king-laugh'};
const friend:ChatMessage={id:11,clientId:'another-id',senderId:'friend',name:'朋友',text:'你好',created:1000,own:0,kind:'text'};
const payload={kind:'emote' as const,emoteId:own.emoteId!};
const receipt:ChatReceipt={sent:true,message:own,serverNow:1000,emoteReadyAt:4000};
const baseline=()=>receiveBubbles(emptyBubbles(),{messages:[],cursor:10,serverNow:1000},1000);
const echo=(delivery:ChatSnapshot['delivery'],message=own):ChatSnapshot=>({delivery,messages:[message],serverNow:1000});
function deferred<T>(){let resolve!:(value:T)=>void,reject!:(error:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject};}

test('a click sends a tiny ID signal and previews immediately without waiting for transport or media',async()=>{
 const network=deferred<ChatReceipt>(),snapshots:ChatSnapshot[]=[],receipts:ChatReceipt[]=[],bodies:ChatSignal[]=[];
 const sending=deliverChatSignal({code:'123456',userId:'me',clientId,payload,signal:new AbortController().signal,now:()=>1000,
  post:body=>{bodies.push(body);return network.promise},snapshot:s=>snapshots.push(s),receipt:r=>receipts.push(r)});
 assert.equal(snapshots[0].delivery,'preview');assert.equal(receipts.length,0);
 assert.deepEqual(bodies,[{code:'123456',clientId,kind:'emote',emoteId:own.emoteId}]);
 assert(Buffer.byteLength(JSON.stringify(bodies[0]))<200);
 network.resolve(receipt);await sending;assert.deepEqual(receipts,[receipt]);
 // Polling and image loaders are deliberately not dependencies of the delivery path.
 assert.deepEqual(chatSignal('123456',clientId,{...payload,src:'/large.webp'} as typeof payload),bodies[0]);
});

test('POST receipt does not skip an earlier friend message; receipt and poll never restart the preview',()=>{
 let state=receiveBubbles(baseline(),echo('preview',{...own,id:0}),1000);
 const expires=state.bubbles.me.expires;
 state=receiveBubbles(state,echo('receipt'),1200);
 assert.equal(state.cursor,10);assert.equal(state.bubbles.me.expires,expires);assert.equal(state.bubbles.me.pending,false);
 state=receiveBubbles(state,{messages:[friend,own],serverNow:1200,cursor:12},1200);
 assert.equal(state.cursor,12);assert.equal(state.bubbles.friend.message.id,11);assert.equal(state.bubbles.me.expires,expires);
 state=receiveBubbles(state,echo('receipt'),1300);assert.equal(state.bubbles.me.expires,expires);
 state=receiveBubbles(state,{messages:[own],serverNow:9000},9000);assert(!state.bubbles.me);
 state=receiveBubbles(state,echo('receipt'),9001);assert(!state.bubbles.me);
});

test('poll before acknowledgement confirms once, including text messages with no local preview',()=>{
 let state=receiveBubbles(baseline(),{messages:[own],cursor:12,serverNow:1000},1000);
 const expires=state.bubbles.me.expires;
 state=receiveBubbles(state,echo('receipt'),1500);assert.equal(state.bubbles.me.expires,expires);
 const preview=receiveBubbles(baseline(),echo('preview',{...own,id:0}),1000);
 const confirmed=receiveBubbles(preview,{messages:[own],cursor:12,serverNow:1000},1001);
 assert.equal(confirmed.bubbles.me.pending,false);
 // A timed-out POST cannot withdraw an already confirmed message.
 assert(receiveBubbles(confirmed,echo('failed'),1002).bubbles.me);
});

test('failure withdraws only its own pending bubble; same-ID retry cannot replay or replace a newer message',()=>{
 const preview=receiveBubbles(baseline(),echo('preview',{...own,id:0}),1000);
 const failed=receiveBubbles(preview,echo('failed'),1100);assert(!failed.bubbles.me);
 const retried=receiveBubbles(failed,echo('preview',{...own,id:0}),1200);assert(!retried.bubbles.me);
 const nextMessage={...own,id:13,clientId:'new-message'};
 const newer=receiveBubbles(preview,echo('preview',nextMessage),4000);
 assert.equal(receiveBubbles(newer,echo('failed'),4001).bubbles.me.message.clientId,'new-message');
 assert.equal(receiveBubbles(newer,echo('receipt'),4002).bubbles.me.message.clientId,'new-message');
});

test('late receipts cannot replace a newer bubble from another device on the same account',()=>{
 const newer={...own,id:15,clientId:'second-device'};
 const state=receiveBubbles(baseline(),{messages:[newer],cursor:15,serverNow:1000},1000);
 assert.equal(receiveBubbles(state,echo('receipt'),1100).bubbles.me.message.id,15);
});

test('reconnect only restores history, and a stale full GET cannot erase an acknowledged message',()=>{
 const withReceipt=receiveBubbles(baseline(),echo('receipt'),1000);
 const quiet=receiveBubbles(withReceipt,{messages:[friend,own],serverNow:1000,suppressReplay:true},1200);
 assert.deepEqual(quiet.bubbles,{});
 assert.deepEqual(receiveBubbles(quiet,echo('receipt'),1300).bubbles,{});
 assert.deepEqual(mergePolledMessages([own],[friend],[own],true),[friend,own]);
 assert.equal(mergePolledMessages([own],[friend,own],[own]).length,2);
});

test('delivery failures are reported, retries keep their ID, and room switches discard late acknowledgements',async()=>{
 const network=deferred<ChatReceipt>(),controller=new AbortController(),snapshots:ChatSnapshot[]=[],receipts:ChatReceipt[]=[];
 const opts={code:'123456',userId:'me',clientId,payload,signal:controller.signal,now:()=>1000,
  post:()=>network.promise,snapshot:(s:ChatSnapshot)=>snapshots.push(s),receipt:(r:ChatReceipt)=>receipts.push(r)};
 const sending=deliverChatSignal(opts);controller.abort();network.resolve(receipt);await sending;
 assert.equal(receipts.length,0);assert.equal(snapshots.length,1);
 const sentIds:string[]=[];
 for(let i=0;i<2;i++)await assert.rejects(deliverChatSignal({...opts,signal:new AbortController().signal,post:async body=>{sentIds.push(body.clientId);throw Error('offline')}}),/offline/);
 assert.deepEqual(sentIds,[clientId,clientId]);assert.equal(snapshots.at(-1)?.delivery,'failed');
});
