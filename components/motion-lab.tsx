"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,Play,Pause,RotateCcw,VolumeX,ExternalLink,StepBack,StepForward,Check} from 'lucide-react';
import Link from 'next/link';
import {Button} from './ui/button';
import {Tabs,TabsList,TabsTrigger} from './ui/tabs';
import {Switch} from './ui/switch';
import {Card,HandStrip} from './poker-table';
import {MahjongTile} from './mahjong-tile';
import {FrameMotionView} from './frame-motion';
import {MOTION_SAMPLES,type MotionSample} from '@/lib/motion/samples';
import {frameAt,frameStart,motionDuration} from '@/lib/motion/timeline';

const POKER_HAND=[52,48,40,32,28,21,20,11,10,9,8,6,5,4,2,1,0];
const MJ_HAND=[0,4,8,12,16,20,36,40,44,72,76,80,124,125];
const PLAYED={bomb:[8,9,10,11],airplane:[0,1,2,4,5,6]};
function TableScene({sample,time,animate,emoteVisible,game,setGame,onReplay}:{sample:MotionSample;time:number;animate:boolean;emoteVisible:boolean;game:string;setGame:(game:string)=>void;onReplay:()=>void}){
 const [selected,setSelected]=useState<number[]>([]),[tile,setTile]=useState<number|null>(null),[played,setPlayed]=useState<number[]>(PLAYED.bomb),[sender,setSender]=useState(0);
 const [message,setMessage]=useState('');
 const kind=sample.category==='effect'?(sample.id==='hu'?'mahjong':'landlord'):game;
 const names=kind==='landlord'?['阿松','小满','你']:kind==='mahjong'?['阿松','小满','阿竹','你']:['阿松','小满','阿竹','小禾','你'];
 useEffect(()=>{setSelected([]);setTile(null);setMessage('');setSender(0);setPlayed(sample.id==='airplane'?PLAYED.airplane:PLAYED.bomb);},[sample.id,kind]);
 const badge=sample.category==='effect';
 return <section className="motion-table-section"><div className="motion-section-heading"><div><span className="motion-eyebrow">放到牌桌上</span><h2>好看，也要好操作</h2></div>{sample.category==='emote'&&<Tabs value={game} onValueChange={setGame}><TabsList aria-label="样片游戏"><TabsTrigger value="landlord">斗地主</TabsTrigger><TabsTrigger value="mahjong">麻将</TabsTrigger><TabsTrigger value="holdem">德州</TabsTrigger></TabsList></Tabs>}</div>
 <div className={`motion-demo-table demo-${kind}`} aria-label={`${kind==='landlord'?'斗地主':kind==='mahjong'?'麻将':'德州扑克'}样片牌桌`}>
  <div className="motion-table-meta"><span>样片牌桌 · 不计分</span><span>{names.length} 人 · 仅本机演示</span></div>
  {names.map((name,index)=><div key={name} className={`motion-demo-seat seat-${index}${index===names.length-1?' seat-self':''}`}>
   <div className="motion-demo-avatar-wrap"><button className={`avatar avatar-${index%3}`} aria-label={`在${name}面前演示`} onClick={()=>{setSender(index);onReplay()}}>{name.slice(0,1)}</button>
    {!badge&&sender===index&&emoteVisible&&<div className="motion-demo-emote"><FrameMotionView motion={sample.motion} time={time} active={animate}/></div>}
   </div><b>{name}</b><small>{index===names.length-1?'1,000 筹码':kind==='landlord'?'17 张牌':'1,000 筹码'}</small>
  </div>)}
  <div className={`motion-demo-center${badge?' has-badge':''}`}>
   {kind==='landlord'?<div className="motion-demo-played" aria-label="已出的牌">{played.map(card=><Card key={card} card={card} small/>)}</div>:kind==='mahjong'?<div className="motion-demo-river" aria-label="公开弃牌">{[12,36,100,20,64,128].map(value=><MahjongTile key={value} tile={value} small/>)}</div>:<><span className="motion-pot">底池 <b>240</b></span><div className="motion-demo-played">{[44,41,30].map(card=><Card key={card} card={card} small/>)}</div></>}
   {badge&&<div className={`motion-demo-badge badge-${sample.id}`}><FrameMotionView motion={sample.motion} time={time} active={animate}/></div>}
   {badge&&<span className="motion-action-owner">阿松 · {sample.id==='hu'?'自摸':'已出牌'}</span>}
   {!badge&&<p className="motion-table-hint">点头像，换个座位看看</p>}
  </div>
  <div className="motion-demo-controls"><span className="motion-demo-clock">◷ 28 秒</span>
   {kind==='landlord'?<><Button variant="outline" onClick={()=>{setSelected([]);setMessage('已重新选牌')}}>重选</Button><Button onClick={()=>{if(selected.length){setPlayed(selected);setSelected([]);setMessage('已在本机演示出牌')}else setMessage('先选几张手牌试试')}}>出牌</Button></>:kind==='mahjong'?<><Button variant="outline" onClick={()=>{setTile(null);setMessage('已跳过')}}>跳过</Button><Button onClick={()=>{setMessage(tile===null?'选一张手牌试试':'已在本机演示出牌');setTile(null)}}>出牌</Button></>:<><Button variant="outline" onClick={()=>setMessage('已在本机演示过牌')}>过牌</Button><Button onClick={()=>setMessage('已在本机演示跟注')}>跟注 30</Button></>}
  </div>
  <div className="motion-demo-hand">{kind==='mahjong'?MJ_HAND.map(value=><MahjongTile key={value} tile={value} selected={tile===value} onClick={()=>setTile(tile===value?null:value)}/>):kind==='landlord'?<HandStrip hand={POKER_HAND} selected={selected} onChange={setSelected} round="motion-preview"/>:<><Card card={48}/><Card card={49}/></>}</div>
 </div><p className="motion-table-feedback" role="status">{message||'可以点选手牌和操作按钮，检查动画是否遮挡。'}</p></section>;
}

