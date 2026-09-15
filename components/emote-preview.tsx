"use client";
import {useState} from 'react';
import Link from './site-navigation';
import {RotateCcw,ArrowLeft} from 'lucide-react';
import {EMOTES,canSendEmote} from '@/lib/emotes';
import {TABLE_EFFECTS} from '@/lib/motion/effects';
import {EmoteImage} from './emote';
import {MotionPlayback} from './motion-playback';
const emotes=EMOTES.filter(e=>canSendEmote(e.id));
export function EmotePreview(){
 const [kind,setKind]=useState<'emotes'|'effects'>('emotes'),[selected,setSelected]=useState(emotes[0].id),[effect,setEffect]=useState(TABLE_EFFECTS[0].id),[replay,setReplay]=useState(0);
 const art=TABLE_EFFECTS.find(e=>e.id===effect)!;
 return <main className="emote-preview">
  <Link className="gallery-back" href="/"><ArrowLeft size={16}/>返回娱乐中心</Link>
  <span className="section-tag">娱乐中心 · 牌桌小剧场</span><h1>表情到位，牌局更有趣</h1>
  <p>21 个经典表情重绘，15 种牌型与动作标识。点一下看完整动作；这里的重播只给自己看，不会发到房间。</p>
  <div className="gallery-tabs" role="group" aria-label="预览分类">
   <button aria-pressed={kind==='emotes'} onClick={()=>setKind('emotes')}>经典表情 · {emotes.length}</button>
   <button aria-pressed={kind==='effects'} onClick={()=>setKind('effects')}>牌型特效 · {TABLE_EFFECTS.length}</button>
  </div>
  <section className="gallery-stage" aria-label="动作预览">
   <div className="gallery-player" key={`${kind}:${selected}:${effect}:${replay}`}>
    {kind==='emotes'?<EmoteImage id={selected} animate eager/>:art.motion?<MotionPlayback motion={art.motion} animate/>:<img className="gallery-symbol effect-enter" src={art.src} alt={art.label} draggable={false}/>}
   </div>
   <div><strong>{kind==='emotes'?emotes.find(e=>e.id===selected)?.name:art.label}</strong><button className="gallery-replay" onClick={()=>setReplay(n=>n+1)}><RotateCcw size={15}/>再看一次</button></div>
   <small>播放一次后停留 · 本版表情无声</small>
  </section>
  <div className="emote-preview-grid">{kind==='emotes'?emotes.map(e=><button aria-pressed={selected===e.id} key={e.id} onClick={()=>{setSelected(e.id);setReplay(n=>n+1)}}><EmoteImage id={e.id}/><b>{e.name}</b></button>):TABLE_EFFECTS.map(e=><button aria-pressed={effect===e.id} key={e.id} onClick={()=>{setEffect(e.id);setReplay(n=>n+1)}}><img src={e.src} alt="" loading="lazy" draggable={false}/><b>{e.label}</b></button>)}</div>
  <p className="gallery-note">经典角色的非官方重绘，动作参考不代表官方授权。<a href="/emotes/royale-v2/SOURCES.json" target="_blank" rel="noreferrer">查看素材来源</a>。哥布林嘘、暗夜女巫鼓掌、野猪骑士飞吻待补。</p>
 </main>;
}
