import {closeModern,type ModernGame} from './modern.ts';

/** Keep seat identities and chip accounting intact until the current round settles. */
export function requestDeparture(g:ModernGame,id:string,now=Date.now()){
 const seat=g.seats.find(s=>s.id===id&&!s.bot);
 if(!seat||g.departedIds?.includes(id))throw Error('你已不在这个房间');
 if(g.phase==='closed')return;
 if(!g.leavingIds?.includes(id)){
  (g.leavingIds??=[]).push(id);seat.ready=false;
  g.log.push({text:`${seat.name} 将在本局结算后离桌`,at:now});
 }
}
/** Called inside the room transaction. Historical seats are never removed or reused. */
export function settleDepartures(g:ModernGame,now=Date.now()):string[]{
 if(!['waiting','finished','closed'].includes(g.phase)||!g.leavingIds?.length)return [];
 const ids=[...new Set(g.leavingIds)];g.departedIds=[...new Set([...(g.departedIds??[]),...ids])];g.leavingIds=[];
 for(const id of ids){const s=g.seats.find(s=>s.id===id);if(s){s.ready=false;g.log.push({text:`${s.name} 已离桌，结算已保留`,at:now});}}
 const humans=g.seats.filter(s=>!s.bot&&!g.departedIds!.includes(s.id));
 if(!humans.some(s=>s.id===g.host))g.host=humans[0]?.id??'';
 if(!humans.length&&g.phase!=='closed')closeModern(g,false,now,'empty');
 return ids;
}
