import {json,requireUser,safe} from '@/lib/server';
import {privateReport} from '@/lib/mahjong/report-server';
export async function GET(req:Request){return safe(async()=>{const u=await requireUser(req),q=new URL(req.url).searchParams;return json(await privateReport(q.get('room')||'',u.id,q.get('round'),Number(q.get('page'))||0,u.role==='admin'));});}
