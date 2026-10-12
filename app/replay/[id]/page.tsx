"use client";

import {useEffect,useState} from 'react';
import {useParams,useSearchParams} from 'next/navigation';
import {ArrowLeft,RefreshCw} from 'lucide-react';
import Link from '@/components/site-navigation';
import {useClub} from '@/components/club-provider';
import AuthScreen from '@/components/auth-screen';
import {Button} from '@/components/ui/button';
import {api} from '@/lib/client';
import {ReplayPlayer,type ReplayFrame,type ReplayGame,type ReplayMessage} from '@/components/replay-player';
import '@/app/replay.css';
import '@/app/replay-viewer.css';
import '@/app/replay-mahjong.css';

type ReplayData={id:string;game:ReplayGame;created:number;frames:ReplayFrame[];events?:ReplayMessage[];perspective?:number;tv?:{status:'none'|'published';poster?:string;reason?:string;canManage:boolean}};
const names={landlord:'斗地主','landlord-v3':'技能斗地主',mahjong:'麻将',holdem:'德州扑克'};
const date=(at:number)=>new Date(at).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});

export default function ReplayPage(){
 const {id}=useParams<{id:string}>(),{user,setUser,loaded,loadLobby}=useClub();
 const [data,setData]=useState<ReplayData|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true),[refresh,setRefresh]=useState(0),[submitting,setSubmitting]=useState(false),[notice,setNotice]=useState(''),[anonymous,setAnonymous]=useState(false),[reason,setReason]=useState('');
 const fromTv=useSearchParams().get('from')==='tv';
 useEffect(()=>{void loadLobby().catch(e=>setError((e as Error).message))},[loadLobby]);
 useEffect(()=>{if(!user?.id||!id)return;let active=true;api(`/api/replays/${encodeURIComponent(id)}`).then((result:ReplayData)=>{if(active)setData(result)}).catch(e=>{if(active){setError(e.message);if(e.status===401)setUser(null)}}).finally(()=>{if(active)setBusy(false)});return()=>{active=false}},[user?.id,id,refresh,setUser]);
 async function updateTv(action:'submit'|'withdraw'){
  if(!data||submitting)return;
  setSubmitting(true);setError('');setNotice('');
  try{const note=reason.trim();await api('/api/tv',{action,id:data.id,...(action==='submit'?{anonymous,reason:note}:{})});setData({...data,tv:{...data.tv!,status:action==='submit'?'published':'none',poster:action==='submit'?(anonymous?'匿名玩家':user?.name):undefined,reason:action==='submit'?note:undefined}});setNotice(action==='submit'?'这局已登上精彩 TV。':'已从精彩 TV 撤下这局。')}
  catch(e){setError((e as Error).message)}finally{setSubmitting(false)}
 }
 if(!loaded)return <main className="replay-page"><p>正在打开回放…</p></main>;
 if(!user)return <><AuthScreen onAuth={setUser}/>{error&&<p role="alert" className="form-error">{error}</p>}</>;
 return <main className="replay-page">
  <header className="replay-heading"><div><Link href={fromTv?'/tv':'/history'} className="history-back"><ArrowLeft size={16}/>{fromTv?'返回精彩 TV':'返回对局记录'}</Link><span className="replay-kicker">SLY · 对局回放</span><h1>{data?`${names[data.game]}精彩回放`:'对局回放'}</h1>{data&&<p className="replay-heading-meta">{date(data.created)} · {data.frames.length} 步</p>}{data?.tv?.status==='published'&&<div className="replay-story">{data.tv.reason&&<blockquote>“{data.tv.reason}”</blockquote>}<span>投稿人 · {data.tv.poster}</span></div>}</div><Button variant="outline" disabled={busy} onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={16}/>刷新</Button></header>
  {error&&<p role="alert" className="form-error">{error}</p>}
  {busy&&!data?<p role="status">正在读取这一局…</p>:null}
  {data&&<><ReplayPlayer key={data.id} game={data.game} frames={data.frames} events={data.events} perspective={data.perspective}/>
   {data.tv?.canManage&&data.tv.status==='none'&&<section className="replay-publish"><div><h2>把这局放上精彩 TV</h2><p>想让大家看看这一局？公开后，其他玩家也能看到全场手牌、聊天和表情。</p><label className="replay-reason-label" htmlFor="replay-reason">一句话推荐这局 <span>选填 · 最多 80 字</span></label><input id="replay-reason" maxLength={80} value={reason} onChange={event=>setReason(event.target.value)} placeholder="比如：最后一手完成逆转"/><fieldset className="replay-poster-options"><legend>投稿时显示</legend><label><input type="radio" name="tv-poster" checked={!anonymous} onChange={()=>setAnonymous(false)}/>我的昵称：{user.name}</label><label><input type="radio" name="tv-poster" checked={anonymous} onChange={()=>setAnonymous(true)}/>匿名玩家</label></fieldset></div><Button disabled={submitting} onClick={()=>void updateTv('submit')}>投稿这局</Button></section>}
   {data.tv?.canManage&&data.tv.status==='published'&&<div className="replay-manage"><span>这局已登上精彩 TV</span><Button variant="outline" disabled={submitting} onClick={()=>void updateTv('withdraw')}>撤下这局</Button></div>}
   {notice&&<p role="status" className="replay-notice">{notice}</p>}</>}
 </main>;
}
