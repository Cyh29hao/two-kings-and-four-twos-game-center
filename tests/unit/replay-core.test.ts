import assert from 'node:assert/strict';
import test from 'node:test';
import {captureReplay,finishReplay} from '../../lib/replay/capture.ts';
import type {ReplayState} from '../../lib/replay/types.ts';

test('capture stores private cards in a detached scene and advances sequence',()=>{
 const g:{round:string;phase:string;turn:number;seats:{name:string;bot?:boolean;hand:number[]}[];bottom:number[];last:{cards:number[]}|null;replay?:ReplayState}={round:'round-1',phase:'playing',turn:0,seats:[{name:'甲',hand:[1,2]},{name:'乙',bot:true,hand:[3,4]}],bottom:[50,51],last:null};
 captureReplay(g,'发牌',undefined,100);
 assert.deepEqual(g.replay?.pending[0],{
  at:100,action:'发牌',scene:{game:'landlord',phase:'playing',turn:0,seats:[{name:'甲',hand:[1,2]},{name:'乙',bot:true,hand:[3,4]}],bottom:[50,51]}
 });
 g.seats[0].hand.pop();g.last={cards:[2]};captureReplay(g,'甲：单张 2',0,110);
 assert.deepEqual(g.replay?.pending[0].scene.seats[0].hand,[1,2]);
 assert.deepEqual(g.replay?.pending[1].scene.last,[2]);
 assert.equal(g.replay?.nextSeq,2);
});

test('new rounds reset capture and finish marks only current round complete',()=>{
 const g:{kind:string;round:string;phase:string;turn:number;wildcard:number;seats:{name:string;hand:number[];river:number[];melds:[]}[];wall:number[];replay?:ReplayState}={kind:'mahjong',round:'first',phase:'playing',turn:0,wildcard:12,seats:[{name:'甲',hand:[1],river:[],melds:[]}],wall:[2,3]};
 captureReplay(g,'发牌',undefined,100);
 g.phase='finished';finishReplay(g,120);
 assert.equal(g.replay?.pending.length,2);
 assert.equal(g.replay?.complete,true);
 assert.equal(g.replay?.pending[1].scene.wildcard,12);
 assert.equal(g.replay?.pending[1].scene.wallRemaining,2);
 g.round='second';g.phase='playing';captureReplay(g,'发牌',undefined,200);
 assert.equal(g.replay?.roundId,'second');
 assert.equal(g.replay?.nextSeq,1);
 assert.equal(g.replay?.complete,undefined);
});

test('finish does not add a duplicate terminal scene',()=>{
 const g:{kind:string;round:string;phase:string;street:string;seats:{name:string;hand:number[];stack:string;bet:string;total:string;folded:boolean}[];replay?:ReplayState}={kind:'holdem',round:'holdem-1',phase:'finished',street:'river',seats:[{name:'甲',hand:[1,2],stack:'100',bet:'0',total:'20',folded:false}]};
 captureReplay(g,'结算',undefined,100);
 finishReplay(g,100);
 assert.equal(g.replay?.pending.length,1);
 assert.equal(g.replay?.pending[0].scene.pot,'20');
});
