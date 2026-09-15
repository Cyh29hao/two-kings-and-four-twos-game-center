import {test} from 'node:test';import assert from 'node:assert/strict';
import {NavigationGuard,internalHref,shouldHandleLink} from '../lib/club/navigation.ts';
test('stalled navigation opens its actual destination once after eight seconds',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const calls:unknown[]=[];const guard=new NavigationGuard((...args)=>calls.push(args));
 guard.start('/mahjong');t.mock.timers.tick(7999);assert.deepEqual(calls,[]);t.mock.timers.tick(1);assert.deepEqual(calls,[['/mahjong',false]]);t.mock.timers.tick(8000);assert.equal(calls.length,1);
});
test('successful navigation does not reload a healthy page',t=>{
 t.mock.timers.enable({apis:['setTimeout']});let calls=0;const guard=new NavigationGuard(()=>calls++);guard.start('/history?game=mahjong');guard.complete('/history?game=mahjong');t.mock.timers.tick(16000);assert.equal(calls,0);
});
test('rapid clicks and late errors cannot reopen an obsolete destination',t=>{
 t.mock.timers.enable({apis:['setTimeout']});const calls:unknown[]=[];const guard=new NavigationGuard((...args)=>calls.push(args));const old=guard.start('/mahjong');t.mock.timers.tick(1000);guard.start('/holdem',true);guard.fail(old);guard.complete('/mahjong');t.mock.timers.tick(7000);assert.deepEqual(calls,[]);t.mock.timers.tick(1000);assert.deepEqual(calls,[['/holdem',true]]);
});
test('back navigation and page unmount cancel pending recovery',t=>{
 t.mock.timers.enable({apis:['setTimeout']});let calls=0;const guard=new NavigationGuard(()=>calls++);guard.start('/history');guard.cancel();t.mock.timers.tick(16000);assert.equal(calls,0);
});
test('normal links preserve modified clicks, new tabs, downloads and external destinations',()=>{
 const plain={defaultPrevented:false,button:0,metaKey:false,ctrlKey:false,shiftKey:false,altKey:false};assert(shouldHandleLink(plain));
 for(const key of ['defaultPrevented','metaKey','ctrlKey','shiftKey','altKey'])assert(!shouldHandleLink({...plain,[key]:true}));assert(!shouldHandleLink({...plain,button:1}));assert(!shouldHandleLink(plain,'_blank'));assert(!shouldHandleLink(plain,undefined,true));
 assert.equal(internalHref('/history?game=mahjong','https://club.test'),'/history?game=mahjong');for(const href of ['https://other.test/','//other.test/','javascript:alert(1)','data:text/html,x'])assert.equal(internalHref(href,'https://club.test'),null);
});
