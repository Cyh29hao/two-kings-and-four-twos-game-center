"use client";
import {useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import {Club} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {ReportContent} from '@/components/mahjong-report';
import {ReportDownload} from '@/components/mahjong-report-download';
import type {Report} from '@/lib/mahjong/report';
import {api} from '@/lib/client';
export default function SharedReport(){const {id}=useParams<{id:string}>();const [report,setReport]=useState<Report|null>(null),[page,setPage]=useState(0),[error,setError]=useState('');
 useEffect(()=>{let active=true;setError('');api(`/api/mahjong/public-report?id=${encodeURIComponent(id)}&page=${page}`).then(d=>{if(active)setReport(d)}).catch(e=>{if(active){setReport(null);setError(e.message)}});return()=>{active=false};},[id,page]);
 return <div className="ham-public"><header><a className="brand" href="/mahjong"><span className="brand-icon"><Club size={23}/></span><span>娱乐中心<small>好 友 游 戏 室</small></span></a><Button variant="outline" asChild><a href="/mahjong">去开一桌</a></Button></header><main>{error?<div className="ham-share-empty"><h1>这份战报暂时无法查看</h1><p>{error}</p><Button asChild><a href="/mahjong">返回娱乐中心</a></Button></div>:report?<><div className="ham-public-actions"><span>好友分享的只读战报</span><ReportDownload report={report} shareUrl={location.origin+'/share/'+id} label="下载图片"/></div><ReportContent report={report} onPage={setPage}/></>:<p className="muted">正在打开战报…</p>}</main></div>;
}
