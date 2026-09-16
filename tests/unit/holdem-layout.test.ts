import {test} from 'node:test';
import assert from 'node:assert/strict';
import {holdemSeatPosition} from '../../lib/holdem/layout.ts';
test('4–10 seat layouts keep readable seat bounds apart at the minimum table width',()=>{
 for(let capacity=4;capacity<=10;capacity++){
  const width=capacity>6?980:740,height=capacity>6?660:560;
  const seats=Array.from({length:capacity},(_,i)=>{const p=holdemSeatPosition(capacity,i);return {x:p.x*width/100,y:p.y*height/100}});
  for(const [i,a] of seats.entries()){
   assert(a.x-66>=0&&a.x+66<=width&&a.y-98>=0&&a.y+98<=height,`${capacity} seats: seat ${i} stays in table`);
   for(const b of seats.slice(i+1))assert(Math.abs(a.x-b.x)>=132||Math.abs(a.y-b.y)>=196,`${capacity} seats: seat panels must not overlap`);
  }
 }
});
