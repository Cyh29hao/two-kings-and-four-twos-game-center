import test from 'node:test';
import assert from 'node:assert/strict';
import {bidV3,buyV3Equipment,finishShopping,newLandlordV3,playV3,readyV3,sellV3Equipment,type V3Game} from '../../lib/game/landlord-v3.ts';

function game(){const g=newLandlordV3('a','甲',30);g.seats.push({id:'b',name:'乙',hand:[],ready:false,plays:0,last:''},{id:'c',name:'丙',hand:[],ready:false,plays:0,last:''});return g;}
function begin(g:V3Game){for(let seat=0;seat<3;seat++)readyV3(g,seat,1000);assert.equal(g.phase,'shopping');}
function bidding(g:V3Game){for(let seat=0;seat<3;seat++)finishShopping(g,seat,1100);assert.equal(g.phase,'bidding');}
function cards(...ranks:number[]){const used=new Map<number,number>();return ranks.map(rank=>{if(rank===16)return 52;if(rank===17)return 53;const usedAt=used.get(rank)||0;used.set(rank,usedAt+1);return(rank-3)*4+usedAt;});}
function playing(g:V3Game,{landlord=0,stake='2',coins=['0','5','5'],dealer=0}:{landlord?:number;stake?:string;coins?:string[];dealer?:number}={}){g.phase='playing';g.landlord=landlord;g.stake=stake;g.bid=stake;g.coins=[...coins];g.dealer=dealer;g.turn=landlord;g.bottom=[];g.last=null;g.passes=0;g.tableActions=[null,null,null];g.firstFinisher=-1;g.roundNumber=1;g.suddenDeath=false;g.champion=-1;g.victoryPoints=['0','0','0'];}

test('v3 stores coins as decimal strings, shop limits ownership, sells correctly, and carries equipment to the next hand',()=>{
 const g=game();begin(g);const offers=g.shops[0].offers;
 for(let n=0;n<8;n++){g.coins[0]='99';buyV3Equipment(g,0,offers[n].offerId,1200+n);}assert.equal(g.equipment[0].length,8);assert.throws(()=>buyV3Equipment(g,0,offers[8].offerId),/最多持有/);
 const levelOne=g.equipment[0].find(item=>item.level===1)!;const before=g.coins[0];sellV3Equipment(g,0,levelOne.instanceId);assert.equal(g.coins[0],before);
 const levelTwo=g.equipment[0].find(item=>item.level===2)!;const beforeTwo=BigInt(g.coins[0]);sellV3Equipment(g,0,levelTwo.instanceId);assert.equal(BigInt(g.coins[0]),beforeTwo+1n);
 bidding(g);while(g.phase==='bidding')bidV3(g,g.turn,false,1300);assert.equal(g.phase,'playing');g.phase='finished';g.seats.forEach(player=>player.ready=false);for(let seat=0;seat<3;seat++)readyV3(g,seat,1400);assert.equal(g.phase,'shopping');assert(g.equipment[0].length>0);assert.notEqual(g.shops[0].offers[0].offerId,offers[0].offerId);
});

test('v3 escrow refunds a replaced bidder and no-call handling selects the richest clockwise from dealer or the dealer at zero',()=>{
 const g=game();begin(g);bidding(g);g.dealer=0;g.turn=0;g.coins=['3','3','0'];bidV3(g,0,true,1200);assert.equal(g.coins[0],'2');bidV3(g,1,true,1201);assert.equal(g.coins[0],'3');assert.equal(g.coins[1],'1');bidV3(g,2,false,1202);bidV3(g,0,false,1203);assert.equal(g.phase,'playing');assert.equal(g.landlord,1);assert.equal(g.stake,'2');
 const allPass=game();begin(allPass);bidding(allPass);allPass.dealer=1;allPass.turn=1;allPass.coins=['5','5','1'];for(let n=0;n<3;n++)bidV3(allPass,allPass.turn,false,1300+n);assert.equal(allPass.landlord,1);assert.equal(allPass.stake,'1');assert.equal(allPass.coins[1],'4');
 const zero=game();begin(zero);bidding(zero);zero.dealer=2;zero.turn=2;zero.coins=['0','0','0'];for(let n=0;n<3;n++)bidV3(zero,zero.turn,false,1400+n);assert.equal(zero.landlord,2);assert.equal(zero.stake,'0');
});

test('v3 settlement handles even and odd stakes, remaining-card ordering, and insufficient farmer balances',()=>{
 const even=game();playing(even,{stake:'2',coins:['0','1','10']});even.seats[0].hand=cards(3);even.seats[1].hand=cards(4,5);even.seats[2].hand=cards(6,7,8);playV3(even,0,cards(3),1500);assert.deepEqual(even.coins,['7','1','9']);assert.deepEqual(even.victoryPoints,['1','0','0']);
 const odd=game();playing(odd,{stake:'3',coins:['0','9','9'],dealer:0});odd.seats[0].hand=cards(3);odd.seats[1].hand=cards(4,5);odd.seats[2].hand=cards(6,7);playV3(odd,0,cards(3),1600);assert.deepEqual(odd.coins,['10','7','8']);
 const farmers=game();playing(farmers,{stake:'3',coins:['0','0','0']});farmers.seats[0].hand=cards(3,4);farmers.seats[1].hand=cards(5);farmers.seats[2].hand=cards(6);farmers.turn=1;playV3(farmers,1,cards(5),1700);assert.deepEqual(farmers.coins,['1','4','2']);assert.deepEqual(farmers.victoryPoints,['0','0.5','0.5']);
});

test('two farmers reaching four victory points together award the table to the first player out',()=>{
 const g=game();playing(g,{stake:'0',coins:['0','0','0']});g.victoryPoints=['3','3.5','3.5'];g.seats[0].hand=cards(3,4);g.seats[1].hand=cards(5);g.seats[2].hand=cards(6);g.turn=1;
 playV3(g,1,cards(5),1750);assert.deepEqual(g.victoryPoints,['3','4','4']);assert.equal(g.firstFinisher,1);assert.equal(g.champion,1);
});

test('v3 reaches sudden death after twelve regular hands, deals all 54 unique cards, and awards no sudden-death coins',()=>{
 const g=game();g.phase='finished';g.roundNumber=12;g.coins=['5','6','7'];g.seats.forEach(player=>player.ready=false);for(let seat=0;seat<3;seat++)readyV3(g,seat,1800);assert.equal(g.phase,'playing');assert.equal(g.suddenDeath,true);assert.equal(g.bottom.length,0);assert(g.seats.every(player=>player.hand.length===18));assert.equal(new Set(g.seats.flatMap(player=>player.hand)).size,54);
 const before=[...g.coins];g.turn=0;g.seats[0].hand=[0];g.seats[1].hand=[1];g.seats[2].hand=[2];playV3(g,0,[0],1900);assert.equal(g.champion,0);assert.deepEqual(g.coins,before);assert.equal(g.victoryPoints.join(','),'0,0,0');
});

test('v3 standard play keeps physical cards unique and rejects stale turn actions',()=>{
 const g=game();playing(g);g.seats[0].hand=cards(3);g.seats[1].hand=cards(4);g.seats[2].hand=cards(5);assert.throws(()=>playV3(g,1,cards(4)),/还没轮到/);playV3(g,0,cards(3),2000);assert.equal(g.winner,0);assert.equal(g.seats[0].hand.length,0);
});
