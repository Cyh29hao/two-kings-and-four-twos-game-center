import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,deal,rank,classify} from '../lib/game/engine.ts';
import {newModern,dealModern,type ModernGame} from '../lib/mahjong/modern.ts';
import {HAM,BASIC_CHIPS} from '../lib/mahjong/rules.ts';
import {fillBots,scheduleBots,nextBot,advanceBot,addRoomBot,removeRoomBot,resetRosterReady,transferHumanHost} from '../lib/practice/room.ts';
import {soloPractice} from '../lib/practice/types.ts';
import {landlordDecision,type LandlordInformation} from '../lib/practice/landlord.ts';
import {mahjongDiscard,mahjongPlan,type MahjongInformation} from '../lib/practice/mahjong.ts';
import {roundReport} from '../lib/mahjong/report.ts';
const physical=(ts:number[])=>{const counts=Array(34).fill(0);return ts.map(t=>t*4+counts[t]++);};
test('mixed seats preserve humans, reset readiness, support removing bots and never transfer ownership to a bot',()=>{
 for(const g of [newGame('host','房主'),newModern('host','房主')]){
  g.seats[0].ready=true;const bot=addRoomBot(g);assert(!g.seats[0].ready);assert(g.seats[1].ready);assert(!soloPractice(g));assert.equal(g.practice?.roomType,'mixed');
  const friend={...structuredClone(g.seats[0]),id:'friend',name:'朋友',ready:true};g.seats.push(friend as never);resetRosterReady(g);assert(!g.seats[2].ready);
  if('kind' in g)addRoomBot(g);assert.throws(()=>addRoomBot(g),/已满/);assert.throws(()=>removeRoomBot(g,'friend'),/人机/);
  removeRoomBot(g,bot);assert(g.seats.some(s=>s.id==='friend'));assert(!g.seats.find(s=>s.id==='friend')!.ready);addRoomBot(g);
  g.seats.splice(0,1);transferHumanHost(g);assert.equal(g.host,'friend');assert(g.seats.filter(s=>s.bot).every(s=>s.ready));
  g.seats=g.seats.filter(s=>s.id!=='friend') as typeof g.seats;transferHumanHost(g);assert.equal(g.phase,'closed');assert.equal(g.seats.length,0);
 }
 const g=newGame('h','H'),id=addRoomBot(g);removeRoomBot(g,id);assert(!g.practice);
 addRoomBot(g);addRoomBot(g);deal(g);assert.throws(()=>removeRoomBot(g,g.seats[1].id),/开局前/);assert.throws(()=>addRoomBot(g),/开局前/);
 const m=newModern('h','H');addRoomBot(m);addRoomBot(m);addRoomBot(m);dealModern(m);m.phase='waiting';assert.throws(()=>removeRoomBot(m,m.seats[1].id),/开局前/);
 const solo=newGame('s','S');fillBots(solo);assert(soloPractice(solo));assert.throws(()=>removeRoomBot(solo,solo.seats[1].id),/个人测试/);
});
test('practice seats are automatic, isolated and not readying the human',()=>{
 for(const g of [newGame('human','测试者'),newModern('human','测试者')]){fillBots(g);assert.equal(g.seats.filter(s=>s.bot).length,'kind' in g?3:2);assert(g.seats.slice(1).every(s=>s.ready));assert(!g.seats[0].ready);assert.equal(new Set(g.seats.map(s=>s.id)).size,g.seats.length);assert(g.seats.slice(1).every(s=>s.id.startsWith('bot:')));assert.throws(()=>fillBots(g));}
 const g=newGame('h','H');fillBots(g);deal(g);g.turn=1;scheduleBots(g,1000);assert(!advanceBot(g,1899));assert(advanceBot(g,1900));
});
test('landlord bots preserve combinations, let a teammate lead and block an imminent single',()=>{
 const base:LandlordInformation={hand:[0,1,2,4,8,12,16,20,48,52],phase:'playing',bid:1,last:null,lastIsTeammate:false,nextOpponentCount:5,opponentMinimum:5};
 const lead=landlordDecision(base);assert.equal(lead.action,'play');assert(lead.action==='play'&&lead.cards.length>1);
 assert.equal(landlordDecision({...base,last:classify([24]),lastIsTeammate:true}).action,'pass');
 const block=landlordDecision({...base,hand:[0,28,52],nextOpponentCount:1,opponentMinimum:1});assert(block.action==='play');assert.deepEqual(block.cards,[52]);
 const finish=landlordDecision({...base,hand:[0,1],last:null});assert(finish.action==='play');assert.equal(finish.cards.length,2);
 const bid=landlordDecision({...base,phase:'bidding',bid:2});assert(bid.action==='bid');assert(bid.value===0||bid.value===3);
});
test('mahjong bots count visible remaining copies and preserve wildcards',()=>{
 const hand=physical([0,1,2,9,10,11,18,19,20,3,4,5,27,28]);
 const info:MahjongInformation={hand,melds:[],wildcard:-1,remaining:45,visible:[...hand,113,114,115],river:[113,114,115],pending:null,options:{canHu:false,canPass:false,claims:[],kongs:[]}};
 assert.equal(Math.floor(mahjongDiscard(info)/4),28);
 const wild=physical([0,1,2,9,10,11,18,19,20,3,4,27,28,32]);assert.notEqual(Math.floor(mahjongDiscard({...info,hand:wild,wildcard:32,visible:wild,river:[]})/4),32);
});
test('intelligent decisions cannot change when hidden hands or wall order change',()=>{
 const g=newModern('human','H');fillBots(g);dealModern(g);const incoming=g.drawn!;g.seats[0].hand=g.seats[0].hand.filter(t=>t!==incoming);g.seats[1].hand.push(incoming);g.turn=1;g.practice!.nextAt=1;
 const original=structuredClone(g),altered=structuredClone(g);const hidden=[...altered.wall,...altered.seats[0].hand,...altered.seats[2].hand,...altered.seats[3].hand].reverse();altered.seats[0].hand=hidden.splice(0,altered.seats[0].hand.length);altered.seats[2].hand=hidden.splice(0,13);altered.seats[3].hand=hidden.splice(0,13);altered.wall=hidden;
 advanceBot(original,2);advanceBot(altered,2);assert.deepEqual(original.seats[1].river,altered.seats[1].river);
 const hand=physical([0,1,2,9,10,11,18,19,20,2,4,32,32,3]);const context={round:'same',hand,melds:[],wildcard:32,incoming:hand.at(-1)!,winType:'self' as const,flower:false,heaven:false,earth:false};assert.equal(mahjongPlan(context),mahjongPlan(structuredClone(context)));
});
test('complete robot games terminate legally, conserve cards and keep zero-sum chips',()=>{
 const times:number[]=[],summary:{game:string;rounds:number;wins:number}[]=[];
 for(const kind of ['landlord','ham','basic']){let wins=0;
  for(let i=0;i<8;i++){
   const g=kind==='landlord'?newGame('human','H'):newModern('human','H',30,kind==='ham'?HAM:BASIC_CHIPS);fillBots(g);g.seats[0].bot=true;g.practice!.botIds.push(g.seats[0].id);
   if('kind' in g)dealModern(g);else deal(g);let moves=0,now=1000;
   while(['bidding','playing','choosing'].includes(g.phase)){
    assert(++moves<500);scheduleBots(g,now);assert(nextBot(g)>=0);const start=performance.now();assert(advanceBot(g,now+900));times.push(performance.now()-start);now+=1000;
    if('kind' in g){const all=[...g.wall,...g.seats.flatMap(s=>[...s.hand,...s.river,...s.melds.flatMap(m=>m.tiles)]),...(g.result?.awards.map(a=>a.tile)||[])];assert.equal(all.length,136);assert.equal(new Set(all).size,136);assert.equal(g.seats.reduce((n,s)=>n+BigInt(s.balance),0n),4000n);}
    else{assert(g.seats.every(s=>s.hand.every(c=>Number.isInteger(c)&&rank(c)>=3)));}
   }
   assert.equal(g.phase,'finished');if(g.winner>=0)wins++;scheduleBots(g,now);assert(g.seats.every(s=>s.ready));
   if('kind' in g){const report=roundReport('人机测试',g.result!);assert(report.practice);assert(report.players.every(p=>p.bot));}
   else assert.equal(g.deltas.reduce((a,b)=>a+b,0),0);
  }summary.push({game:kind,rounds:8,wins});
 }times.sort((a,b)=>a-b);console.log({summary,decisions:times.length,p95Ms:Math.round(times[Math.floor(times.length*.95)]),maxMs:Math.round(times.at(-1)!)});
});
