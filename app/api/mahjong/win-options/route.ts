import {AppError,json,requireUser,safe,limit} from '@/lib/server';
import {getRoom,advance,isMahjong} from '@/lib/rooms';
import {isModern} from '@/lib/mahjong/game';
import {winPlans} from '@/lib/mahjong/solver';
export async function GET(req:Request){return safe(async()=>{
 const u=await requireUser(req),q=new URL(req.url).searchParams;await limit('win-options:'+u.id,120,1);
 const initial=await getRoom(q.get('room')||''),initialGame=JSON.parse(initial.state);
 if(!isMahjong(initialGame)||!isModern(initialGame)||!initialGame.seats.some(s=>s.id===u.id))throw new AppError('只有同桌玩家可以查看胡牌方案',403);
 const r=await advance(initial),g=JSON.parse(r.state);
 if(!isMahjong(g)||!isModern(g)||g.phase!=='choosing'||!g.choice)throw new AppError('当前没有待选择的胡牌方案',409);
 if(g.seats[g.winner].id!==u.id)throw new AppError('只有本次胡牌者可以查看候选方案',403);
 const all=winPlans(g.choice),fan=q.get('fan'),target=q.get('target'),wild=q.get('wild');
 const filtered=all.filter(p=>(!fan||p.fans.some(f=>f.id===fan))&&(!target||p.assignments.some(a=>(!wild||String(a.tile)===wild)&&String(a.type)===target)));
 const page=Math.max(0,Math.min(Math.floor(Number(q.get('page'))||0),Math.max(0,Math.ceil(filtered.length/12)-1)));
 return json({round:g.round,revision:r.revision,deadline:g.deadline,serverNow:Date.now(),total:filtered.length,allTotal:all.length,page,pageSize:12,plans:filtered.slice(page*12,page*12+12),wildTiles:g.choice.hand.filter(t=>Math.floor(t/4)===g.wildcard),fans:[...new Map(all.flatMap(p=>p.fans.map(f=>[f.id,f] as const))).values()]});
});}
