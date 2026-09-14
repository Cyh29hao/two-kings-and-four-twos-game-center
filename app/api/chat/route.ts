import {AppError,body,db,json,limit,requireUser,safe} from '@/lib/server';
import {getRoom} from '@/lib/rooms';
export const dynamic='force-dynamic';
async function member(code:unknown,id:string){
 if(typeof code!=='string'||!/^\d{6}$/.test(code))throw new AppError('房间号无效');
 const room=await getRoom(code),game=JSON.parse(room.state);
 if(!game.seats.some((s:{id:string;bot?:boolean})=>s.id===id&&!s.bot))throw new AppError('只有同桌玩家可以查看聊天',403);
 return room;
}
export async function GET(req:Request){return safe(async()=>{
 const user=await requireUser(req),room=await member(new URL(req.url).searchParams.get('room'),user.id);
 const rows=await db().prepare('SELECT id,display AS name,text,created,author_id=? AS own FROM room_messages WHERE room_code=? ORDER BY id DESC LIMIT 80').bind(user.id,room.code).all();
 return json({messages:rows.results.reverse(),closed:room.phase==='closed'});
});}
export async function POST(req:Request){return safe(async()=>{
 const user=await requireUser(req),b=await body(req),room=await member(b.code,user.id);
 if(room.phase==='closed')throw new AppError('牌桌已结束，聊天记录只读');
 const text=typeof b.text==='string'?b.text.trim():'';
 if(!text||text.length>500||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))throw new AppError('请输入 1–500 个字的聊天内容');
 if(typeof b.clientId!=='string'||!/^[-a-f0-9]{36}$/.test(b.clientId))throw new AppError('消息标识无效');
 const existing=await db().prepare('SELECT id,text FROM room_messages WHERE room_code=? AND author_id=? AND client_id=?').bind(room.code,user.id,b.clientId).first<{id:number;text:string}>();
 if(existing){if(existing.text!==text)throw new AppError('这条消息已发送，请勿重复修改',409);return json({sent:true,id:existing.id});}
 await limit('chat:'+user.id,20,1);
 // This write has its own idempotency key; it never changes the game revision or robot deadline.
 await db().prepare(`INSERT INTO room_messages (room_code,author_id,client_id,display,text,created)
 SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM rooms r,json_each(r.state,'$.seats') s WHERE r.code=? AND r.phase!='closed' AND json_extract(s.value,'$.id')=?)
 ON CONFLICT(room_code,author_id,client_id) DO NOTHING`).bind(room.code,user.id,b.clientId,user.display,text,Date.now(),room.code,user.id).run();
 const sent=await db().prepare('SELECT id,text FROM room_messages WHERE room_code=? AND author_id=? AND client_id=?').bind(room.code,user.id,b.clientId).first<{id:number;text:string}>();
 if(!sent)throw new AppError('你已离开房间，或牌桌已结束',409);
 if(sent.text!==text)throw new AppError('这条消息已发送，请勿重复修改',409);
 return json({sent:true,id:sent.id});
});}
