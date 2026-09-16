"use client";
import {forwardRef,type ComponentProps,type ReactNode} from 'react';
import {Timer,SlidersHorizontal} from 'lucide-react';
import {Button} from './ui/button';
export function TurnClock({seconds,label='轮到你'}:{seconds:number;label?:string}){
 return <span className={`table-clock${seconds<=5?' is-urgent':''}`} aria-label={`${label}，剩余 ${seconds} 秒`}><Timer size={14}/><b>{seconds}</b><span className="sr-only">秒</span></span>;
}
export function TableNotice({children}:{children?:ReactNode}){return children?<p className="table-notice" role="status">{children}</p>:null;}
export function RoundSummary({title,delta,children}:{title:string;delta:string;children?:ReactNode}){
 return <div className="table-round-summary"><h2>{title}</h2><p>本局 <strong className={delta.startsWith('-')?'negative':'positive'}>{delta}</strong></p>{children}</div>;
}
export const TableDetailsTrigger=forwardRef<HTMLButtonElement,ComponentProps<typeof Button>>(function TableDetailsTrigger(props,ref){
 return <Button {...props} ref={ref} variant="ghost" size="icon" className="table-tool" aria-label="牌桌详情" title="牌桌详情"><SlidersHorizontal size={18}/></Button>;
});
