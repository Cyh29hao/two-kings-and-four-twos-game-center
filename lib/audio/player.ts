import type {Cue,Effect} from './events.ts';
import {DEFAULT_SOUND,TRACKS,type SoundPreferences} from './preferences.ts';

export type AudioStatus={unlocked:boolean;music:string;voice:string;lastSpeech:string};
/** One audio owner per game page. No audio starts before an explicit gesture. */
export class TableAudio{
 private context:AudioContext|null=null;
 private music:HTMLAudioElement|null=null;
 private prefs={...DEFAULT_SOUND};
 private inRoom=false;
 private unlocked=false;
 private disposed=false;
 private speaking=false;
 private utterance:SpeechSynthesisUtterance|null=null;
 private voice:SpeechSynthesisVoice|null=null;
 private queue:{text:string;at:number}[]=[];
 private speechTimer:ReturnType<typeof setTimeout>|null=null;
 private selectAt=0;
 private status:AudioStatus={unlocked:false,music:'未开启',voice:'设备普通话',lastSpeech:''};
 private notify:(status:AudioStatus)=>void;
 constructor(notify:(status:AudioStatus)=>void){
  this.notify=notify;
  this.findVoice();window.speechSynthesis?.addEventListener('voiceschanged',this.findVoice);document.addEventListener('visibilitychange',this.visibility);
 }
 private update(p:Partial<AudioStatus>){this.status={...this.status,...p};if(!this.disposed)this.notify(this.status);}
 private findVoice=()=>{if(!('speechSynthesis' in window)){this.update({voice:'当前浏览器不支持语音播报'});return;}
  const voices=window.speechSynthesis.getVoices().filter(v=>/^(zh[-_](CN|TW)|cmn)([-_]|$)/i.test(v.lang));
  this.voice=voices.sort((a,b)=>Number(b.localService)-Number(a.localService)||Number(/^zh[-_]CN/i.test(b.lang))-Number(/^zh[-_]CN/i.test(a.lang)))[0]??null;
  this.update({voice:this.voice?'普通话 · '+this.voice.name:'普通话 · 设备默认音色'});
 };
 private visibility=()=>{if(document.hidden)this.silence();else this.syncMusic();};
 configure(prefs:SoundPreferences,inRoom:boolean){const voiceWasOn=this.prefs.enabled&&this.prefs.voice;this.prefs=prefs;this.inRoom=inRoom;if(!prefs.enabled||!inRoom)this.silence();else if(voiceWasOn&&!prefs.voice)this.stopSpeech();this.syncMusic();}
 async unlock(){if(this.disposed)return;this.unlocked=true;this.update({unlocked:true});this.findVoice();this.syncMusic();try{const Context=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(Context&&!this.context)this.context=new Context();if(this.context?.state==='suspended')await this.context.resume();}catch{/* Speech and music remain usable without Web Audio. */}
 }
 private syncMusic(){
  if(this.disposed)return;const shouldPlay=this.unlocked&&this.inRoom&&this.prefs.enabled&&this.prefs.music&&!document.hidden;
  if(!shouldPlay){this.music?.pause();this.update({music:!this.prefs.music||!this.prefs.enabled?'已关闭':!this.inRoom?'入桌后播放':document.hidden?'已暂停':'等待开启'});return;}
  const track=TRACKS.find(t=>t.id===this.prefs.track)!;
  if(!this.music){this.music=new Audio();this.music.loop=true;this.music.preload='none';this.music.onplaying=()=>this.update({music:'播放中'});this.music.onerror=()=>this.update({music:'音乐加载失败，可点击重试'});}
  if(!this.music.src.endsWith(track.src)){this.music.pause();this.music.src=track.src;}
  this.music.volume=this.prefs.musicVolume/100*(this.speaking ? .35 : 1);
  if(this.music.paused){this.update({music:'正在载入'});void this.music.play().catch(()=>this.update({music:'点击开启或重试音乐'}));}
 }
 play(cues:Cue[]){if(!this.unlocked||!this.inRoom||!this.prefs.enabled||document.hidden)return;
  cues.forEach(c=>{this.effect(c.effect);if(c.speech&&this.prefs.voice)this.queue.push({text:c.speech,at:Date.now()});});this.queue=this.queue.slice(-4);this.speakNext();
 }
 preview(){if(!this.unlocked||!this.prefs.enabled)return;this.effect('card');if(this.prefs.voice){this.queue=[{text:'对三。顺子。四万。碰。',at:Date.now()}];this.speakNext();}}
 private speakNext(){if(this.speaking||!this.prefs.enabled||!this.prefs.voice||document.hidden||!('speechSynthesis' in window))return;this.queue=this.queue.filter(v=>Date.now()-v.at<6000);const next=this.queue.shift();if(!next)return;
  this.speaking=true;this.findVoice();const u=new SpeechSynthesisUtterance(next.text);this.utterance=u;u.lang='zh-CN';if(this.voice)u.voice=this.voice;u.rate=1.14;u.pitch=1;u.volume=this.prefs.voiceVolume/100;this.update({lastSpeech:next.text});this.syncMusic();
  const done=()=>{if(this.utterance!==u)return;if(this.speechTimer)clearTimeout(this.speechTimer);this.speechTimer=null;this.utterance=null;this.speaking=false;this.syncMusic();this.speakNext();};
  u.onend=done;u.onerror=e=>{if(!['interrupted','canceled'].includes(e.error))this.update({voice:'设备语音暂不可用，可点击试播重试'});done();};
  this.speechTimer=setTimeout(()=>{if(this.utterance===u){this.utterance=null;this.speaking=false;window.speechSynthesis.cancel();this.syncMusic();this.speakNext();}},7000);
  window.speechSynthesis.speak(u);
 }
 private stopSpeech(){this.queue=[];this.utterance=null;this.speaking=false;if(this.speechTimer)clearTimeout(this.speechTimer);this.speechTimer=null;window.speechSynthesis?.cancel();}
 resetQueue(){this.stopSpeech();this.syncMusic();}
 private silence(){this.music?.pause();this.stopSpeech();}
 effect(effect:Effect){if(!this.unlocked||!this.prefs.enabled||!this.prefs.effects||document.hidden||!this.context||this.context.state!=='running')return;if(effect==='select'){if(Date.now()-this.selectAt<90)return;this.selectAt=Date.now();}
  const ctx=this.context,volume=this.prefs.effectsVolume/100,now=ctx.currentTime;
  const tone=(freq:number,delay:number,duration:number,gain=.12,shape:OscillatorType='sine')=>{const oscillator=ctx.createOscillator(),envelope=ctx.createGain();oscillator.type=shape;oscillator.frequency.setValueAtTime(freq,now+delay);envelope.gain.setValueAtTime(0,now+delay);envelope.gain.linearRampToValueAtTime(gain*volume,now+delay+.008);envelope.gain.exponentialRampToValueAtTime(.0001,now+delay+duration);oscillator.connect(envelope);envelope.connect(ctx.destination);oscillator.start(now+delay);oscillator.stop(now+delay+duration+.02);oscillator.onended=()=>{oscillator.disconnect();envelope.disconnect();};};
  const tap=(duration:number,cutoff:number,gain:number,delay=0)=>{const buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*6);const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),level=ctx.createGain();source.buffer=buffer;filter.type='lowpass';filter.frequency.value=cutoff;level.gain.value=gain*volume;source.connect(filter);filter.connect(level);level.connect(ctx.destination);source.start(now+delay);source.onended=()=>{source.disconnect();filter.disconnect();level.disconnect();};};
  switch(effect){case 'select':tap(.035,2300,.15);break;case 'card':tap(.12,2800,.55);tone(150,0,.1,.05);break;case 'tile':tap(.09,3500,.45);tone(850,0,.075,.08,'triangle');break;case 'pass':tone(380,0,.12,.05);break;case 'claim':tone(523,0,.11);tone(784,.09,.16);break;case 'bomb':tap(.4,700,.8);tone(100,0,.4,.16,'triangle');tone(200,.07,.25,.08);break;case 'deal':for(let i=0;i<5;i++)tap(.05,2500,.24,i*.07);break;case 'win':for(const [i,n] of [523,659,784,1047].entries())tone(n,i*.12,.5,.1,'triangle');break;case 'turn':tone(659,0,.12,.07);tone(880,.13,.17,.07);break;case 'tick':tone(800,0,.065,.045);break;}
 }
 dispose(){this.disposed=true;this.silence();window.speechSynthesis?.removeEventListener('voiceschanged',this.findVoice);document.removeEventListener('visibilitychange',this.visibility);if(this.music){this.music.removeAttribute('src');this.music.load();this.music=null;}void this.context?.close().catch(()=>{});}
}
