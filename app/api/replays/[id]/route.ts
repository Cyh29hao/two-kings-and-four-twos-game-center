import {AppError,db,json,requireUser,safe} from '@/lib/server';
import type {ReplayFrame} from '@/lib/replay/types';

export const dynamic='force-dynamic';

type ReplayRow={id:string;game:string;room_code:string;participants:string;created:number;ended:number|null;practice:number};
type TvRow={submitted_by:string;withdrawn_at:number|null};

export const GET=(req:Request,{params}:{params:Promise<{id:string}>})=>safe(async()=>{
 const u=await requireUser(req),{id}=await params;
 if(!/^[a-f0-9-]{36}$/i.test(id))throw new AppError('回放不存在',404);
 const [round,tv]=await Promise.all([
  db().prepare('SELECT id,game,room_code,participants,created,ended,practice FROM replay_rounds WHERE id=?').bind(id).first<ReplayRow>(),
  db().prepare('SELECT submitted_by,withdrawn_at FROM replay_tv WHERE replay_id=?').bind(id).first<TvRow>()
 ]);
 if(!round||round.ended===null)throw new AppError('回放尚未完成或不存在',404);
 const participant=(JSON.parse(round.participants) as string[]).includes(u.id);
 const published=!!tv&&tv.withdrawn_at===null;
 if(!participant&&!published)throw new AppError('你不能查看这场回放',403);
 const rows=await db().prepare('SELECT frame FROM replay_frames WHERE round_id=? ORDER BY seq').bind(id).all<{frame:string}>();
 if(!rows.results.length)throw new AppError('这场对局没有可播放的步骤',404);
 const frames=rows.results.map(row=>JSON.parse(row.frame) as ReplayFrame);
 // A TV viewer receives only seat labels, including in the per-step action text.
 if(!participant){
  const names=frames[0].scene.seats.map((seat,index)=>({name:seat.name,label:seat.bot?`人机 ${index+1}`:`玩家 ${index+1}`})).filter(seat=>seat.name).sort((a,b)=>b.name.length-a.name.length);
  const labels=new Map(names.map(({name,label})=>[name,label]));
  const namesPattern=new RegExp(names.map(({name})=>name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
  for(const frame of frames){
   frame.action=frame.action.replace(namesPattern,name=>labels.get(name)??name);
   frame.scene.seats=frame.scene.seats.map((seat,index)=>({...seat,name:seat.bot?`人机 ${index+1}`:`玩家 ${index+1}`}));
  }
 }
 return json({id,game:round.game,roomCode:participant?round.room_code:undefined,created:round.created,ended:round.ended,practice:!!round.practice,frames,
  tv:{status:published?'published':'none',canManage:participant&&(tv===null||published&&(tv.submitted_by===u.id||u.role==='admin'))}});
});
