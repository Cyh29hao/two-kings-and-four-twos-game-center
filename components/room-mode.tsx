"use client";
import {Bot,Users} from 'lucide-react';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
export function RoomMode({mode,onChange,bots}:{mode:string;onChange:(v:string)=>void;bots:number}){
 return <fieldset className="room-mode"><legend>同桌玩家</legend><RadioGroup value={mode} onValueChange={onChange} className="room-mode-options" aria-label="同桌玩家"><label className={mode==='friends'?'is-selected':''}><RadioGroupItem value="friends"/><Users size={19}/><span><b>好友联机</b><small>邀请朋友一起玩</small></span></label><label className={mode==='practice'?'is-selected':''}><RadioGroupItem value="practice"/><Bot size={20}/><span><b>人机测试</b><small>你 + {bots} 位进阶陪练</small></span></label></RadioGroup>{mode==='practice'&&<p>机器人自动准备、自动操作。测试不影响账号积分，可以随时结束。</p>}</fieldset>;
}
export function PracticeBanner({mahjong=false,mixed=false}:{mahjong?:boolean;mixed?:boolean}){return <div className="practice-banner"><Bot size={20}/><div><b>{mixed?'好友 + 人机':'人机测试'} · 进阶陪练</b><span>{mahjong?'本桌筹码与战报正常保留，不影响账号积分。':'本局照常计算输赢，不累计到账号积分。'}机器人只使用自己手牌与公开信息。</span></div></div>}
