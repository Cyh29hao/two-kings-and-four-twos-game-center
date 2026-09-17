import test from 'node:test';
import assert from 'node:assert/strict';
import {friendPair,roomInviteProblem} from '../../lib/club/social.ts';
test('friend pairs are unordered and reject self requests',()=>{assert.deepEqual(friendPair('b','a'),friendPair('a','b'));assert.throws(()=>friendPair('a','a'));});
test('invites respect each game capacity and fixed-roster rules',()=>{
 const seats=[{id:'a'}];
 for(const [kind,capacity] of [['landlord',3],['landlord-v3',3],['mahjong',4],['holdem',6]] as const){
  const g={kind,phase:'waiting',seats,rules:{capacity}};
  assert.equal(roomInviteProblem(g,'b'),null);
  assert.match(roomInviteProblem({...g,seats:Array.from({length:capacity},(_,i)=>({id:String(i)}))})!,/已满/);
  assert.match(roomInviteProblem({...g,phase:'playing'})!,/已经开局/);
  assert.match(roomInviteProblem({...g,phase:'closed'})!,/已结束/);
  assert.match(roomInviteProblem(g,'a')!,/已经在这桌/);
 }
 assert.match(roomInviteProblem({kind:'mahjong',phase:'waiting',seats,fixedIds:['a']})!,/已经开局/);
 assert.match(roomInviteProblem({kind:'holdem',phase:'waiting',seats,fixed:true})!,/已经开局/);
 assert.match(roomInviteProblem({kind:'landlord-v3',phase:'waiting',seats,roundNumber:1})!,/已经开局/);
 assert.match(roomInviteProblem({phase:'waiting',seats,practice:{}})!,/人机测试/);
 assert.equal(roomInviteProblem({phase:'waiting',seats,practice:{roomType:'mixed'}}),null);
});
