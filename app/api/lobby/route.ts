import {config,db,json,publicUser,safe,user} from '@/lib/server';
export const dynamic='force-dynamic';
/** Shared session and lobby metadata; expensive history is loaded only on /history. */
export async function GET(req:Request){return safe(async()=>{const u=await user(req);if(!u)return json({user:null});const [c,m]=await Promise.all([config(),db().prepare("SELECT room_code,COALESCE(json_extract(state,'$.kind'),'landlord') AS kind FROM members JOIN rooms ON rooms.code=room_code WHERE user_id=?").bind(u.id).first<{room_code:string;kind:string}>()]);return json({user:publicUser(u),config:c,activeRoom:m?.room_code??null,activeKind:m?.kind??null});});}
