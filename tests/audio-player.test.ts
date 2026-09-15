import {test} from 'node:test';import assert from 'node:assert/strict';
import {TableAudio,type AudioStatus} from '../lib/audio/player.ts';import {DEFAULT_SOUND} from '../lib/audio/preferences.ts';
test('audio needs a gesture, ducks music under speech, cancels hidden/stale speech and honors independent switches',async()=>{
 const original={window:globalThis.window,document:globalThis.document,Audio:globalThis.Audio,SpeechSynthesisUtterance:globalThis.SpeechSynthesisUtterance};
 class FakeAudio{static all:FakeAudio[]=[];src='';paused=true;volume=1;loop=false;preload='';plays=0;onplaying?:()=>void;onerror?:()=>void;constructor(){FakeAudio.all.push(this);}play(){this.paused=false;this.plays++;this.onplaying?.();return Promise.resolve();}pause(){this.paused=true;}load(){}removeAttribute(){this.src='';}}
 class Utterance{text:string;lang='';voice:any;rate=1;pitch=1;volume=1;onend?:()=>void;onerror?:()=>void;constructor(text:string){this.text=text;}}
 const utterances:Utterance[]=[],synth=Object.assign(new EventTarget(),{getVoices:()=>[{lang:'en-US',name:'English',localService:true},{lang:'zh-CN',name:'普通话',localService:true}],speak:(u:Utterance)=>utterances.push(u),cancel:()=>{}}),doc=Object.assign(new EventTarget(),{hidden:false});
 Object.assign(globalThis,{window:{speechSynthesis:synth},document:doc,Audio:FakeAudio,SpeechSynthesisUtterance:Utterance});let status:AudioStatus;const a=new TableAudio(s=>status=s);
 try{const prefs={...DEFAULT_SOUND,effects:false};a.configure(prefs,true);a.play([{speech:'对三',effect:'card'}]);assert.equal(FakeAudio.all.length,0);assert.equal(utterances.length,0);
 await a.unlock();const music=FakeAudio.all[0];assert.equal(music.plays,1);assert.equal(music.volume,.18);a.play([{speech:'对三',effect:'card'},{speech:'四万',effect:'tile'}]);assert.equal(utterances.length,1);assert.equal(utterances[0].voice.lang,'zh-CN');assert(music.volume<.18);utterances[0].onend?.();assert.equal(utterances[1].text,'四万');utterances[1].onend?.();assert.equal(music.volume,.18);
 a.play([{speech:'碰',effect:'claim'}]);doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));assert(music.paused);doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));assert(!music.paused);const count=utterances.length;utterances.at(-1)!.onend?.();assert.equal(utterances.length,count);
 a.configure({...prefs,voice:false},true);a.play([{speech:'暗杠',effect:'claim'}]);assert.equal(utterances.length,count);a.configure({...prefs,music:false},true);assert(music.paused);a.play([{speech:'东风',effect:'tile'}]);assert.equal(utterances.at(-1)!.text,'东风');a.configure({...prefs,enabled:false},true);assert(music.paused);a.preview();assert.equal(utterances.at(-1)!.text,'东风');a.configure(prefs,false);assert(music.paused);assert.equal(status!.music,'入桌后播放');
 }finally{a.dispose();Object.assign(globalThis,original);}
});
test('emote audio is opt-in, single-channel, expires, yields to game cues and never resumes stale tracks',async()=>{
 const original={window:globalThis.window,document:globalThis.document,Audio:globalThis.Audio,SpeechSynthesisUtterance:globalThis.SpeechSynthesisUtterance,now:Date.now};let clock=10000;Date.now=()=>clock;
 class FakeAudio{static all:FakeAudio[]=[];src='';paused=true;volume=1;loop=false;preload='';onended:any;onerror:any;constructor(){FakeAudio.all.push(this)}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true}load(){}removeAttribute(){this.src=''}}
 class Utterance{text:string;lang='';voice:any;rate=1;pitch=1;volume=1;onend?:()=>void;constructor(t:string){this.text=t}}
 const utterances:Utterance[]=[],synth=Object.assign(new EventTarget(),{getVoices:()=>[],speak:(u:Utterance)=>utterances.push(u),cancel:()=>{}}),doc=Object.assign(new EventTarget(),{hidden:false});Object.assign(globalThis,{window:{speechSynthesis:synth},document:doc,Audio:FakeAudio,SpeechSynthesisUtterance:Utterance});const a=new TableAudio(()=>{}),src='/emotes/innkeeper-v1/hello.mp3';
 try{a.configure({...DEFAULT_SOUND,music:false,effects:false},true);a.playEmote(src,clock+6000);assert.equal(FakeAudio.all.length,0);await a.unlock();
 for(const file of [undefined,'https://evil/a.mp3','/emotes/../secret.mp3'])a.playEmote(file,clock+6000);a.playEmote(src,clock-1);assert.equal(FakeAudio.all.length,0);
 a.configureEmotes(false);a.playEmote(src,clock+6000);assert.equal(FakeAudio.all.length,0);a.configureEmotes(true);a.playEmote(src,clock+6000);const first=FakeAudio.all.at(-1)!;assert(!first.paused);
 a.playEmote(src,clock+6000);const second=FakeAudio.all.at(-1)!;assert(first.paused);assert(!second.paused);
 a.effect('tick');assert(second.paused);const count=FakeAudio.all.length;a.playEmote(src,clock+6000);assert.equal(FakeAudio.all.length,count);
 clock+=1200;a.playEmote(src,clock+6000);const third=FakeAudio.all.at(-1)!;assert(!third.paused);a.play([{speech:'对三',effect:'card'}]);assert(third.paused);clock+=2000;a.playEmote(src,clock+6000);assert.equal(FakeAudio.all.at(-1),third);utterances.at(-1)!.onend?.();
 a.playEmote(src,clock+6000);const fourth=FakeAudio.all.at(-1)!;assert(!fourth.paused);doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));assert(fourth.paused);doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));assert(fourth.paused);
 a.playEmote(src,clock+6000);a.configureEmotes(false);assert(FakeAudio.all.at(-1)!.paused);a.configureEmotes(true);a.playEmote(src,clock+6000);a.configure({...DEFAULT_SOUND,enabled:false},true);assert(FakeAudio.all.at(-1)!.paused);
 }finally{a.dispose();Date.now=original.now;Object.assign(globalThis,{window:original.window,document:original.document,Audio:original.Audio,SpeechSynthesisUtterance:original.SpeechSynthesisUtterance});}
});
