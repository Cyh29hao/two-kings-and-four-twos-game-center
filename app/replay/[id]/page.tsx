"use client";

import {useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import {ArrowLeft,RefreshCw} from 'lucide-react';
import Link from '@/components/site-navigation';
import {useClub} from '@/components/club-provider';
import AuthScreen from '@/components/auth-screen';
import {Button} from '@/components/ui/button';
import {api} from '@/lib/client';
import {ReplayPlayer,type ReplayFrame,type ReplayGame} from '@/components/replay-player';
import '@/app/replay.css';

type ReplayData={id:string;game:ReplayGame;frames:ReplayFrame[];tv?:{status:'none'|'published';canManage:boolean}};
const names={landlord:'斗地主','landlord-v3':'技能斗地主',mahjong:'麻将',holdem:'德州扑克'};

export default function ReplayPage(){
 const {id}=useParams<{id:string}>(),{user,setUser,loaded,loadLobby}=useClub();
 const [data,setData]=useState<ReplayData|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(true),[refresh,setRefresh]=useState(0),[submitting,setSubmitting]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{void loadLobby().catch(e=>setError((e as Error).message))},[loadLobby]);
 useEffect(()=>{if(!user?.id||!id)return;let active=true;api(`/api/replays/${encodeURIComponent(id)}`).then((result:ReplayData)=>{if(active)setData(result)}).catch(e=>{if(active){setError(e.message);if(e.status===401)setUser(null)}}).finally(()=>{if(active)setBusy(false)});return()=>{active=false}},[user?.id,id,refresh,setUser]);
 async function updateTv(action:'submit'|'withdraw'){
  if(!data||submitting)return;
  setSubmitting(true);setError('');setNotice('');
  try{await api('/api/tv',{action,id:data.id});setData({...data,tv:{...data.tv!,status:action==='submit'?'published':'none'}});setNotice(action==='submit'?'已投稿至精彩对局 TV。':'已从精彩对局 TV 撤稿。')}
  catch(e){setError((e as Error).message)}finally{setSubmitting(false)}
 }
 if(!loaded)return <main className="replay-page"><p>正在打开回放…</p></main>;
 if(!user)return <><AuthScreen onAuth={setUser}/>{error&&<p role="alert" className="form-error">{error}</p>}</>;
 return <main className="replay-page">
  <div className="replay-heading"><div><Link href="/history" className="history-back"><ArrowLeft size={16}/>返回对局记录</Link><h1>{data?`${names[data.game]} · 对局回放`:'对局回放'}</h1><p>明牌查看各席手牌，以及每一步操作后的结果。</p></div><Button variant="outline" disabled={busy} onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={16}/>刷新</Button></div>
  {error&&<p role="alert" className="form-error">{error}</p>}
  {busy&&!data?<p role="status">正在读取对局…</p>:null}
  {data&&<><ReplayPlayer game={data.game} frames={data.frames}/><section className="replay-publish"><div><h2>投稿精彩对局 TV</h2><p>公开后，所有已登录玩家都能查看每个人的完整手牌。公开回放会将玩家名称匿名显示。</p></div>{data.tv?.canManage&&(data.tv.status==='published'?<Button variant="outline" disabled={submitting} onClick={()=>void updateTv('withdraw')}>撤回投稿</Button>:<Button disabled={submitting} onClick={()=>void updateTv('submit')}>投稿至 TV</Button>)}{data.tv?.status==='published'&&<span className="replay-published">已公开</span>}</section>{notice&&<p role="status" className="replay-notice">{notice}</p>}</>}
 </main>;
}
