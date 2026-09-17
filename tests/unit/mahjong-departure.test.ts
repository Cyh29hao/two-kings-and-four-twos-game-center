import test from 'node:test';
import assert from 'node:assert/strict';
import {newModern,modernSeat,dealModern,timeoutModern,modernView} from '../../lib/mahjong/modern.ts';
import {requestDeparture,settleDepartures} from '../../lib/mahjong/departure.ts';
function game(){const g=newModern('p0','玩家0');g.seats=[0,1,2,3].map(i=>modernSeat('p'+i,'玩家'+i,'123456789012345678901234567890'));dealModern(g,1);return g;}
function finish(g:ReturnType<typeof game>){for(let i=0;i<600&&g.phase!=='finished';i++)timeoutModern(g,g.deadline);assert.equal(g.phase,'finished');}
test('departure keeps identities, cards, balances and deadline until settlement',()=>{
 const g=game(),before=structuredClone(g);requestDeparture(g,'p0',2);requestDeparture(g,'p0',3);
 assert.deepEqual(g.leavingIds,['p0']);assert.deepEqual(settleDepartures(g,4),[]);
 assert.equal(g.phase,'playing');assert.equal(g.deadline,before.deadline);assert.deepEqual(g.fixedIds,before.fixedIds);
 assert.deepEqual(g.seats.map(s=>[s.id,s.hand,s.balance]),before.seats.map(s=>[s.id,s.hand,s.balance]));
 assert.equal(modernView(g,'p0').options.canDiscard,false);
 const control=structuredClone(before);finish(control);finish(g);assert.deepEqual(g.seats.map(s=>s.balance),control.seats.map(s=>s.balance));
 const result=structuredClone(g.result);assert.deepEqual(settleDepartures(g,500),['p0']);assert.equal(g.host,'p1');assert.equal(g.phase,'finished');assert.deepEqual(g.result,result);assert.deepEqual(settleDepartures(g,501),[]);
 assert.throws(()=>dealModern(g),/已离桌/);assert.throws(()=>requestDeparture(g,'p0'),/已不在/);
});
test('a non-host departure leaves the table open; all departed humans close only after settlement',()=>{
 const g=game();requestDeparture(g,'p2');finish(g);const balances=g.seats.map(s=>s.balance);settleDepartures(g);
 assert.equal(g.host,'p0');assert.equal(g.phase,'finished');assert.deepEqual(g.seats.map(s=>s.balance),balances);
 for(const id of ['p0','p1','p3'])requestDeparture(g,id);
 const result=structuredClone(g.result);assert.deepEqual(settleDepartures(g).sort(),['p0','p1','p3']);assert.equal(g.phase,'closed');assert.deepEqual(g.result,result);assert.deepEqual(g.seats.map(s=>s.balance),balances);
});
test('legacy snapshots without departure metadata continue, and strangers/bots cannot depart',()=>{
 const g=game();assert.deepEqual(settleDepartures(g),[]);assert.equal(modernView(g,'p0').seats[0].leaving,false);
 assert.throws(()=>requestDeparture(g,'outsider'),/不在/);g.seats[1].bot=true;assert.throws(()=>requestDeparture(g,'p1'),/不在/);
 requestDeparture(g,'p0');g.phase='choosing';g.winner=0;assert.equal(modernView(g,'p0').canChoose,false);assert.deepEqual(settleDepartures(g),[]);
});
