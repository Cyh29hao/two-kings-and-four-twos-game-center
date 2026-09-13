import {AppError,body,config,db,json,limit,publicUser,requireUser,safe} from '@/lib/server';
import {advance,commit,getRoom,isMahjong,type Room} from '@/lib/rooms';
import {newMahjong,newSeat,dealMahjong,moveMahjong,mahjongView,type MahjongGame,type Move} from '@/lib/mahjong/engine';
import {BASIC_136} from '@/lib/mahjong/rules';
export const dynamic='force-dynamic';
function visible(r:Room,g:MahjongGame,id:string){return{code:r.code,title:r.title,revision:r.revision,serverNow:Date.now(),game:mahjongView(g,id)};}
export async function GET(req:Request){return safe(async()=>{
 const u=await requireUser(req),code=new URL(req.url).searchParams.get('room');
 if(code){let r=await getRoom(code);let g=JSON.parse(r.state);if(!isMahjong(g))throw new AppError('这是斗地主房间，请从斗地主入口进入',409);if(!g.seats.some(s=>s.id===u.id))throw new AppError('请先加入这个房间',403);r=await advance(r);g=JSON.parse(r.state);return json(visible(r,g,u.id));}
 const [c,member,records]=await Promise.all([
  config(),db().prepare("SELECT room_code,COALESCE(json_extract(rooms.state,'$.kind'),'landlord') AS kind FROM members JOIN rooms ON rooms.code=members.room_code WHERE user_id=?").bind(u.id).first<{room_code:string;kind:string}>(),
  db().prepare("SELECT result,room_code,created FROM records WHERE json_extract(result,'$.kind')='mahjong' AND EXISTS(SELECT 1 FROM json_each(records.result,'$.seats') WHERE json_extract(value,'$.id')=?) ORDER BY created DESC LIMIT 12").bind(u.id).all(),
 ]);
 return json({user:publicUser(u),config:c,rules:BASIC_136,activeRoom:member?.room_code||null,activeKind:member?.kind||null,records:records.results.map(r=>({...r,result:JSON.parse(r.result as string)}))});
});}
export async function POST(req:Request){return safe(async()=>{
 const u=await requireUser(req),b=await body(req);await limit('mahjong:'+u.id,180,1);
 if(b.action==='create'){
  const c=await config();if(c.maintenance)throw new AppError('暂时暂停开新桌，请稍后再来');
  if(b.rulesId&&b.rulesId!==BASIC_136.id)throw new AppError('当前仅开放 136 张基础试玩规则');
  const title=typeof b.title==='string'&&b.title.trim()?b.title.trim():`${u.display} 的麻将桌`;if(title.length>24)throw new AppError('房间名最多 24 个字符');
  const code=String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000),g=newMahjong(u.id,u.display,c.seconds),now=Date.now();
  try{await db().batch([
   db().prepare("INSERT INTO rooms (code,title,state,phase,revision,op,created,updated) VALUES (?,?,?,'waiting',0,?,?,?)").bind(code,title,JSON.stringify(g),crypto.randomUUID(),now,now),
   db().prepare('INSERT INTO members (user_id,room_code) VALUES (?,?)').bind(u.id,code),
  ]);}catch(e){if(String(e).includes('UNIQUE'))throw new AppError('你已有房间，或房间号重复，请回大厅后重试',409);throw e;}
  return json(visible(await getRoom(code),g,u.id));
 }
 if(typeof b.code!=='string'||!/^\d{6}$/.test(b.code))throw new AppError('请输入 6 位房间号');
 let r=await getRoom(b.code),g=JSON.parse(r.state);if(!isMahjong(g)){if(b.action==='join')return json({redirect:'/?room='+r.code});throw new AppError('这是斗地主房间',409);}
 if(b.action==='join'){
  if(g.phase==='closed')throw new AppError('该房间已关闭');
  if(g.seats.some(s=>s.id===u.id))return json(visible(r,g,u.id));
  if(g.phase!=='waiting'||g.seats.length>=4)throw new AppError('该房间已满或正在对局');
  if((await config()).maintenance)throw new AppError('暂时暂停加入新桌');
  g.seats.push(newSeat(u.id,u.display));r=await commit(r,g,(guard,op)=>[db().prepare(`INSERT INTO members (user_id,room_code) SELECT ?,? WHERE ${guard}`).bind(u.id,r.code,r.code,op)]);
  return json(visible(r,g,u.id));
 }
 const seat=g.seats.findIndex(s=>s.id===u.id);if(seat<0)throw new AppError('你不在这个房间',403);
 if(b.revision!==r.revision)throw new AppError('牌桌已更新，请重试',409);
 if(b.action==='ready'){
  if(!['waiting','finished'].includes(g.phase))throw new AppError('对局中不能修改准备状态');g.seats[seat].ready=!g.seats[seat].ready;if(g.seats.length===4&&g.seats.every(s=>s.ready))dealMahjong(g);
 }else if(b.action==='leave'){
  if(g.phase==='closed')return json({left:true});
  if(!['waiting','finished'].includes(g.phase))throw new AppError('对局中不能离座；掉线后会按时限自动操作');
  g.seats.splice(seat,1);g.phase=g.seats.length?'waiting':'closed';g.seats.forEach(s=>{s.ready=false;s.hand=[];s.melds=[];s.river=[];s.last='';});g.host=g.seats[0]?.id||'';g.wall=[];g.pending=null;g.deadline=0;g.drawn=null;g.lastDiscard=null;g.winner=-1;g.source=-1;g.winType=null;g.deltas=[];g.dealer=0;g.turn=0;g.roundNumber=0;
  await commit(r,g,(guard,op)=>[db().prepare(`DELETE FROM members WHERE user_id=? AND ${guard}`).bind(u.id,r.code,op)]);return json({left:true});
 }else if(['discard','claim','pass','hu','kong'].includes(b.action)){
  if(g.deadline<=Date.now()){await advance(r);throw new AppError('本次操作已超时，已按默认规则处理',409);}
  try{moveMahjong(g,seat,b as Move);}catch(e){throw new AppError((e as Error).message);}
 }else throw new AppError('未知操作');
 r=await commit(r,g);return json(visible(r,g,u.id));
});}
