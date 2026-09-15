import {AppError,body,config,db,json,limit,publicUser,requireUser,safe} from '@/lib/server';
import {advance,commit,getRoom,roomView,isMahjong,isHoldem} from '@/lib/rooms';
import {bid,deal,newGame,play,doubleChoice,landlordRules,type Game} from '@/lib/game/engine';
import {bidV3,buyV3Equipment,finishShopping,isLandlordV3,newLandlordV3,playV3,readyV3,sellV3Equipment,type V3Game} from '@/lib/game/landlord-v3';
import {fillBots,addRoomBot,removeRoomBot,resetRosterReady,transferHumanHost} from '@/lib/practice/room';
import {practiceMode,soloPractice} from '@/lib/practice/types';
export const dynamic='force-dynamic';
export async function GET(req:Request){return safe(async()=>{
 const u=await requireUser(req),code=new URL(req.url).searchParams.get('room');
 if(code){let r=await getRoom(code);let g=JSON.parse(r.state) as Game;if(isHoldem(g))throw new AppError('这是德州扑克房间，请从德州入口进入',409);if(isMahjong(g))throw new AppError('这是麻将房间，请从麻将入口进入',409);if(!g.seats.some(s=>s.id===u.id))throw new AppError('你不在这个房间',403);r=await advance(r);g=JSON.parse(r.state);return json(await roomView(r,g,u.id));}
 const [c,m,all]=await Promise.all([config(),db().prepare('SELECT room_code,COALESCE(json_extract(rooms.state,\'$.kind\'),\'landlord\') AS kind FROM members JOIN rooms ON rooms.code=members.room_code WHERE user_id=?').bind(u.id).first<{room_code:string;kind:string}>(),db().prepare('SELECT result,room_code,created FROM records WHERE COALESCE(json_extract(result,\'$.kind\'),\'landlord\') IN (\'landlord\',\'landlord-v3\') AND EXISTS (SELECT 1 FROM json_each(records.result,\'$.seats\') WHERE json_extract(value,\'$.id\')=?) ORDER BY created DESC LIMIT 12').bind(u.id).all()]);return json({user:publicUser(u),config:c,activeRoom:m?.room_code||null,activeKind:m?.kind||null,records:all.results.map(x=>({...x,result:JSON.parse(x.result as string)}))});
});}
export async function POST(req:Request){return safe(async()=>{
 const u=await requireUser(req),b=await body(req);await limit('game:'+u.id,180,1);
 if(b.action==='create'){
 const c=await config();if(c.maintenance)throw new AppError('暂时暂停开新桌，请稍后再来');
 const title=typeof b.title==='string'&&b.title.trim()?b.title.trim():`${u.display} 的牌桌`;if(title.length>24)throw new AppError('房间名最多 24 个字符');
 const code=String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000);const g=b.rules?.id==='landlord-v3'?newLandlordV3(u.id,u.display,c.seconds):newGame(u.id,u.display,c.seconds),now=Date.now();
 try{if(!isLandlordV3(g))g.rules=landlordRules(b.rules);if(practiceMode(b.mode))fillBots(g);}catch(e){throw new AppError((e as Error).message);}
 try{await db().batch([db().prepare('INSERT INTO rooms (code,title,state,phase,revision,op,created,updated) VALUES (?,?,?,\'waiting\',0,?,?,?)').bind(code,title,JSON.stringify(g),crypto.randomUUID(),now,now),db().prepare('INSERT INTO members (user_id,room_code) VALUES (?,?)').bind(u.id,code)]);}catch(e){if(String(e).includes('UNIQUE'))throw new AppError('你已有房间，或房间号重复，请返回大厅后重试',409);throw e;}
 return json(await roomView(await getRoom(code),g,u.id));
 }
 if(typeof b.code!=='string'||!/^\d{6}$/.test(b.code))throw new AppError('请输入 6 位房间号');
 let r=await getRoom(b.code);let g=JSON.parse(r.state) as Game|V3Game;
 if(isHoldem(g)){if(b.action==='join')return json({redirect:'/holdem?room='+r.code});throw new AppError('请从德州入口进入',409);}
 if(isMahjong(g)){if(b.action==='join')return json({redirect:'/mahjong?room='+r.code});throw new AppError('这是麻将房间，请从麻将入口进入',409);}
 if(b.action==='join'){
 if(g.phase==='closed')throw new AppError('该房间已关闭');
 if(g.seats.some(s=>s.id===u.id))return json(await roomView(r,g,u.id));
 if(soloPractice(g))throw new AppError('这是个人的人机测试房，不能加入其他玩家',403);
 if(g.phase!=='waiting'||g.seats.length>=3)throw new AppError('该房间已满或正在对局');
 if((await config()).maintenance)throw new AppError('暂时暂停加入新桌');
 g.seats.push({id:u.id,name:u.display,hand:[],ready:false,plays:0,last:''});resetRosterReady(g);r=await commit(r,g,(guard,op)=>[db().prepare(`INSERT INTO members (user_id,room_code) SELECT ?,? WHERE ${guard}`).bind(u.id,r.code,r.code,op)]);return json(await roomView(r,g,u.id));
 }
 const seat=g.seats.findIndex(s=>s.id===u.id);if(seat<0)throw new AppError('你不在这个房间',403);
 if(b.revision!==r.revision)throw new AppError('牌桌已更新，请重试',409);
 if(b.action==='add_bot'||b.action==='remove_bot'){
  if(g.host!==u.id)throw new AppError('只有房主可以调整人机座位',403);
  try{if(b.action==='add_bot')addRoomBot(g);else removeRoomBot(g,b.botId);}catch(e){throw new AppError((e as Error).message);}
  r=await commit(r,g);return json(await roomView(r,g,u.id));
 }
 if(b.action==='end_practice'){
  if(!soloPractice(g)||g.host!==u.id)throw new AppError('只有个人测试房的房主可以使用结束测试',403);
  g.phase='closed';g.deadline=0;g.log.push({text:'房主结束人机测试，未完成对局不计分',at:Date.now()});
  r=await commit(r,g,(guard,op)=>[db().prepare(`DELETE FROM members WHERE room_code=? AND ${guard}`).bind(r.code,r.code,op)]);return json({left:true});
 }
 if(['bid','play','pass','double','v3_bid','shop_buy','shop_sell','shop_done'].includes(b.action)&&g.deadline<=Date.now()){r=await advance(r);throw new AppError('本次操作已超时，已为你自动操作',409);}
 if(isLandlordV3(g)){
  if(b.action==='leave'){
   if(g.phase==='closed')return json({left:true});if(soloPractice(g))throw new AppError('请使用结束测试，系统会关闭整个人机房');if(!['waiting','finished'].includes(g.phase))throw new AppError('对局中请留在房间；关闭页面后仍会超时托管');
   g.seats.splice(seat,1);g.phase=g.seats.length?'waiting':'closed';g.seats.forEach(s=>{s.ready=false;s.hand=[];s.last=''});g.host=g.seats[0]?.id||'';g.bottom=[];g.last=null;g.tableActions=[];g.winner=-1;g.deadline=0;g.landlord=-1;g.bid='0';g.stake='0';g.turn=0;transferHumanHost(g);
   r=await commit(r,g,(guard,op)=>[db().prepare(`DELETE FROM members WHERE user_id=? AND ${guard}`).bind(u.id,r.code,op)]);return json({left:true});
  }
  try{if(b.action==='ready')readyV3(g,seat);else if(b.action==='shop_buy')buyV3Equipment(g,seat,b.offerId);else if(b.action==='shop_sell')sellV3Equipment(g,seat,b.instanceId);else if(b.action==='shop_done')finishShopping(g,seat);else if(b.action==='v3_bid')bidV3(g,seat,b.call);else if(b.action==='play'){if(!Array.isArray(b.cards))throw Error('请选择手牌');playV3(g,seat,b.cards);}else if(b.action==='pass')playV3(g,seat,[]);else throw Error('未知操作');}catch(e){throw new AppError((e as Error).message)}
  r=await commit(r,g);return json(await roomView(r,g,u.id));
 }
 if(b.action==='ready'){if(!['waiting','finished'].includes(g.phase))throw new AppError('对局中不能修改准备状态');g.seats[seat].ready=!g.seats[seat].ready;if(g.seats.length===3&&g.seats.every(s=>s.ready))deal(g);}
 else if(b.action==='double'){try{doubleChoice(g,seat,b.value)}catch(e){throw new AppError((e as Error).message)}}
 else if(b.action==='bid'){try{bid(g,seat,b.value)}catch(e){throw new AppError((e as Error).message)}}
 else if(b.action==='play'){if(!Array.isArray(b.cards))throw new AppError('请选择手牌');try{play(g,seat,b.cards)}catch(e){throw new AppError((e as Error).message)}}
 else if(b.action==='pass'){try{play(g,seat,[])}catch(e){throw new AppError((e as Error).message)}}
 else if(b.action==='leave'){
 if(g.phase==='closed')return json({left:true});
 if(soloPractice(g))throw new AppError('请使用结束测试，系统会关闭整个人机房');
 if(!['waiting','finished'].includes(g.phase))throw new AppError('对局中请留在房间；关闭页面后仍会超时托管');
 g.seats.splice(seat,1);g.phase=g.seats.length?'waiting':'closed';g.seats.forEach(s=>{s.ready=false;s.hand=[];s.last=''});g.host=g.seats[0]?.id||'';g.bottom=[];g.last=null;g.tableActions=[];g.winner=-1;g.deltas=[];g.deadline=0;g.landlord=-1;g.bid=0;g.turn=0;g.multiplier=1;g.spring=false;
 transferHumanHost(g);
 r=await commit(r,g,(guard,op)=>[db().prepare(`DELETE FROM members WHERE user_id=? AND ${guard}`).bind(u.id,r.code,op)]);return json({left:true});
 }else throw new AppError('未知操作');
 r=await commit(r,g);return json(await roomView(r,g,u.id));
});}
