"use client";
import {useEffect,useState} from 'react';
import {Download} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {createReportImage} from '@/lib/mahjong/report-image';
import type {Report} from '@/lib/mahjong/report';

export function ReportDownload({report,shareUrl='',label='下载战报图片'}:{report:Report;shareUrl?:string;label?:string}){
 const [busy,setBusy]=useState(false),[open,setOpen]=useState(false),[error,setError]=useState(''),[image,setImage]=useState<{url:string;filename:string}|null>(null);
 useEffect(()=>()=>{if(image)URL.revokeObjectURL(image.url)},[image]);
 async function generate(){setBusy(true);setError('');try{const {blob,filename}=await createReportImage(report,shareUrl);const url=URL.createObjectURL(blob);setImage({url,filename});setOpen(true);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <><Button variant="outline" disabled={busy} onClick={generate}><Download size={17}/>{busy?'正在生成图片…':label}</Button>{error&&<p role="alert" className="form-error">{error}</p>}<Dialog open={open} onOpenChange={setOpen}><DialogContent className="ham-image-modal"><DialogHeader><DialogTitle>战报图片已生成</DialogTitle><DialogDescription>可下载 PNG，也可在手机上长按图片保存。</DialogDescription></DialogHeader>{image&&<><Button asChild><a href={image.url} download={image.filename}><Download size={17}/>保存 PNG</a></Button><img src={image.url} alt="娱乐中心竖版战报图片" className="ham-report-image"/></>}</DialogContent></Dialog></>;
}
