"use client";
import {Bot,Plus} from 'lucide-react';
import {Button} from './ui/button';

export type BotSeatControls={busy:boolean;add:()=>void;remove:(id:string)=>void};
export function EmptyBotSeat({controls}:{controls?:BotSeatControls}){
 return <div className="empty-bot-seat"><span className="empty-seat"><Plus size={24}/></span><strong>等一位朋友</strong>{controls&&<Button variant="outline" className="add-bot-button" disabled={controls.busy} onClick={controls.add}><Bot size={15}/>添加人机</Button>}</div>;
}
export function RemoveBotSeat({id,name,controls}:{id:string;name:string;controls?:BotSeatControls}){
 return controls?<Button variant="ghost" className="remove-bot-button" aria-label={`移除人机 ${name}`} disabled={controls.busy} onClick={()=>controls.remove(id)}>移除人机</Button>:null;
}
