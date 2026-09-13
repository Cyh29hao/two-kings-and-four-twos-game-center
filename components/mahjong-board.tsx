"use client";
import {Timer,Layers3,Maximize2} from 'lucide-react';
import type {ReactNode} from 'react';
import type {MahjongView} from '@/lib/mahjong/game';
import {HAM} from '@/lib/mahjong/rules';
import {chips} from '@/lib/mahjong/report';
import {typeName} from '@/lib/mahjong/solver';
import {MahjongTile} from './mahjong-tile';
import {Button} from './ui/button';
import {Dialog,DialogTrigger,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog';

function Clock({seconds,label}:{seconds:number;label:string}){return <span className={`mj-seat-clock ${seconds<=5?'is-urgent':''}`}><Timer size={15}/><b>{seconds}</b><small>秒 · {label}</small></span>;}
function PlayerZone({g,index,position,seconds,own=false}:{g:MahjongView;index:number;position:string;seconds:number;own?:boolean}){
 const s=g.seats[index],active=g.phase==='playing'&&!g.pending&&g.turn===index,pending=g.phase==='playing'&&g.pending?.from===index;
 return <section className={`mj-player-zone zone-${position} ${active?'is-active':''}`} aria-label={`${s?.name||'空位'}面前的牌`}>
 {!own&&<div className="mj-player-heading">{s?<><span className={`avatar avatar-${index%3}`}>{s.name.slice(0,1)}</span><div><b>{s.name}{s.bot&&<em className="bot-label">机器人</em>}{g.dealer===index&&g.roundNumber>0&&<em className="dealer-tag">庄</em>}</b><span>{s.balance!==null?chips(s.balance)+' 筹码':s.ready?'已准备':`${s.count} 张手牌`}</span></div></>:<span className="mj-empty-place">等一位朋友</span>}</div>}
 {active&&<Clock seconds={seconds} label="出牌"/>}
 {pending&&<div className="mj-claim-indicator">{g.pending!.kind==='added'&&<MahjongTile tile={g.pending!.tile} small wildcard={g.wildcard}/>}<Clock seconds={seconds} label="等待响应"/></div>}
 {!!s?.river.length&&<div className="mj-discards" aria-label={`${s.name}的完整弃牌`}>{s.river.map(t=><span key={t} className={g.lastDiscard?.tile===t?'latest-tile':''}><MahjongTile tile={t} small wildcard={g.wildcard}/></span>)}</div>}
 {!!s?.melds.length&&<div className="mj-melds" aria-label={`${s.name}的吃碰杠`}>{s.melds.map((m,j)=><div className="mj-meld" key={j}><span>{m.concealed?'暗杠':m.kind==='chi'?'吃':m.kind==='pong'?'碰':'杠'}</span><div>{(m.concealed&&!own&&g.phase!=='finished'?[0,1,2,3]:m.tiles).map((t,k)=><MahjongTile key={k} tile={t} small hidden={m.concealed&&!own&&g.phase!=='finished'} wildcard={g.wildcard}/>)}</div></div>)}</div>}
 </section>;
}
export function MahjongSurface({g,seat,seconds,children}:{g:MahjongView;seat:number;seconds:number;children?:ReactNode}){
 return <><div className="mj-board-top">
 {g.rules.id===HAM.id&&g.wildcard>=0?<div className="mj-wild-seat"><MahjongTile tile={g.wildcard*4} wildcard={g.wildcard} small/><div><b>本局赖子</b><span>白板代 {typeName(g.wildcard)}</span></div></div>:<span className="mj-board-label">{g.rules.name}</span>}
 <span className="mj-round-tag"><Layers3 size={16}/>{g.roundNumber?`第 ${g.roundNumber} 局`:'等待开局'}</span></div>
 <div className={`mj-surface phase-${g.phase}`}>
 <PlayerZone g={g} index={(seat+2)%4} position="north" seconds={seconds}/>
 <PlayerZone g={g} index={(seat+3)%4} position="west" seconds={seconds}/>
 <div className="mj-center">{g.phase==='playing'?<div className="mj-wall-count"><span>余牌</span><strong>{g.remaining}</strong><small>{g.rules.id===HAM.id?'保留 12 张':'张'}</small></div>:children}</div>
 <PlayerZone g={g} index={(seat+1)%4} position="east" seconds={seconds}/>
 <PlayerZone g={g} index={seat} position="south" seconds={seconds} own/>
 </div></>;
}
export function ExpandMahjong({g,seat,seconds}:{g:MahjongView;seat:number;seconds:number}){return <Dialog><DialogTrigger asChild><Button variant="outline" className="mj-expand"><Maximize2 size={16}/>完整牌桌</Button></DialogTrigger><DialogContent className="mj-expanded-modal"><DialogHeader><DialogTitle>完整牌桌</DialogTitle><DialogDescription>左右滑动查看四家的完整弃牌与吃碰杠。自己的手牌在下方。</DialogDescription></DialogHeader><div className="mj-expanded-scroll"><div className="mj-board mj-expanded-board"><MahjongSurface g={g} seat={seat} seconds={seconds}/><div className="mj-hand" aria-label="你的手牌">{g.seats[seat].hand.map(t=><MahjongTile key={t} tile={t} wildcard={g.wildcard}/>)}</div></div></div></DialogContent></Dialog>;}
