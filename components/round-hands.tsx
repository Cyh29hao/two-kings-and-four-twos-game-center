"use client";
import {Card} from './poker-table';
import {MahjongTile} from './mahjong-tile';
import type {MahjongView} from '@/lib/mahjong/game';
export function PokerRoundHands({seats}:{seats:{id:string;name:string;bot?:boolean;hand:number[]}[]}){
 return <section className="round-hands" aria-label="本局所有人的手牌"><h3>摊开看看，这局怎么打的</h3><p>本局已结束，所有玩家的剩余手牌在这里。</p><div className="round-hands-grid">{seats.map(s=><section key={s.id}><h4>{s.name}{s.bot&&<span>机器人</span>}<span>{s.hand.length} 张</span></h4>{s.hand.length?<div className="round-poker-cards">{s.hand.map(c=><Card card={c} key={c} small/>)}</div>:<p className="round-hands-empty">已出完全部手牌</p>}</section>)}</div></section>;
}
export function MahjongRoundHands({g}:{g:MahjongView}){
 return <section className="round-hands" aria-label="本局所有人的手牌"><h3>这一局，大家手里的牌</h3><p>结算后向同桌玩家展示，未公开手牌不会进入分享战报。</p><div className="round-hands-grid">{g.seats.map(s=><section key={s.id}><h4>{s.name}{s.bot&&<span>机器人</span>}<span>{s.hand.length} 张手牌</span></h4><div className="round-tiles">{s.hand.map(t=><MahjongTile tile={t} small key={t} wildcard={g.wildcard}/>)}</div>{s.melds.map((m,i)=><div key={i}><span className="round-meld-label">{m.concealed?'暗杠':m.kind==='chi'?'吃':m.kind==='pong'?'碰':'杠'}</span><div className="round-tiles">{m.tiles.map(t=><MahjongTile tile={t} small key={t} wildcard={g.wildcard}/>)}</div></div>)}</section>)}</div></section>;
}
