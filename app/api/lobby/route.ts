import {config,db,json,publicUser,safe,user} from '@/lib/server';
import {advance,getRoom,isMahjong} from '@/lib/rooms';
import {isModern} from '@/lib/mahjong/game';
export const dynamic='force-dynamic';
/** Shared metadata also advances a pending departure while its player waits in the lobby. */
export async function GET(req:Request){return safe(async()=>{
 const u=await user(req);if(!u)return json({user:null});
 const [c,member]=await Promise.all([config(),db().prepare("SELECT room_code,COALESCE(json_extract(state,'$.kind'),'landlord') AS kind FROM members JOIN rooms ON rooms.code=room_code WHERE user_id=?").bind(u.id).first<{room_code:string;kind:string}>()]);
 let m=member,departurePending=false;
 if(m?.kind==='mahjong'){
  let r=await getRoom(m.room_code),g=JSON.parse(r.state);
  if(isMahjong(g)&&isModern(g)&&g.leavingIds?.includes(u.id)){
   r=await advance(r);g=JSON.parse(r.state);
   departurePending=!!g.leavingIds?.includes(u.id);
   if(!departurePending)m=await db().prepare("SELECT room_code,COALESCE(json_extract(state,'$.kind'),'landlord') AS kind FROM members JOIN rooms ON rooms.code=room_code WHERE user_id=?").bind(u.id).first<{room_code:string;kind:string}>();
  }
 }
 return json({user:publicUser(u),config:c,activeRoom:m?.room_code??null,activeKind:m?.kind??null,departurePending});
});}
