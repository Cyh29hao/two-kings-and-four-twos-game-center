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

type ReplayData={id:string;game:ReplayGame;frames:ReplayFrame[];events?:ReplayMessage[];perspective?:number;tv?:{status:'none'|'published';poster?:string;canManage:boolean}};
const names={landlord:'斗地主','landlord-v3':'技能斗地主',mahjong:'麻将',holdem:'德州扑克'};

export default function ReplayPage(){
 const {id}=useParams<{id:string}>(),{user,setUser,loaded,loadLobby}=useClub();
 const [data,setData]=useState<ReplayData|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true),[refresh,setRefresh]=useState(0),[submitting,setSubmitting]=useState(false),[notice,setNotice]=useState(''),[anonymous,setAnonymous]=useState(false);
 const fromTv=useSearchParams().get('from')==='tv';
 useEffect(()=>{void loadLobby().catch(e=>setError((e as Error).message))},[loadLobby]);
 useEffect(()=>{if(!user?.id||!id)return;let active=true;api(`/api/replays/${encodeURIComponent(id)}`).then((result:ReplayData)=>{if(active)setData(result)}).catch(e=>{if(active){setError(e.message);if(e.status===401)setUser(null)}}).finally(()=>{if(active)setBusy(false)});return()=>{active=false}},[user?.id,id,refresh,setUser]);
 async function updateTv(action:'submit'|'withdraw'){
  if(!data||submitting)return;
  setSubmitting(true);setError('');setNotice('');
  try{await api('/api/tv',{action,id:data.id,...(action==='submit'?{anonymous}:{})});setData({...data,tv:{...data.tv!,status:action==='submit'?'published':'none',poster:action==='submit'?(anonymous?'匿名玩家':user?.name):undefined}});setNotice(action==='submit'?'已投稿至精彩对局 TV。':'已从精彩对局 TV 撤稿。')}
  catch(e){setError((e as Error).message)}finally{setSubmitting(false)}
 }
 if(!loaded)return <main className="replay-page"><p>正在打开回放…</p></main>;
 if(!user)return <><AuthScreen onAuth={setUser}/>{error&&<p role="alert" className="form-error">{error}</p>}</>;
 return <main className="replay-page">
  <div className="replay-heading"><div><Link href={fromTv?'/tv':'/history'} className="history-back"><ArrowLeft size={16}/>{fromTv?'返回精彩对局 TV':'返回对局记录'}</Link><h1>{data?`${names[data.game]} · 对局回放`:'对局回放'}</h1><p>沿用当局牌桌，其他玩家明牌；依次观看出牌、文字与表情。</p>{data?.tv?.status==='published'&&<p className="replay-poster">TV 投稿人：{data.tv.poster}</p>}</div><Button variant="outline" disabled={busy} onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={16}/>刷新</Button></div>
  {error&&<p role="alert" className="form-error">{error}</p>}
  {busy&&!data?<p role="status">正在读取对局…</p>:null}
  {data&&<><ReplayPlayer game={data.game} frames={data.frames} events={data.events} perspective={data.perspective}/><section className="replay-publish"><div><h2>投稿精彩对局 TV</h2><p>公开后，所有已登录玩家都能看到当局所有人的昵称、完整手牌，以及局内文字和表情。</p>{data.tv?.canManage&&data.tv.status!=='published'&&<fieldset className="replay-poster-options"><legend>TV 列表显示的投稿人</legend><label><input type="radio" name="tv-poster" checked={!anonymous} onChange={()=>setAnonymous(false)}/>显示我的昵称：{user.name}</label><label><input type="radio" name="tv-poster" checked={anonymous} onChange={()=>setAnonymous(true)}/>匿名玩家</label></fieldset>}</div>{data.tv?.canManage&&(data.tv.status==='published'?<Button variant="outline" disabled={submitting} onClick={()=>void updateTv('withdraw')}>撤回投稿</Button>:<Button disabled={submitting} onClick={()=>void updateTv('submit')}>投稿至 TV</Button>)}{data.tv?.status==='published'&&<span className="replay-published">已公开</span>}</section>{notice&&<p role="status" className="replay-notice">{notice}</p>}</>}
 </main>;
}
