"use client";

import {useEffect,useState} from 'react';
import {ArrowLeft,ArrowUpRight,RefreshCw,TvMinimalPlay} from 'lucide-react';
import Link from '@/components/site-navigation';
import {useClub} from '@/components/club-provider';
import AuthScreen from '@/components/auth-screen';
import {Button} from '@/components/ui/button';
import {api} from '@/lib/client';
import '@/app/replay.css';

type TvItem={id:string;game:'landlord'|'landlord-v3'|'mahjong'|'holdem';created:number;submitted:number};
const names={landlord:'斗地主','landlord-v3':'技能斗地主',mahjong:'麻将',holdem:'德州扑克'};
export default function TvPage(){
 const {user,setUser,loaded,loadLobby}=useClub();
 const [items,setItems]=useState<TvItem[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(true),[refresh,setRefresh]=useState(0),[game,setGame]=useState<'all'|'landlord'|'mahjong'|'holdem'>('all'),[page,setPage]=useState(0),[total,setTotal]=useState(0),[pageSize,setPageSize]=useState(12);
 useEffect(()=>{void loadLobby().catch(e=>setError((e as Error).message))},[loadLobby]);
 useEffect(()=>{if(!user?.id)return;let active=true;setBusy(true);api(`/api/tv?page=${page}&game=${game}`).then((result:{items:TvItem[];total:number;pageSize:number})=>{if(active){setItems(result.items);setTotal(result.total);setPageSize(result.pageSize)}}).catch(e=>{if(active){setError(e.message);if(e.status===401)setUser(null)}}).finally(()=>{if(active)setBusy(false)});return()=>{active=false}},[user?.id,refresh,page,game,setUser]);
 if(!loaded)return <main className="replay-page"><p>正在打开精彩对局 TV…</p></main>;
 if(!user)return <><AuthScreen onAuth={setUser}/>{error&&<p role="alert" className="form-error">{error}</p>}</>;
 const visible=items;
 return <main className="replay-page"><div className="replay-heading"><div><Link href="/" className="history-back"><ArrowLeft size={16}/>返回游戏室</Link><h1>精彩对局 TV</h1><p>玩家投稿的完整对局回放，明牌看每一步。</p></div><Button variant="outline" disabled={busy} onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={16}/>刷新</Button></div>
  <div className="replay-filters" role="group" aria-label="按游戏筛选">{(['all','landlord','mahjong','holdem'] as const).map(key=><Button key={key} variant={game===key?'default':'ghost'} aria-pressed={game===key} onClick={()=>{setPage(0);setGame(key)}}>{key==='all'?'全部游戏':names[key]}</Button>)}</div>
  {error&&<p role="alert" className="form-error">{error}</p>}
  {visible.length?<div className="tv-list">{visible.map(item=><Link href={`/replay/${encodeURIComponent(item.id)}?from=tv`} className="tv-item" key={item.id}><span className={`history-game-mark ${item.game}`} aria-hidden="true">{item.game.startsWith('landlord')?'♠':item.game==='mahjong'?'萬':'♣'}</span><span className="tv-item-copy"><small>{names[item.game]} · {new Date(item.submitted).toLocaleDateString('zh-CN')} 投稿</small><strong>{names[item.game]}精彩对局 · {new Date(item.created).toLocaleDateString('zh-CN')}</strong></span><ArrowUpRight size={19}/></Link>)}</div>:<div className="replay-empty"><TvMinimalPlay size={32}/><h2>{busy?'正在读取投稿':'本页还没有这类投稿'}</h2><p>完成有回放的对局后，可在个人回放页投稿。</p></div>}
  {total>pageSize&&<div className="replay-pagination"><Button variant="outline" disabled={busy||page===0} onClick={()=>setPage(p=>p-1)}>上一页</Button><span>{page+1} / {Math.ceil(total/pageSize)}</span><Button variant="outline" disabled={busy||(page+1)*pageSize>=total} onClick={()=>setPage(p=>p+1)}>下一页</Button></div>}
 </main>;
}
