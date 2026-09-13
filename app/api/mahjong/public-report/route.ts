import {AppError,db,json,safe} from '@/lib/server';
import {reportPage} from '@/lib/mahjong/report-server';
import type {Report} from '@/lib/mahjong/report';
export async function GET(req:Request){return safe(async()=>{
 const q=new URL(req.url).searchParams,id=q.get('id')||'';if(!/^[a-f0-9]{48}$/.test(id))throw new AppError('分享链接不存在或已撤销',404);
 const row=await db().prepare('SELECT snapshot,scope,room_code,round_limit FROM mahjong_shares WHERE id=? AND revoked=0').bind(id).first<{snapshot:string;scope:string;room_code:string;round_limit:number}>();
 if(!row)throw new AppError('分享链接不存在或已撤销',404);const report=JSON.parse(row.snapshot) as Report;
 return json(row.scope==='table'?await reportPage(report,row.room_code,row.round_limit,Number(q.get('page'))||0):report,200,{'X-Robots-Tag':'noindex, nofollow'});
});}
