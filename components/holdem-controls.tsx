"use client";
import {useState,type ReactNode} from 'react';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {HoldemCard} from './holdem-card';
import {TableNotice,TurnClock,RoundSummary} from './table-ui';
import {chips} from '@/lib/mahjong/report';
import type {HoldemView} from '@/lib/holdem/engine';
import {newDraft,reconcileDraft,selectAction,raiseDetails,canSubmitAction,type BettingAction,type PreselectionContext} from '@/lib/holdem/preselection';

type Props={game:HoldemView;userId:string;roomCode:string;connected:boolean;reset:number;seconds:number;busy:boolean;onAction:(action:string,extra?:Record<string,unknown>)=>Promise<boolean>;children:ReactNode};
export function HoldemControls({game:g,userId,roomCode,connected,reset,seconds,busy,onAction,children}:Props){
 const me=g.seats.find(s=>s.id===userId),preview=g.actionPreview??null;
 const eligible=!!me&&g.phase==='playing'&&!me.folded&&!me.allIn&&connected&&!!preview&&(!g.options.acting||seconds>0);
 const context:PreselectionContext={scope:[roomCode,userId,g.round,g.street,reset].join(':'),ownAction:me?[me.bet,me.stack,me.last].join(':'):'',eligible,acting:g.options.acting&&seconds>0,preview};
 const [saved,setDraft]=useState(()=>newDraft(context)),draft=reconcileDraft(saved,context);
 if(draft!==saved)setDraft(draft);
 const scope=[context.scope,context.ownAction,eligible].join('|');
 const [editor,setEditor]=useState({scope,mode:'idle' as 'idle'|'select'|'raise'});
 const mode=editor.scope===scope?editor.mode:'idle';
 const open=(next:'idle'|'select'|'raise')=>setEditor({scope,mode:next});
 const details=preview&&me?raiseDetails(draft.raise,preview,me.bet):null;
 const verb=g.currentBet==='0'?'下注':'加注',callAction=preview?.check?'check':'call';
 const label=(action:BettingAction)=>action==='fold'?'弃牌':action==='check'?'过牌':action==='call'?`跟注 ${chips(preview?.call??'0')}`:action==='allin'?`全下 ${chips(me?.stack??'0')}`:`${verb}至 ${/^\d+$/.test(draft.raise)?chips(draft.raise):'—'}`;
 function choose(action:BettingAction){
  if(!eligible||!preview||busy)return;
  if(!context.acting){setDraft(selectAction(draft,action,preview));open('idle');return;}
  if(!canSubmitAction(action,context,draft.raise,me?.bet??'0'))return;
  void onAction(action,action==='raise'?{amount:draft.raise}:{}).then(ok=>{if(ok){setDraft(newDraft(context));open('idle');}});
 }
 function edit(){const raised=draft.selected?.action==='raise';setDraft({...draft,selected:null,notice:''});open(raised?'raise':'select');}
 const changedCall=draft.selected?.action==='call'&&preview&&draft.selected.callAtSelection!==preview.call;
 const betting=g.phase==='playing'&&!!me&&!me.folded&&!me.allIn;
 const notice=!connected?'连接恢复后可操作':busy?'正在提交…':g.options.acting&&seconds<=0?'操作时间已到':[
  draft.notice,changedCall?`跟注由 ${chips(draft.selected!.callAtSelection)} 变为 ${chips(preview!.call)}`:'',
  mode==='raise'||draft.selected?.action==='raise'?details?.error:'',
 ].filter(Boolean).join('；');
 const result=g.result?.seats.find(s=>s.id===userId);
 return <section className="th-controls table-dock" aria-label="我的德州操作">
  <div className="th-controls-header"><div className="th-own"><div className="th-own-cards" aria-label="我的底牌">{me?.hand.map(c=><HoldemCard card={c} key={c} size="own"/>)}</div><strong aria-label={`剩余筹码 ${chips(me?.stack??'0')}`}>{chips(me?.stack??'0')}<small> 筹码</small></strong>{context.acting&&<TurnClock seconds={seconds}/>}</div><div className="th-social">{children}</div></div>
  {betting?<div className="table-action-area" aria-label={context.acting?'当前行动':'提前准备'}>
   {draft.selected?<div className="th-selection">
    {context.acting?<Button disabled={busy||!canSubmitAction(draft.selected.action,context,draft.raise,me?.bet??'0')} onClick={()=>choose(draft.selected!.action)}>确认{label(draft.selected.action)}</Button>:<span className="th-preselected">已预选：{label(draft.selected.action)}</span>}
    <Button variant="ghost" disabled={busy} onClick={edit}>更改</Button>
    {!context.acting&&<Button variant="ghost" disabled={busy} onClick={()=>{setDraft({...draft,selected:null,notice:''});open('idle');}}>取消</Button>}
   </div>:!context.acting&&mode==='idle'?<Button variant="outline" disabled={!eligible||busy} aria-expanded={false} onClick={()=>open('select')}>提前选择</Button>:<>
    <div className="table-action-row">
     <Button variant="ghost" disabled={!eligible||busy} onClick={()=>choose('fold')}>{context.acting?'':'预选'}弃牌</Button>
     <Button variant={context.acting?'default':'outline'} disabled={!eligible||busy} onClick={()=>choose(callAction)}>{context.acting?'':'预选'}{label(callAction)}</Button>
     <Button variant="outline" disabled={!eligible||busy} aria-expanded={mode==='raise'} aria-controls="holdem-wager-panel" onClick={()=>open(mode==='raise'?'select':'raise')}>{verb}</Button>
     {!context.acting&&<Button variant="ghost" onClick={()=>open('idle')}>收起</Button>}
    </div>
    {mode==='raise'&&<div className="table-choice-panel th-wager-panel" id="holdem-wager-panel" aria-label="下注金额">
     <label htmlFor="holdem-raise-amount">{verb}至<Input id="holdem-raise-amount" inputMode="numeric" maxLength={100} value={draft.raise} aria-invalid={!!details?.error} onChange={e=>setDraft({...draft,raise:e.target.value,notice:''})} disabled={!eligible||busy}/></label>
     <div className="th-wager-summary"><span>本次投入 {details?.extra??'—'}</span><small>范围 {chips(preview?.minRaise??'0')}–{chips(preview?.maxRaise??'0')}</small></div>
     <Button disabled={!eligible||busy||!details?.valid} onClick={()=>choose('raise')}>{context.acting?'确认':'预选'}{verb}</Button>
     <Button variant="outline" disabled={!eligible||busy||!preview?.canAllIn} onClick={()=>choose('allin')}>{context.acting?'':'预选'}全下 {chips(me.stack)}</Button>
     {!preview?.canAllIn&&<TableNotice>{preview?.allInReason}</TableNotice>}
    </div>}
   </>}
   <TableNotice>{notice}</TableNotice>
  </div>:<div className="table-action-area">
   {g.phase==='finished'&&result&&<RoundSummary title={g.result?.type==='aborted'?'本局中止':BigInt(result.delta)>0n?'本局获胜':BigInt(result.delta)<0n?'本局结束':'本局持平'} delta={chips(result.delta,true)}/>}
   {['waiting','finished'].includes(g.phase)?<div className="table-action-row">{me?.stack==='0'?<Button disabled={busy} onClick={()=>void onAction('rebuy')}>补入 {chips(g.rules.initial)}</Button>:<Button disabled={busy} onClick={()=>void onAction('ready')}>{me?.ready?'取消准备':g.phase==='finished'?'准备下一局':'准备好了'}</Button>}<span className="table-muted">{g.seats.filter(s=>s.ready).length}/{g.rules.capacity} 已准备</span></div>:<span className="table-muted">{g.phase==='closed'?'整桌已结束':me?.folded?'已弃牌':me?.allIn?'已全下':g.phase==='runout'?'正在摊牌':''}</span>}
  </div>}
 </section>;
}