export function MotionLab(){
 const [selected,setSelected]=useState(MOTION_SAMPLES[0]?.id??''),[time,setTime]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[enabled,setEnabled]=useState(true),[reduced,setReduced]=useState(false),[game,setGame]=useState('landlord'),[bubble,setBubble]=useState(false),[bubbleRun,setBubbleRun]=useState(0);
 const [loaded,setLoaded]=useState({id:'',redraw:false,reference:false});
 const sample=MOTION_SAMPLES.find(item=>item.id===selected)??MOTION_SAMPLES[0],duration=sample?motionDuration(sample.motion):0;
 const playback=useRef({time:0,speed:1});playback.current={time,speed};
 const animation=enabled&&!reduced;
 const ready=loaded.id===sample?.id&&loaded.redraw&&(!sample?.reference||loaded.reference);
 const markReady=(part:'redraw'|'reference',value:boolean)=>setLoaded(current=>({...current.id===sample.id?current:{id:sample.id,redraw:false,reference:false},[part]:value}));
 useEffect(()=>{const query=window.matchMedia('(prefers-reduced-motion: reduce)');const changed=()=>setReduced(query.matches);changed();query.addEventListener('change',changed);return()=>query.removeEventListener('change',changed)},[]);
 useEffect(()=>{setTime(0);setPlaying(false);setBubble(false);},[selected]);
 useEffect(()=>{if(!animation)setPlaying(false)},[animation]);
 useEffect(()=>{if(!bubble)return;const timeout=setTimeout(()=>setBubble(false),6000);return()=>clearTimeout(timeout)},[bubble,selected,bubbleRun]);
 useEffect(()=>{const hidden=()=>{if(document.hidden){setPlaying(false);setBubble(false)}};document.addEventListener('visibilitychange',hidden);return()=>document.removeEventListener('visibilitychange',hidden)},[]);
 useEffect(()=>{
  if(!playing||!animation)return;let handle=0,previous=performance.now();
  const tick=(now:number)=>{const next=Math.min(duration,playback.current.time+(now-previous)*playback.current.speed);previous=now;playback.current.time=next;setTime(next);if(next>=duration)setPlaying(false);else handle=requestAnimationFrame(tick)};
  handle=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(handle);
 },[playing,animation,duration]);
 const replay=useCallback(()=>{setTime(0);playback.current.time=0;setPlaying(animation&&ready);setBubble(true);setBubbleRun(run=>run+1)},[animation,ready]);
 if(!sample)return <main className="motion-lab"><h1>动态样片</h1><p>正在准备样片素材。</p></main>;
 const currentFrame=frameAt(sample.motion,time),referenceTime=sample.reference?time/duration*motionDuration(sample.reference):0;
 function step(delta:number){setPlaying(false);setTime(frameStart(sample.motion,Math.max(0,Math.min(sample.motion.frames.length-1,currentFrame+delta))));setBubble(true);}
 return <main className="motion-lab"><header className="motion-lab-heading"><div><Link href="/" className="motion-back"><ArrowLeft size={15}/>娱乐中心</Link><span className="motion-eyebrow">第一批 · 动态样片</span><h1>这一手，有点意思。</h1><p>先看动作，再看它在牌桌里的样子。</p></div><span className="motion-silent"><VolumeX size={16}/>暂不配音</span></header>
  <nav className="motion-sample-choices" aria-label="选择动画样片">{MOTION_SAMPLES.map(item=><button key={item.id} className={sample.id===item.id?'is-selected':''} aria-pressed={sample.id===item.id} onClick={()=>setSelected(item.id)}><FrameMotionView motion={item.motion}/><span>{item.name}</span>{sample.id===item.id&&<Check size={14}/>}</button>)}</nav>
  <section className="motion-comparison"><div className="motion-section-heading"><div><span className="motion-eyebrow">{sample.category==='effect'?'牌型特效':'原版动作 · 逐帧重绘'}</span><h2>{sample.name}</h2><p>{sample.detail}</p></div><label className="motion-enable" htmlFor="motion-enabled">动画<Switch id="motion-enabled" checked={enabled} onCheckedChange={setEnabled}/></label></div>
   <div className={`motion-comparison-grid ${sample.reference?'has-reference':''}`}>
    {sample.reference&&<figure><div className="motion-viewer"><FrameMotionView motion={sample.reference} time={referenceTime} active={animation} onReady={value=>markReady('reference',value)}/></div><figcaption>原版动作参考{sample.sourceUrl&&<a href={sample.sourceUrl} target="_blank" rel="noreferrer">来源<ExternalLink size={12}/></a>}</figcaption></figure>}
    <figure><div className="motion-viewer"><FrameMotionView motion={sample.motion} time={time} active={animation} onReady={value=>markReady('redraw',value)}/></div><figcaption>{sample.reference?'本站非官方重绘':'牌型动画样片'}<span>{sample.motion.frames.length} 帧 · {(duration/1000).toFixed(2)} 秒</span></figcaption></figure>
   </div>
   <div className="motion-playback"><div className="motion-play-buttons"><Button onClick={()=>{if(playing)setPlaying(false);else if(time>=duration)replay();else{setPlaying(animation&&ready);setBubble(true)}}} disabled={!animation||!ready}>{playing?<Pause size={17}/>:<Play size={17}/>} {playing?'暂停':'播放'}</Button><Button variant="outline" aria-label="从头重播" onClick={replay}><RotateCcw size={16}/></Button><Button variant="ghost" aria-label="上一帧" onClick={()=>step(-1)}><StepBack size={17}/></Button><Button variant="ghost" aria-label="下一帧" onClick={()=>step(1)}><StepForward size={17}/></Button><label className="motion-speed">速度<select value={speed} aria-label="播放速度" onChange={event=>setSpeed(Number(event.target.value))}><option value={1}>正常</option><option value={0.5}>慢放 ½</option></select></label></div><div className="motion-timeline"><input aria-label="动画进度" type="range" min={0} max={duration} step={10} value={time} onChange={event=>{setPlaying(false);setTime(Number(event.target.value));setBubble(true)}}/><output>{(time/1000).toFixed(2)} / {(duration/1000).toFixed(2)} 秒 · 第 {currentFrame+1} 帧</output></div></div>
   {animation&&!ready&&<p className="motion-note">动画尚未就绪，先显示静态封面。</p>}
   {reduced&&<p className="motion-note">已遵循系统的“减少动态效果”，显示静态封面。</p>}
   {sample.beats&&<p className="motion-beats">{sample.beats.join(' → ')}</p>}
  </section>
  <TableScene sample={sample} time={time} animate={animation} emoteVisible={bubble} game={game} setGame={setGame} onReplay={replay}/>
  <footer className="motion-lab-footer">样片仅供本地确认，不会向房间发送消息。确认这批效果后，再制作剩余表情与牌型。</footer>
 </main>;
}
