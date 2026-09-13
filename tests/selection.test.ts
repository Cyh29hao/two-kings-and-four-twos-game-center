import {test} from 'node:test';
import assert from 'node:assert/strict';
import {crossedCards,brushSelection} from '../lib/game/selection.ts';
const regions=Array.from({length:20},(_,id)=>({id,left:(id%10)*27,right:(id%10)*27+27,top:Math.floor(id/10)*92,bottom:Math.floor(id/10)*92+68}));
test('a single fast pointer event selects every crossed card in both directions',()=>{
 assert.deepEqual(crossedCards(regions,{x:-50,y:20},{x:400,y:20}),Array.from({length:10},(_,i)=>i));
 assert.deepEqual(crossedCards(regions,{x:400,y:20},{x:-50,y:20}),Array.from({length:10},(_,i)=>9-i));
 assert.deepEqual(crossedCards(regions,{x:12,y:-20},{x:12,y:190}),[0,10]);
 assert.deepEqual(crossedCards(regions,{x:-50,y:77},{x:400,y:77}),[]);
});
test('revisiting cards never toggles selection, mixed selection is painted in one direction',()=>{
 const seen=new Set<number>();let selection=brushSelection([4,18],[0,1,2,3,4,5],true,seen);selection=brushSelection(selection,[5,4,3,2,1,0],true,seen);assert.deepEqual([...selection].sort((a,b)=>a-b),[0,1,2,3,4,5,18]);
 const cancel=new Set<number>();selection=brushSelection(selection,[1,2,3,4,5,6,7],false,cancel);selection=brushSelection(selection,[7,6,5,4,3,2,1],false,cancel);assert.deepEqual([...selection].sort((a,b)=>a-b),[0,18]);
});
