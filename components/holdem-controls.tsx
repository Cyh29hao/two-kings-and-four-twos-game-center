"use client";
import {useState,type ReactNode} from 'react';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {HoldemCard} from './holdem-card';
import {chips} from '@/lib/mahjong/report';
import type {HoldemView} from '@/lib/holdem/engine';
import {newDraft,reconcileDraft,selectAction,raiseDetails,canSubmitAction,type BettingAction,type PreselectionContext} from '@/lib/holdem/preselection';

type Props={game:HoldemView;userId:string;roomCode:string;connected:boolean;reset:number;seconds:number;busy:boolean;onAction:(action:string,extra?:Record<string,unknown>)=>Promise<boolean>;children:ReactNode};
export function HoldemControls({game:g,userId,roomCode,connected,reset,seconds,busy,onAction,children}:Props){
 const me=g.seats.find(s=>s.id===userId),preview=g.actionPreview??null;
 const eligible=!!me&&g.phase==='playing'&&!me.folded&&!me.allIn&&connected&&!!preview&&(!g.options.acting||seconds>0);
 const context:PreselectionContext={scope:[roomCode,userId,g.round,g.street,reset].join(':'),ownAction:me?[me.bet,me.stack,me.last].join(':'):'',eligible,acting:g.options.acting&&seconds>0,preview};
 const [saved,setDraft]=useState(()=>newDraft(context)),draft=reconcileDraft(saved,context);
 // Derive before rendering as well as saving: stale selections can never be clicked for one frame.
 if(draft!==saved)setDraft(draft);
 const details=preview&&me?raiseDetails(draft.raise,preview,me.bet):null;
 const verb=g.currentBet==='0'?'下注至':'加注至',callAction=preview?.check?'check':'call';
 function choose(action:BettingAction){
  if(!eligible||!preview||busy)return;
  if(!g.options.acting){setDraft(selectAction(draft,action,preview));return;}
  if(!canSubmitAction(action,context,draft.raise,me?.bet??'0'))return;
  void onAction(action,action==='raise'?{amount:draft.raise}:{}).then(ok=>{if(ok)setDraft(newDraft(context))});
 }
 const label=(action:BettingAction,text:string)=>`${draft.selected?.action===action?(g.options.acting?'确认':'已预选 · '):''}${text}`;
 const changedCall=draft.selected?.action==='call'&&preview&&draft.selected.callAtSelection!==preview.call;
 const betting=g.phase==='playing'&&!!me&&!me.folded&&!me.allIn;
 return <section className="th-controls" aria-label="我的德州操作">
  <div className="th-controls-header"><div className="th-own"><div className="th-own-cards">{me?.hand.map(c=><HoldemCard card={c} key={c} size="own"/>)}</div><div><b>{me?.name}</b><span>筹码 {chips(me?.stack??'0')} · 累计带入 {chips(me?.brought??'0')}</span></div></div><div className="th-social">{children}</div></div>
  {betting?<div className="th-betting">
   <div className="th-action-status" role="status"><span>{!connected?'连接恢复后可操作':g.options.acting?seconds>0?`轮到你 · ${seconds} 秒，请确认本次操作`:'本次操作时间已到，等待牌桌更新':'可提前选择，轮到你后确认'}</span><button type="button" disabled={!draft.selected||busy} style={{visibility:draft.selected?'visible':'hidden'}} onClick={()=>setDraft({...draft,selected:null,notice:''})}>取消预选</button></div>
   <div className="th-actions">
    <Button variant="outline" disabled={busy||!eligible||g.options.acting&&seconds<=0} aria-pressed={draft.selected?.action==='fold'} onClick={()=>choose('fold')}>{label('fold','弃牌')}</Button>
    <Button disabled={busy||!eligible||g.options.acting&&seconds<=0} aria-pressed={draft.selected?.action===callAction} onClick={()=>choose(callAction)}>{label(callAction,preview?.check?'过牌':`跟注 ${chips(preview?.call??'0')}`)}</Button>
    <Button variant="outline" disabled={busy||!eligible||!preview?.canAllIn||g.options.acting&&seconds<=0} title={preview?.allInReason} aria-pressed={draft.selected?.action==='allin'} onClick={()=>choose('allin')}>{label('allin',`全下 ${chips(me.stack)}`)}</Button>
    <div className="th-raise"><label htmlFor="holdem-raise-amount">{verb}本轮总额</label><div><Input id="holdem-raise-amount" aria-label="加注至本轮总额" inputMode="numeric" maxLength={100} value={draft.raise} aria-invalid={!!details?.error} onChange={e=>setDraft({...draft,raise:e.target.value,notice:''})} disabled={!eligible||busy}/><Button disabled={!eligible||busy||!details?.valid||g.options.acting&&seconds<=0} aria-pressed={draft.selected?.action==='raise'} onClick={()=>choose('raise')}>{label('raise',verb)}</Button></div></div>
   </div>
   <div className="th-wager-details"><span>至少 {chips(preview?.minRaise??'0')} · 最多 {chips(preview?.maxRaise??'0')}</span><span>本次再投入 {details?.extra!==null&&details?.extra!==undefined?chips(details.extra):'—'}</span></div>
   <p className="th-draft-feedback" role="status">{[draft.notice,changedCall?`跟注已由 ${chips(draft.selected!.callAtSelection)} 变为 ${chips(preview!.call)}，确认前请核对。`:'',details?.error||preview?.allInReason].filter(Boolean).join('；')||'预选只保存在本机，不会自动下注。'}</p>
  </div>:['waiting','finished'].includes(g.phase)?<div className="th-actions th-between-hands">{me?.stack==='0'?<Button disabled={busy} onClick={()=>void onAction('rebuy')}>补入 {chips(g.rules.initial)} 筹码</Button>:<Button disabled={busy} onClick={()=>void onAction('ready')}>{me?.ready?'取消准备':'准备好了'}</Button>}<span>{g.seats.filter(s=>s.ready).length}/{g.rules.capacity} 人准备</span></div>:<p className="th-controls-status">{g.phase==='closed'?'整桌已结束':me?.folded?'本手已弃牌，等待下一手':me?.allIn?'本手已全下，等待结果':g.phase==='runout'?'正在翻公共牌':'等待其他牌友行动'}</p>}
 </section>;
}
