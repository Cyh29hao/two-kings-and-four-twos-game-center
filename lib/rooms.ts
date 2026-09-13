import {AppError,db} from './server';
import {type Game,view,timeout} from './game/engine';
import {type MahjongGame,timeoutMahjong,isModern} from './mahjong/game';
export type RoomGame=Game|MahjongGame;
export function isMahjong(g:RoomGame):g is MahjongGame{return 'kind' in g&&g.kind==='mahjong';}
export type Room={code:string;title:string;state:string;phase:string;revision:number;op:string;created:number;updated:number};
export async function getRoom(code:string){const r=await db().prepare('SELECT * FROM rooms WHERE code=?').bind(code).first<Room>();if(!r)throw new AppError('没有找到这个房间',404);return r;}
export function roomView(r:Room,g:Game,id:string){return{code:r.code,title:r.title,revision:r.revision,game:view(g,id),serverNow:Date.now()};}
export async function commit(r:Room,g:RoomGame,extra?:(guard:string,op:string)=>D1PreparedStatement[]){const op=crypto.randomUUID(),now=Date.now();const guard='EXISTS (SELECT 1 FROM rooms WHERE code=? AND op=?)';const statements=[db().prepare('UPDATE rooms SET state=?,phase=?,revision=revision+1,op=?,updated=? WHERE code=? AND revision=?').bind(JSON.stringify(g),g.phase,op,now,r.code,r.revision)];
 const before=JSON.parse(r.state) as RoomGame;
 if(isMahjong(g)&&isModern(g)){
 const prior=isMahjong(before)&&isModern(before)?before:null;
 const oldIds=new Set(prior?.entries.map(e=>e.id)||[]);
 for(const e of g.entries.filter(e=>!oldIds.has(e.id)))statements.push(db().prepare(`INSERT INTO chip_entries (id,room_code,round_id,kind,entry,created) SELECT ?,?,?,?,?,? WHERE ${guard}`).bind(e.id,r.code,e.round,e.kind,JSON.stringify(e),e.at,r.code,op));
 if(g.result&&g.result.id!==prior?.result?.id)statements.push(db().prepare(`INSERT INTO records (id,room_code,result,created) SELECT ?,?,?,? WHERE ${guard}`).bind(g.result.id,r.code,JSON.stringify(g.result),g.result.ended,r.code,op));
 }else if(g.phase==='finished'&&before.phase!=='finished'){
 statements.push(db().prepare(`INSERT INTO records (id,room_code,result,created) SELECT ?,?,?,? WHERE ${guard}`).bind(g.round,r.code,JSON.stringify({seats:g.seats.map((s,i)=>({id:s.id,name:s.name,delta:g.deltas[i]})),winner:g.winner,log:g.log,...(isMahjong(g)?{kind:'mahjong',rules:g.rules,winType:g.winType,source:g.source}:{kind:'landlord',landlord:g.landlord,bid:g.bid,multiplier:g.multiplier,spring:g.spring})}),now,r.code,op));
 g.seats.forEach((s,i)=>statements.push(db().prepare(`UPDATE users SET score=score+? WHERE id=? AND ${guard}`).bind(g.deltas[i],s.id,r.code,op)));
 }
 if(extra)statements.push(...extra(guard,op));
 let results;try{results=await db().batch(statements)}catch(e){if(String(e).includes('UNIQUE'))throw new AppError('你已在另一个房间，请先返回该房间',409);throw e;}
 if(!results[0].meta.changes)throw new AppError('牌桌已更新，请重试',409);
 return{...r,state:JSON.stringify(g),phase:g.phase,revision:r.revision+1,op,updated:now};
}
export async function advance(r:Room){const g=JSON.parse(r.state) as RoomGame;if(isMahjong(g)?timeoutMahjong(g):timeout(g)){try{return await commit(r,g)}catch(e){if(e instanceof AppError&&e.status===409)return getRoom(r.code);throw e;}}return r;}
