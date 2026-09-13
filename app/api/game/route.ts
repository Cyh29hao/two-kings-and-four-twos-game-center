import {AppError,body,config,db,json,limit,publicUser,requireUser,safe} from '@/lib/server';
import {advance,commit,getRoom,roomView,isMahjong} from '@/lib/rooms';
import {bid,deal,newGame,play,type Game} from '@/lib/game/engine';
export const dynamic='force-dynamic';
export async function GET(req:Request){return safe(async()=>{
 const u=await requireUser(req),code=new URL(req.url).searchParams.get('room');
 if(code){let r=await getRoom(code);let g=JSON.parse(r.state) as Game;if(isMahjong(g))throw new AppError('这是麻将房间，请从麻将入口进入',409);if(!g.seats.some(s=>s.id===u.id))throw new AppError('你不在这个房间',403);r=await advance(r);g=JSON.parse(r.state);return json(roomView(r,g,u.id));}
 const [c,m,all]=await Promise.all([config(),db().prepare('SELECT room_code,COALESCE(json_extract(rooms.state,\'$.kind\'),\'landlord\') AS kind FROM members JOIN rooms ON rooms.code=members.room_code WHERE user_id=?').bind(u.id).first<{room_code:string;kind:string}>(),db().prepare('SELECT result,room_code,created FROM records WHERE COALESCE(json_extract(result,\'$.kind\'),\'landlord\')=\'landlord\' AND EXISTS (SELECT 1 FROM json_each(records.result,\'$.seats\') WHERE json_extract(value,\'$.id\')=?) ORDER BY created DESC LIMIT 12').bind(u.id).all()]);return json({user:publicUser(u),config:c,activeRoom:m?.room_code||null,activeKind:m?.kind||null,records:all.results.map(x=>({...x,result:JSON.parse(x.result as string)}))});
});}
export async function POST(req:Request){return safe(async()=>{
 const u=await requireUser(req),b=await body(req);await limit('game:'+u.id,180,1);
 if(b.action==='create'){
 const c=await config();if(c.maintenance)throw new AppError('暂时暂停开新桌，请稍后再来');
 const title=typeof b.title==='string'&&b.title.trim()?b.title.trim():`${u.display} 的牌桌`;if(title.length>24)throw new AppError('房间名最多 24 个字符');
 const code=String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000);const g=newGame(u.id,u.display,c.seconds),now=Date.now();
 try{await db().batch([db().prepare('INSERT INTO rooms (code,title,state,phase,revision,op,created,updated) VALUES (?,?,?,\'waiting\',0,?,?,?)').bind(code,title,JSON.stringify(g),crypto.randomUUID(),now,now),db().prepare('INSERT INTO members (user_id,room_code) VALUES (?,?)').bind(u.id,code)]);}catch(e){if(String(e).includes('UNIQUE'))throw new AppError('你已有房间，或房间号重复，请返回大厅后重试',409);throw e;}
 return json(roomView(await getRoom(code),g,u.id));
 }
 if(typeof b.code!=='string'||!/^\d{6}$/.test(b.code))throw new AppError('请输入 6 位房间号');
 let r=await getRoom(b.code);let g=JSON.parse(r.state) as Game;
 if(isMahjong(g)){if(b.action==='join')return json({redirect:'/mahjong?room='+r.code});throw new AppError('这是麻将房间，请从麻将入口进入',409);}
 if(b.action==='join'){
 if(g.phase==='closed')throw new AppError('该房间已关闭');
 if(g.seats.some(s=>s.id===u.id))return json(roomView(r,g,u.id));
 if(g.phase!=='waiting'||g.seats.length>=3)throw new AppError('该房间已满或正在对局');
 if((await config()).maintenance)throw new AppError('暂时暂停加入新桌');
 g.seats.push({id:u.id,name:u.display,hand:[],ready:false,plays:0,last:''});r=await commit(r,g,(guard,op)=>[db().prepare(`INSERT INTO members (user_id,room_code) SELECT ?,? WHERE ${guard}`).bind(u.id,r.code,r.code,op)]);return json(roomView(r,g,u.id));
 }
 const seat=g.seats.findIndex(s=>s.id===u.id);if(seat<0)throw new AppError('你不在这个房间',403);
 if(b.revision!==r.revision)throw new AppError('牌桌已更新，请重试',409);
 if(['bid','play','pass'].includes(b.action)&&g.deadline<=Date.now()){r=await advance(r);throw new AppError('本次操作已超时，已为你自动操作',409);}
 if(b.action==='ready'){if(!['waiting','finished'].includes(g.phase))throw new AppError('对局中不能修改准备状态');g.seats[seat].ready=!g.seats[seat].ready;if(g.seats.length===3&&g.seats.every(s=>s.ready))deal(g);}
 else if(b.action==='bid'){try{bid(g,seat,b.value)}catch(e){throw new AppError((e as Error).message)}}
 else if(b.action==='play'){if(!Array.isArray(b.cards))throw new AppError('请选择手牌');try{play(g,seat,b.cards)}catch(e){throw new AppError((e as Error).message)}}
 else if(b.action==='pass'){try{play(g,seat,[])}catch(e){throw new AppError((e as Error).message)}}
 else if(b.action==='leave'){
 if(g.phase==='closed')return json({left:true});
 if(!['waiting','finished'].includes(g.phase))throw new AppError('对局中请留在房间；关闭页面后仍会超时托管');
 g.seats.splice(seat,1);g.phase=g.seats.length?'waiting':'closed';g.seats.forEach(s=>{s.ready=false;s.hand=[];s.last=''});g.host=g.seats[0]?.id||'';g.bottom=[];g.last=null;g.winner=-1;g.deltas=[];g.deadline=0;g.landlord=-1;g.bid=0;g.turn=0;g.multiplier=1;g.spring=false;
 r=await commit(r,g,(guard,op)=>[db().prepare(`DELETE FROM members WHERE user_id=? AND ${guard}`).bind(u.id,r.code,op)]);return json({left:true});
 }else throw new AppError('未知操作');
 r=await commit(r,g);return json(roomView(r,g,u.id));
});}
