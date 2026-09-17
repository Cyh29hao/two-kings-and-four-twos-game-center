import {AppError,body,db,digest,json,limit,requireUser,safe} from '@/lib/server';
import {inviteFriend,openInvite,requestFriend,respondFriend,socialSnapshot} from '@/lib/social-server';
export const dynamic='force-dynamic';
export function GET(req:Request){return safe(async()=>json(await socialSnapshot((await requireUser(req)).id)));}
export function POST(req:Request){return safe(async()=>{
 const u=await requireUser(req),b=await body(req);
 if(b.action==='heartbeat'){
  const token=req.headers.get('cookie')?.match(/(?:^|;\s*)sanren_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if(!token)throw new AppError('请先登录',401);
  const now=Date.now();
  await db().prepare(`INSERT INTO user_presence (session_hash,seen) SELECT hash,? FROM sessions WHERE hash=? AND user_id=? AND expires>?
   ON CONFLICT(session_hash) DO UPDATE SET seen=excluded.seen WHERE user_presence.seen<?`).bind(now,digest(token),u.id,now,now-15000).run();
 }else{
  await limit('friends:'+u.id,30,1);
  if(['request','accept','decline','cancel','invite'].includes(b.action)){
   if(typeof b.target!=='string'||!b.target||b.target.length>80||b.target===u.id)throw new AppError('请选择同桌的其他玩家');
   if(['request','invite'].includes(b.action)){
    if(typeof b.code!=='string'||!/^\d{6}$/.test(b.code))throw new AppError('请输入有效的房间号');
    if(b.action==='request')await requestFriend(u.id,b.target,b.code);else await inviteFriend(u.id,b.target,b.code);
   }else await respondFriend(u.id,b.target,b.action);
  }else if(b.action==='open_invite'||b.action==='dismiss_invite'){
   if(typeof b.inviteId!=='string'||b.inviteId.length>80)throw new AppError('邀请无效');
   if(b.action==='open_invite')return json(await openInvite(u.id,b.inviteId));
   await db().prepare('UPDATE room_invites SET dismissed=1 WHERE id=? AND recipient=?').bind(b.inviteId,u.id).run();
  }else throw new AppError('未知操作');
 }
 return json(await socialSnapshot(u.id));
});}
