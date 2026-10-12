"use client";

import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowUpRight,RefreshCw} from 'lucide-react';
import Link from '@/components/site-navigation';
import {useClub} from '@/components/club-provider';
import AuthScreen from '@/components/auth-screen';
import {Button} from '@/components/ui/button';
import {api} from '@/lib/client';
import '@/app/replay.css';

type Item={id:string;game:'landlord'|'landlord-v3'|'mahjong'|'holdem';created:number;ended:number;roomCode:string};
const names={landlord:'斗地主','landlord-v3':'技能斗地主',mahjong:'麻将',holdem:'德州扑克'};
export default function ReplayIndexPage(){
 const {user,setUser,loaded,loadLobby}=useClub();
 const [items,setItems]=useState<Item[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(true),[refresh,setRefresh]=useState(0),[game,setGame]=useState<'all'|'landlord'|'mahjong'|'holdem'>('all');
 useEffect(()=>{void loadLobby().catch(e=>setError((e as Error).message))},[loadLobby]);
 useEffect(()=>{if(!user?.id)return;let active=true;api('/api/replays').then((result:{items:Item[]})=>{if(active)setItems(result.items)}).catch(e=>{if(active){setError(e.message);if(e.status===401)setUser(null)}}).finally(()=>{if(active)setBusy(false)});return()=>{active=false}},[user?.id,refresh,setUser]);
 if(!loaded)return <main className="replay-page"><p>正在打开回放…</p></main>;
 if(!user)return <><AuthScreen onAuth={setUser}/>{error&&<p role="alert" className="form-error">{error}</p>}</>;
 const visible=items.filter(item=>game==='all'||item.game===game||(game==='landlord'&&item.game==='landlord-v3'));
 return <main className="replay-page"><div className="replay-heading"><div><Link href="/history" className="history-back"><ArrowLeft size={16}/>返回对局记录</Link><span className="replay-kicker">SLY · 我的对局</span><h1>我的回放</h1><p className="replay-heading-meta">再看一遍精彩出牌，喜欢的对局还可以分享给大家。</p></div><Button variant="outline" disabled={busy} onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={16}/>刷新</Button></div>
  <div className="replay-filters" role="group" aria-label="按游戏筛选">{(['all','landlord','mahjong','holdem'] as const).map(key=><Button key={key} variant={game===key?'default':'ghost'} aria-pressed={game===key} onClick={()=>setGame(key)}>{key==='all'?'全部游戏':names[key]}</Button>)}</div>
  {error&&<p role="alert" className="form-error">{error}</p>}
  {visible.length?<div className="tv-list">{visible.map(item=><Link href={`/replay/${encodeURIComponent(item.id)}`} className="tv-item" key={item.id}><span className={`history-game-mark ${item.game}`} aria-hidden="true">{item.game.startsWith('landlord')?'♠':item.game==='mahjong'?'萬':'♣'}</span><span className="tv-item-copy"><small>{names[item.game]} · 房间 {item.roomCode} · {new Date(item.ended||item.created).toLocaleString('zh-CN')}</small><strong>查看本局每一步</strong></span><ArrowUpRight size={19}/></Link>)}</div>:<div className="replay-empty"><h2>{busy?'正在读取回放':'还没有这类回放'}</h2><p>完成新的一局后，回放会出现在这里。</p></div>}
 </main>;
}
