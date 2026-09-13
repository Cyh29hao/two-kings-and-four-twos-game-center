import {AppError,body,config,db,json,requireUser,safe} from '@/lib/server';
import {commit,getRoom,type RoomGame} from '@/lib/rooms';
export const dynamic='force-dynamic';
export async function GET(req:Request){return safe(async()=>{await requireUser(req,true);const [c,users,rooms,records,audit]=await Promise.all([config(),db().prepare('SELECT id,display,username,role,banned,score,created FROM users ORDER BY created DESC LIMIT 200').all(),db().prepare('SELECT code,title,phase,updated,COALESCE(json_extract(state,\'$.kind\'),\'landlord\') AS kind,json_array_length(state,\'$.seats\') AS count FROM rooms WHERE phase!=\'closed\' ORDER BY updated DESC LIMIT 100').all(),db().prepare('SELECT id,room_code,result,created FROM records ORDER BY created DESC LIMIT 100').all(),db().prepare('SELECT actor,action,created FROM audit ORDER BY created DESC LIMIT 30').all()]);return json({config:c,users:users.results,rooms:rooms.results,records:records.results.map(r=>({...r,result:JSON.parse(r.result as string)})),audit:audit.results});})}
export async function POST(req:Request){return safe(async()=>{const u=await requireUser(req,true),b=await body(req);let description='';
 if(b.action==='settings'){
 if(![15,30,45,60].includes(b.seconds)||typeof b.announcement!=='string'||b.announcement.length>300||typeof b.maintenance!=='boolean')throw new AppError('设置内容无效');
 await db().batch(Object.entries({seconds:String(b.seconds),announcement:b.announcement,maintenance:String(b.maintenance)}).map(([k,v])=>db().prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k,v)));description='更新公告、开桌状态和对局时限';
 }else if(b.action==='ban'){
 if(typeof b.id!=='string'||typeof b.banned!=='boolean')throw new AppError('用户参数无效');const target=await db().prepare('SELECT role,display FROM users WHERE id=?').bind(b.id).first<{role:string;display:string}>();if(!target||target.role==='admin')throw new AppError('不能停用管理员账号');
 await db().batch([db().prepare('UPDATE users SET banned=? WHERE id=? AND role!=\'admin\'').bind(b.banned?1:0,b.id),db().prepare('DELETE FROM sessions WHERE user_id=?').bind(b.id)]);description=`${b.banned?'停用':'恢复'}账号 ${target.display}`;
 }else if(b.action==='close'){
 if(typeof b.code!=='string')throw new AppError('房间号无效');const r=await getRoom(b.code),g=JSON.parse(r.state) as RoomGame;g.phase='closed';g.deadline=0;g.log.push({text:'管理员已关闭房间，本局不计分',at:Date.now()});
 await commit(r,g,(guard,op)=>[db().prepare(`DELETE FROM members WHERE room_code=? AND ${guard}`).bind(r.code,r.code,op)]);description=`关闭房间 ${r.code}`;
 }else throw new AppError('未知操作');
 await db().prepare('INSERT INTO audit (id,actor,action,created) VALUES (?,?,?,?)').bind(crypto.randomUUID(),u.display,description,Date.now()).run();return json({ok:true});
});}
