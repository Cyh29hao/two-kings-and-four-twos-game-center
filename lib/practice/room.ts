import {bid,play,view,type Game} from '../game/engine.ts';
import {modernSeat,modernView,moveModern,confirmWin,type ModernGame} from '../mahjong/modern.ts';
import {BOT_DELAY_MS,BOT_NAMES} from './types.ts';
import {landlordDecision} from './landlord.ts';
import {mahjongDecision,mahjongPlan} from './mahjong.ts';
type PracticeGame=Game|ModernGame;
const mahjong=(g:PracticeGame):g is ModernGame=>'kind' in g&&g.kind==='mahjong';
export function fillBots(g:PracticeGame){
 if(g.seats.length!==1||g.phase!=='waiting')throw Error('只能在建房时选择人机测试');
 const botIds:string[]=[];
 for(let i=0;i<(mahjong(g)?3:2);i++){const id='bot:'+crypto.randomUUID(),name=BOT_NAMES[i];botIds.push(id);
  if(mahjong(g))g.seats.push({...modernSeat(id,name,g.initialChips),bot:true,ready:true});
  else g.seats.push({id,name,hand:[],ready:true,plays:0,last:'',bot:true});
 }g.practice={difficulty:'advanced',botIds,nextAt:0};
}
export function nextBot(g:PracticeGame){
 if(!g.practice||!['bidding','playing','choosing'].includes(g.phase))return -1;
 const bot=(i:number)=>!!g.seats[i]?.bot&&g.practice!.botIds.includes(g.seats[i].id);
 if(mahjong(g)&&g.phase==='choosing')return bot(g.winner)?g.winner:-1;
 if(mahjong(g)&&g.pending)return g.pending.eligible.find(i=>bot(i)&&!Object.hasOwn(g.pending!.responses,String(i)))??-1;
 return bot(g.turn)?g.turn:-1;
}
/** Called inside the same version-guarded transaction as every game update. */
export function scheduleBots(g:PracticeGame,now=Date.now()){
 if(!g.practice)return;
 if(['waiting','finished'].includes(g.phase))g.seats.forEach(s=>{if(s.bot)s.ready=true;});
 g.practice.nextAt=nextBot(g)>=0?now+BOT_DELAY_MS:0;
}
export function advanceBot(g:PracticeGame,now=Date.now()){
 const seat=nextBot(g);if(seat<0||!g.practice!.nextAt||g.practice!.nextAt>now)return false;
 if(mahjong(g)&&g.pending&&g.deadline<=now)return false;
 if(mahjong(g)){
  if(g.phase==='choosing'){confirmWin(g,seat,mahjongPlan(g.choice!),now);return true;}
  const v=modernView(g,g.seats[seat].id),me=v.seats[seat];
  const action=mahjongDecision({hand:me.hand,melds:me.melds,wildcard:v.wildcard,remaining:v.remaining,visible:v.seats.flatMap(s=>[...s.hand,...s.river,...s.melds.flatMap(m=>m.tiles)]),river:v.seats.flatMap(s=>s.river),options:v.options,pending:v.pending});
  moveModern(g,seat,action,now);
 }else{
  const v=view(g,g.seats[seat].id),opponents=v.seats.filter((_,i)=>(i===v.landlord)!==(seat===v.landlord));
  const next=(seat+1)%3,nextEnemy=(next===v.landlord)!==(seat===v.landlord);
  const action=landlordDecision({hand:v.seats[seat].hand,phase:v.phase as 'bidding'|'playing',bid:v.bid,last:v.last?.combo??null,lastIsTeammate:!!v.last&&seat!==v.landlord&&v.last.seat!==v.landlord,nextOpponentCount:nextEnemy?v.seats[next].count:0,opponentMinimum:Math.min(...opponents.map(s=>s.count))});
  if(action.action==='bid')bid(g,seat,action.value,now);else play(g,seat,action.action==='pass'?[]:action.cards,now);
 }return true;
}
