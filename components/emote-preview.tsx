"use client";
import {useState} from 'react';
import {EMOTES} from '@/lib/emotes';
import {EmoteImage} from './emote';
export function EmotePreview(){
 const [selected,setSelected]=useState('laugh'),[replay,setReplay]=useState(0);
 return <main className="emote-preview"><span className="section-tag">娱乐中心 · 表情重绘</span><h1>经典表情</h1><p>点击表情查看动作。头像上方展示，聊天中保留。每 3 秒可发送一次。</p>
 <div className="emote-preview-grid">{EMOTES.map(e=><button key={e.id} onClick={()=>{setSelected(e.id);setReplay(n=>n+1)}}><EmoteImage id={e.id}/><b>{e.name}</b></button>)}</div>
 <div className="emote-preview-table"><div className="emote-preview-seat"><div className="chat-avatar"><span className="avatar">你</span><div className="seat-chat-bubble seat-emote-bubble"><EmoteImage key={selected+replay} id={selected} animate eager/></div></div><b>你的头像</b></div><div className="emote-preview-seat"><div className="chat-avatar"><span className="avatar avatar-1">友</span><div className="seat-chat-bubble seat-emote-bubble"><EmoteImage key={replay} id="smug" animate eager/></div></div><b>同桌朋友</b></div></div>
 </main>;
}
