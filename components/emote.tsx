"use client";
import {useState} from 'react';
import {getEmote,emoteText} from '@/lib/emotes';
import {MotionPlayback} from './motion-playback';

export function EmoteImage({id,animate=false,eager=false,startAt,expiresAt}:{id:string;animate?:boolean;eager?:boolean;startAt?:number;expiresAt?:number}){
 const emote=getEmote(id),[failed,setFailed]=useState(false);
 if(!emote?.enabled||failed)return <span className="emote-fallback">{emoteText(id)}</span>;
 if(emote.frames)return <span className="emote-art emote-frames"><MotionPlayback key={id} motion={emote.frames} animate={animate} startAt={startAt} expiresAt={expiresAt}/></span>;
 return <span className={`emote-art motion-${emote.motion}${animate?' is-animated':''}`} role="img" aria-label={emote.name}>
  <img src={emote.src} width={256} height={256} alt="" draggable={false} loading={eager?'eager':'lazy'} decoding="async" onError={()=>setFailed(true)}/>
  {animate&&<span className="emote-sparks" aria-hidden="true">{[0,1,2].map(i=><i key={i}/>)}</span>}
 </span>;
}
