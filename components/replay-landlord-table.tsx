"use client";

import {Coins,Crown,Layers,Trophy} from 'lucide-react';
import type {ReplayFrame} from '@/lib/replay/types';
import type {ChatBubble} from '@/lib/chat-bubbles';
import type {TableAction} from '@/lib/game/engine';
import type {RoyalGame} from '@/lib/motion/royal';
import {PlayerAvatar} from './player-avatar';
import {PlayerChat} from './player-chat';
import {RoyalBackground,RoyalCharacter} from './royal-character';
import {EquipmentRack} from './equipment-ui';
import {CardGroupPreview,HandStrip,SeatAction} from './poker-table';
import {LandlordTableHud,LandlordTableStage} from './landlord-table-display';
import {ReplaySkillShop} from './replay-skill-shop';
import {V3_EQUIPMENT_CATALOG} from '@/lib/game/landlord-v3';
import '@/app/landlord.css';
import '@/app/skill-table.css';
import '@/app/landlord-layout.css';
import '@/app/replay-landlord.css';

export function ReplayLandlordTable({frame,perspective,bubbles={},onInspect}:{frame:ReplayFrame;perspective:number;bubbles?:Record<string,ChatBubble>;onInspect?:()=>void}){
 const scene=frame.scene;
 const seats=scene.seats;
 if(!seats.length)return null;
 const self=Math.max(0,Math.min(perspective,seats.length-1));
 const v3=scene.game==='landlord-v3';
 const four=seats.length===4;
 const appearance=v3?'classic':'royal';
 const bottom=scene.bottomRevealed?scene.bottom:[];
 const game={...scene,bottom,last:scene.lastPlay??(scene.last?.length?{cards:scene.last}:null),...(v3?{rules:{...scene.rules,equipmentCatalog:scene.rules?.equipmentCatalog??V3_EQUIPMENT_CATALOG}}:{})};
 const royalGame={round:scene.round??'replay',phase:scene.phase,landlord:scene.landlord??-1,winner:scene.winner??-1,tableActions:scene.tableActions??[]} as RoyalGame;
 const action=(index:number)=>(scene.tableActions?.[index]??null) as TableAction|null;
 const role=(index:number)=>scene.landlord===index?'地主':(scene.landlord??-1)<0?'牌友':'农民';
 const isTurn=(index:number)=>scene.phase==='doubling'?scene.doubles?.[index]===null:scene.turn===index&&['playing','bidding','equipment'].includes(scene.phase);
 const remaining=(index:number)=>seats[index]?.count??seats[index]?.hand.length??0;
 const name=(index:number)=>seats[index]?.name??`玩家 ${index+1}`;
 return <div className={`room-shell table-light landlord-layout replay-landlord-shell${v3?' skill-room':` ordinary-room royal-room${four?' four-player-room':''}`}`} aria-label="斗地主牌桌回放">
  {!v3&&<RoyalBackground/>}
  <div className={`game-table landlord-board ${v3?'skill-mode':'ordinary-mode'} phase-${scene.phase}`}>
   <LandlordTableHud game={game} v3={v3} four={four} replay/>
   <div className="landlord-arena">
    <div className="landlord-opponents">{(four?[3,2,1]:[2,1]).map(off=>{const index=(self+off)%seats.length,seat=seats[index];return <section className={`landlord-seat side-${four?off===3?'left':off===2?'north':'right':off===2?'left':'right'}`} key={index} aria-label={`${seat.name}的座位`}>
     <div className={`opponent${isTurn(index)?' active-seat':''}`}>
      {!v3&&<RoyalCharacter game={royalGame} seat={index} userId={seat.id??''} connected={false}/>}
      <PlayerChat bubble={bubbles[seat.id??'']} align={off===1?'end':'start'}><PlayerAvatar name={seat.name} userId={seat.id} bot={seat.bot}/></PlayerChat>
      <strong>{seat.name}{seat.bot&&<span className="bot-label">机器人</span>}</strong>
      {v3&&<EquipmentRack game={game} items={(scene.equipment?.[index]??[]) as Parameters<typeof EquipmentRack>[0]['items']}/>}
      <span className={scene.landlord===index?'landlord-label':'seat-role'}>{scene.landlord===index?<><Crown size={13}/>地主</>:role(index)}</span>
      {v3&&scene.dealer===index&&<span className="dealer-label">庄家</span>}
      <span className="seat-score">{v3?<><span title="金币"><Coins size={14}/>{scene.coins?.[index]??0}</span><span title="胜利点"><Trophy size={14}/>{scene.victoryPoints?.[index]??0}</span></>:seat.tableScore!==undefined?String(seat.tableScore):'—'}</span>
      <span className="card-count" data-low={remaining(index)<6} aria-label={`剩余 ${remaining(index)} 张`}><Layers size={14}/>{remaining(index)}</span>
      {!v3&&scene.doubles?.[index]!=null&&<span className="royal-double">个人 ×{scene.doubles[index]?2:1}</span>}
     </div>
     {scene.phase!=='finished'&&<SeatAction showClock={false} appearance={appearance} action={action(index)} active={false} bidding={scene.phase==='bidding'} doubling={scene.phase==='doubling'} equipment={scene.phase==='equipment'} name={seat.name}/>}
     <div className="replay-opponent-hand" onClick={onInspect}><CardGroupPreview cards={seat.hand} name={`${seat.name}的手牌`} appearance={appearance} showLabel/></div>
    </section>})}</div>
    <LandlordTableStage game={game} seat={self} v3={v3}/>
    <div className="landlord-self-action">{scene.phase!=='finished'&&<SeatAction showClock={false} appearance={appearance} action={action(self)} active={false} bidding={scene.phase==='bidding'} doubling={scene.phase==='doubling'} equipment={scene.phase==='equipment'} name={name(self)}/>}</div>
    <div className="self-label"><div>{!v3&&<RoyalCharacter game={royalGame} seat={self} userId={seats[self].id??''} connected={false}/>}<PlayerChat bubble={bubbles[seats[self].id??'']} align="start"><PlayerAvatar name={name(self)} userId={seats[self].id} bot={seats[self].bot}/></PlayerChat><div className="self-identity"><strong>{name(self)}</strong>{v3&&<EquipmentRack game={game} items={(scene.equipment?.[self]??[]) as Parameters<typeof EquipmentRack>[0]['items']}/>}</div><span className="seat-score">{v3?<><span><Coins size={14}/>{scene.coins?.[self]??0}</span><span><Trophy size={14}/>{scene.victoryPoints?.[self]??0}</span></>:seats[self].tableScore!==undefined?String(seats[self].tableScore):'—'}</span><span className="self-role">{role(self)}</span>{v3&&scene.dealer===self&&<span className="dealer-label">庄家</span>}</div></div>
   </div>
   {v3&&scene.phase==='shopping'?<ReplaySkillShop scene={scene} seat={self}/>:<div className="self-area replay-self-area"><div className="landlord-hand-zone">{scene.phase==='finished'?<CardGroupPreview showLabel cards={seats[self].hand} name="本人剩余牌" appearance={appearance}/>:<HandStrip readOnly layoutMode={v3?'skill':four?'four':'ordinary'} appearance={appearance} hand={seats[self].hand} round={scene.round??'replay'}/>}</div></div>}
  </div>
 </div>;
}
