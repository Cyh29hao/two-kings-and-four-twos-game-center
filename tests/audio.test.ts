import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classify} from '../lib/game/engine.ts';
import {collectSounds,logCue,pokerSpeech,mahjongSpeech,actionWindow,type SoundGame,type SoundFrame} from '../lib/audio/events.ts';
import {DEFAULT_SOUND,soundPreferences} from '../lib/audio/preferences.ts';
const g=():SoundGame=>({round:'r',phase:'playing',turn:0,deadline:20000,seats:[{id:'a',name:'小明'},{id:'b',name:'小明同学'},{id:'c',name:'小北'}],log:[]});
const frame=(game:SoundGame,receivedAt=1000,code='123456'):SoundFrame=>({code,game,receivedAt,serverNow:1000});
const rs=(ranks:number[])=>{const counts=new Map<number,number>();return ranks.map(r=>{const n=counts.get(r)||0;counts.set(r,n+1);return r===16?52:r===17?53:(r-3)*4+n;});};
test('spoken poker uses the classified body, not the leading kicker; covers all legal families',()=>{
 const cases:[number[],string][]=[[[3],'三'],[[11,11],'对勾'],[[14,14,14],'三个尖'],[[4,4,4,4],'四个四，炸弹'],[[16,17],'王炸'],[[3,3,3,17],'三个三，带一张'],[[4,4,4,15,15],'三个四，带一对'],[[3,4,5,6,7],'顺子，三到七'],[[7,7,8,8,9,9],'连对，七到九'],[[3,3,3,4,4,4],'飞机，三到四'],[[3,3,3,4,4,4,15,15],'飞机带单，三到四'],[[3,3,3,4,4,4,14,14,15,15],'飞机带对，三到四'],[[3,3,3,3,17,15],'四个三，带两张'],[[3,3,3,3,14,14,15,15],'四个三，带两对']];
 for(const [cards,expected] of cases)assert.equal(pokerSpeech(classify(rs(cards))!),expected);
 assert.equal(logCue({text:'小明同学：三带一 大王 3 3 3',at:1000},g())?.speech,'三个三，带一张');
 assert.equal(logCue({text:'小明：不可信牌型 J J',at:1000},g()),null);
});
test('mahjong speech respects physical white, wildcard labels and concealed information',()=>{
 assert.equal(mahjongSpeech('4条'),'四条');assert.equal(mahjongSpeech('白（代 5万）'),'白板，代五万');assert.equal(mahjongSpeech('5万（赖）'),'五万，赖子');assert.equal(mahjongSpeech('发'),'发财');
 const game={...g(),kind:'mahjong'};assert.equal(logCue({text:'小明 打出 白（代 5万）',at:1000},game)?.speech,'白板，代五万');assert.equal(logCue({text:'小明 摸牌',at:1000},game),null);assert.equal(logCue({text:'小明 暗杠，三家各付 20 筹码',at:1000},game)?.speech,'暗杠');
});
test('public-log cursor plays new actions once, skips reconnect history and accepts bounded log rollover',()=>{
 const a=frame(g()),b=frame({...g(),log:[{text:'小明：对子 3 3',at:1000}]},2500);assert.deepEqual(collectSounds(null,b,'a'),[]);assert.equal(collectSounds(a,b,'a')[0].speech,'对三');assert.deepEqual(collectSounds(b,b,'a'),[]);assert.deepEqual(collectSounds(b,{...b,code:'654321'},'a'),[]);assert.deepEqual(collectSounds(a,{...b,receivedAt:15000},'a'),[]);
 const c=frame({...g(),log:[...b.game.log,{text:'小明同学 不出',at:1000}]},4000);assert.equal(collectSounds(b,c,'a')[0].speech,'不出');const d=frame({...g(),log:[c.game.log[1],{text:'小北 不出',at:1000}]},5500);assert.equal(collectSounds(c,d,'a')[0].speech,'不出');assert.deepEqual(collectSounds(c,frame({...g(),log:[{text:'小明：单张 4',at:1000}]}),'a'),[]);
 assert.equal(collectSounds(c,frame({...g(),round:'next',log:[{text:'发牌完成，开始叫分',at:1000}]},6000),'a')[0].effect,'deal');
});
test('kong charge and supplement create one call; local response cues never reveal opponents options',()=>{
 const game={...g(),kind:'mahjong',options:{canDiscard:false,canPass:false}},next={...game,log:[{text:'小明 暗杠，三家各付 20 筹码',at:1000},{text:'小明 杠后补牌',at:1000}]};assert.deepEqual(collectSounds(frame(game),frame(next,2500),'a').map(c=>c.speech),['暗杠']);assert.equal(actionWindow(game,'a'),'');assert(actionWindow({...game,options:{canDiscard:false,canPass:true}},'a'));assert.equal(actionWindow({...game,canChoose:false,phase:'choosing'},'a'),'');
});
test('preferences reject invalid values and preserve separate channels',()=>{const p=soundPreferences({music:false,voice:true,effects:false,musicVolume:999,voiceVolume:-5,effectsVolume:'bad',track:'https://evil.test/a.mp3'});assert.equal(p.music,false);assert.equal(p.voice,true);assert.equal(p.effects,false);assert.equal(p.musicVolume,100);assert.equal(p.voiceVolume,0);assert.equal(p.effectsVolume,DEFAULT_SOUND.effectsVolume);assert.equal(p.track,'carefree');});
