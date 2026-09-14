import test from 'node:test';
import assert from 'node:assert/strict';
import {BUBBLE_MS,emptyBubbles,expireBubbles,receiveBubbles,type ChatMessage} from '../lib/chat-bubbles.ts';
const message=(id:number,senderId='player-a',created=10000,text='一起玩吧'):ChatMessage=>({id,senderId,name:'同名牌友',created,text,own:0});
const baseline=()=>receiveBubbles(emptyBubbles(),{messages:[message(1)],serverNow:10000},100000);
test('initial load and room re-entry keep history in chat without replaying head bubbles',()=>{
 const history=[message(1),message(2)];const first=receiveBubbles(emptyBubbles(),{messages:history,serverNow:10001},100000);
 assert.equal(first.cursor,2);assert.deepEqual(first.bubbles,{});
 const reentry=receiveBubbles(emptyBubbles(),{messages:[...history,message(3)],serverNow:10002},100100);assert.deepEqual(reentry.bubbles,{});
});
test('same-name players retain separate bubbles; each sender keeps the latest message in ID order',()=>{
 const messages=[message(4,'player-a',10100,'最后一条'),message(2),message(3,'player-b',10100,'<script>只是文本</script>')];
 const next=receiveBubbles(baseline(),{messages,serverNow:10200},100200);
 assert.equal(next.bubbles['player-a'].message.id,4);assert.equal(next.bubbles['player-b'].message.id,3);assert.equal(Object.keys(next.bubbles).length,2);
 assert.equal(next.bubbles['player-b'].message.text,'<script>只是文本</script>');
});
test('repeated and out-of-order polls never renew a bubble or resurrect expired messages',()=>{
 const snapshot={messages:[message(1),message(2)],serverNow:10500};const live=receiveBubbles(baseline(),snapshot,100000),expiry=live.bubbles['player-a'].expires;
 assert.equal(expiry,100000+BUBBLE_MS-500);
 const duplicate=receiveBubbles(live,snapshot,101000);assert.equal(duplicate.bubbles['player-a'].expires,expiry);
 const stale=receiveBubbles(duplicate,{messages:[message(1)],serverNow:10400},101100);assert.equal(stale.cursor,2);assert.equal(stale.bubbles['player-a'].message.id,2);
 const expired=expireBubbles(stale,expiry);assert.deepEqual(expired.bubbles,{});assert.deepEqual(receiveBubbles(expired,snapshot,expiry+1000).bubbles,{});
});
test('server-relative freshness ignores clock skew and skips old messages after background/reconnect',()=>{
 const next=receiveBubbles(baseline(),{messages:[message(2,'player-a',20000),message(3,'player-b',28000)],serverNow:28000},-300000);
 assert(!next.bubbles['player-a']);assert.equal(next.bubbles['player-b'].expires,-300000+BUBBLE_MS);
 const legacy=message(4);delete legacy.senderId;assert.deepEqual(receiveBubbles(next,{messages:[legacy],serverNow:28001},-299999).bubbles,next.bubbles);
});
test('new messages update only their sender while the other player expires independently',()=>{
 const both=receiveBubbles(baseline(),{messages:[message(2),message(3,'player-b')],serverNow:10000},100000);
 const next=receiveBubbles(both,{messages:[message(4,'player-a',16000)],serverNow:16000},106000);
 assert.equal(next.bubbles['player-a'].expires,114000);assert.equal(next.bubbles['player-b'].expires,108000);
 const expiry=expireBubbles(next,108000);assert.equal(expiry.bubbles['player-a'].message.id,4);assert(!expiry.bubbles['player-b']);
});
