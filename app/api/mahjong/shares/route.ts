import {randomBytes} from 'node:crypto';
import {AppError,body,db,json,limit,requireUser,safe} from '@/lib/server';
import {reportAccess,readRound} from '@/lib/mahjong/report-server';
import {roundReport,tableReport} from '@/lib/mahjong/report';
export async function GET(req:Request){return safe(async()=>{const u=await requireUser(req),q=new URL(req.url).searchParams;const rows=await db().prepare('SELECT id,scope,round_id,created,revoked FROM mahjong_shares WHERE creator=? AND room_code=? ORDER BY created DESC LIMIT 100').bind(u.id,q.get('room')||'').all();return json({shares:rows.results});});}
export async function POST(req:Request){return safe(async()=>{
 const u=await requireUser(req),b=await body(req);await limit('mj-share:'+u.id,30,1);
 if(b.action==='revoke'){
  if(typeof b.id!=='string')throw new AppError('分享链接无效');
  const row=await db().prepare('SELECT creator FROM mahjong_shares WHERE id=?').bind(b.id).first<{creator:string}>();if(!row)throw new AppError('分享不存在',404);
  if(row.creator!==u.id&&u.role!=='admin')throw new AppError('只有创建者或管理员可以撤销分享',403);
  await db().prepare('UPDATE mahjong_shares SET revoked=1 WHERE id=?').bind(b.id).run();
  if(u.role==='admin')await db().prepare('INSERT INTO audit (id,actor,action,created) VALUES (?,?,?,?)').bind(crypto.randomUUID(),u.display,'撤销麻将战报分享',Date.now()).run();return json({ok:true});
 }
 if(b.action!=='create'||typeof b.code!=='string')throw new AppError('分享请求无效');
 const {r,g}=await reportAccess(b.code,u.id),round=typeof b.round==='string'?b.round:null;
 if(!round&&g.phase!=='closed')throw new AppError('结束整桌后才能分享整桌战报');
 const report=round?roundReport(r.title,await readRound(r.code,round)):tableReport(r.title,g),id=randomBytes(24).toString('hex'),created=Date.now();
 // Closed-table records are immutable; paging those records keeps snapshots bounded even for very long tables.
 await db().prepare('INSERT INTO mahjong_shares (id,creator,room_code,scope,round_id,round_limit,snapshot,created,revoked) VALUES (?,?,?,?,?,?,?,?,0)').bind(id,u.id,r.code,report.scope,round,g.roundNumber,JSON.stringify(report),created).run();
 return json({id,path:'/share/'+id,created});
});}
