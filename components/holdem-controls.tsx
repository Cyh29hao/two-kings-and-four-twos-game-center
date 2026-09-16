"use client";
import {useRef,useState,type ReactNode} from 'react';
import {useHoldemTimeoutChoice} from './use-holdem-timeout-choice';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {HoldemCard} from './holdem-card';
import {TableNotice,TurnClock,RoundSummary} from './table-ui';
import {chips} from '@/lib/mahjong/report';
import type {HoldemView} from '@/lib/holdem/engine';
import {newDraft,reconcileDraft,selectAction,paymentDetails,canSubmitAction,type BettingAction,type PreselectionContext} from '@/lib/holdem/preselection';

type Props={game:HoldemView;userId:string;roomCode:string;connected:boolean;reset:number;seconds:number;busy:boolean;onAction:(action:string,extra?:Record<string,unknown>)=>Promise<boolean>;onTimeoutChoice:(payload:Record<string,unknown>)=>Promise<boolean>;children:ReactNode};
export function HoldemControls({game:g,userId,roomCode,connected,reset,seconds,busy,onAction,onTimeoutChoice,children}:Props){
 const me=g.seats.find(s=>s.id===userId),preview=g.actionPreview??null;
 const eligible=!!me&&g.phase==='playing'&&!me.folded&&!me.allIn&&connected&&!!preview&&(!g.options.acting||seconds>0);
 const context:PreselectionContext={scope:[roomCode,userId,g.round,g.street,reset].join(':'),ownAction:me?[me.bet,me.stack,me.last].join(':'):'',alreadyBet:me?.bet,eligible,acting:g.options.acting&&seconds>0,preview};
 const [saved,setDraft]=useState(()=>newDraft(context)),draft=reconcileDraft(saved,context);
 if(draft!==saved)setDraft(draft);
 const submitting=useRef(false);
 const wagerOpen=draft.selected?.action==='raise'||draft.selected?.action==='allin';
 const details=preview&&me?paymentDetails(draft.raise,preview,me.bet,me.stack):null;
 const verb=g.currentBet==='0'?'下注':'加注',callAction=preview?.check?'check':'call';
 const label=(action:BettingAction)=>action==='fold'?'弃牌':action==='check'?'过牌':action==='call'?`跟注 ${chips(preview?.call??'0')}`:action==='allin'?`全下 ${chips(me?.stack??'0')}`:`${verb}，本次投入 ${/^\d+$/.test(draft.raise)?chips(draft.raise):'—'}`;
 function choose(action:BettingAction){
  if(!eligible||!preview||busy||submitting.current)return;
  setDraft(selectAction(draft,action,preview));
 }
 async function confirm(){
  const action=draft.selected?.action;
  if(!action||busy||timeoutStatus==='saving'||submitting.current||!canSubmitAction(action,context,details?.target??'',me?.bet??'0'))return;
  submitting.current=true;
  try{if(await onAction(action,action==='raise'?{amount:details!.target}:{}))setDraft(newDraft(context));}
  finally{submitting.current=false;}
 }
 const selected=draft.selected?.action;
 const timeoutLegal=!!selected&&!!preview&&canSubmitAction(selected,{...context,acting:true},details?.target??'',me?.bet??'0')&&(selected!=='call'||BigInt(preview.call)<=BigInt(draft.selected!.callAtSelection));
 const timeoutPayload=JSON.stringify({round:g.round,street:g.street,bet:me?.bet,stack:me?.stack,choice:timeoutLegal?{action:selected,amount:selected==='raise'?details?.target:undefined,maxCall:draft.selected!.callAtSelection}:null});
 const timeoutStatus=useHoldemTimeoutChoice(context.scope+timeoutPayload,eligible,timeoutPayload,onTimeoutChoice);
 function fillPayment(value:string){if(!preview||busy)return;setDraft({...draft,raise:value,selected:{action:'raise',callAtSelection:preview.call},notice:''});}
 function addPayment(amount:string){const value=/^(0|[1-9]\d{0,99})$/.test(draft.raise)?BigInt(draft.raise):BigInt(preview?.call??'0');fillPayment((value+BigInt(amount)).toString());}
 const changedCall=draft.selected?.action==='call'&&preview&&draft.selected.callAtSelection!==preview.call;
 const betting=g.phase==='playing'&&!!me&&!me.folded&&!me.allIn;
 const notice=!connected?'连接恢复后可操作':busy?'正在提交…':g.options.acting&&seconds<=0?'操作时间已到':[
  draft.notice,changedCall?`跟注由 ${chips(draft.selected!.callAtSelection)} 变为 ${chips(preview!.call)}`:'',
  draft.selected?.action==='raise'?details?.error:'',
 ].filter(Boolean).join('；');
 const result=g.result?.seats.find(s=>s.id===userId);
 return <section className="th-controls table-dock" aria-label="我的德州操作">
  <div className="th-controls-header"><div className="th-own"><div className="th-own-cards" aria-label="我的底牌">{me?.hand.map(c=><HoldemCard card={c} key={c} size="own"/>)}</div><strong aria-label={`剩余筹码 ${chips(me?.stack??'0')}`}>{chips(me?.stack??'0')}<small> 筹码</small></strong>{context.acting&&<TurnClock seconds={seconds}/>}</div><div className="th-social">{children}</div></div>
  {betting?<div className="table-action-area" aria-label={context.acting?'当前行动':'提前准备'}>
   <div className="table-action-row th-action-choices" role="group" aria-label="选择动作">
    <Button variant="outline" aria-pressed={draft.selected?.action==='fold'} disabled={!eligible||busy} onClick={()=>choose('fold')}>{draft.selected?.action==='fold'?'✓ ':''}弃牌</Button>
    <Button variant="outline" aria-pressed={draft.selected?.action===callAction} disabled={!eligible||busy} onClick={()=>choose(callAction)}>{draft.selected?.action===callAction?'✓ ':''}{label(callAction)}</Button>
    <Button variant="outline" aria-pressed={draft.selected?.action==='raise'} disabled={!eligible||busy} aria-expanded={wagerOpen} aria-controls="holdem-wager-panel" onClick={()=>choose('raise')}>{draft.selected?.action==='raise'?'✓ ':''}{verb}</Button>
    <Button className="th-confirm" disabled={busy||timeoutStatus==='saving'||!draft.selected||!canSubmitAction(draft.selected.action,context,details?.target??'',me?.bet??'0')} title={draft.selected?label(draft.selected.action):'请先选择动作'} onClick={()=>void confirm()}>{busy?'提交中…':'确认'}</Button>
   </div>
   {wagerOpen&&<div className="table-choice-panel th-wager-panel" id="holdem-wager-panel" aria-label="下注金额">
    <label htmlFor="holdem-raise-amount">本次投入<Input id="holdem-raise-amount" inputMode="numeric" maxLength={100} value={draft.raise} aria-invalid={!!details?.error} onChange={e=>setDraft({...draft,raise:e.target.value,selected:preview?{action:'raise',callAtSelection:preview.call}:null,notice:''})} disabled={!eligible||busy}/></label>
    <div className="th-wager-summary"><span role="status" aria-live="polite">将付出 <strong>{draft.selected?.action==='allin'?chips(me.stack):details?.extra==null?'—':chips(details.extra)}</strong> · 剩余 {draft.selected?.action==='allin'?'0':details?.remaining===null?'—':chips(details?.remaining??me.stack)}</span><small>本次范围 {chips((BigInt(preview?.minRaise??'0')-BigInt(me.bet)).toString())}–{chips(me.stack)}{preview?.betStep!=='1'&&<> · {chips(preview?.betStep??'1')} 的倍数</>}</small></div>
    <div className="th-quick-payments" role="group" aria-label="快速填入金额"><Button variant="outline" disabled={!eligible||busy} onClick={()=>fillPayment(preview?.call??'0')}>跟注额 {chips(preview?.call??'0')}</Button>{['10','50','200'].map(amount=><Button key={amount} variant="outline" disabled={!eligible||busy} onClick={()=>addPayment(amount)}>+{amount}</Button>)}</div>
    <Button variant="outline" aria-pressed={draft.selected?.action==='allin'} disabled={!eligible||busy||!preview?.canAllIn} onClick={()=>choose('allin')}>{draft.selected?.action==='allin'?'✓ ':''}全下 {chips(me.stack)}</Button>
    {!preview?.canAllIn&&<TableNotice>{preview?.allInReason}</TableNotice>}
   </div>}
   {(selected||timeoutStatus==='failed')&&<TableNotice>{timeoutStatus==='saving'?'正在保存到时方案…':timeoutStatus==='failed'?'更改未保存，原到时方案可能仍有效，请重新操作':timeoutLegal&&timeoutStatus==='saved'?`到时执行：${label(selected!)}`:'到时能过则过，否则弃牌'}</TableNotice>}
   <TableNotice>{notice}</TableNotice>
  </div>:<div className="table-action-area">
   {g.phase==='finished'&&result&&<RoundSummary title={g.result?.type==='aborted'?'本局中止':BigInt(result.delta)>0n?'本局获胜':BigInt(result.delta)<0n?'本局结束':'本局持平'} delta={chips(result.delta,true)}/>}
   {['waiting','finished'].includes(g.phase)?<div className="table-action-row">{me?.stack==='0'?<Button disabled={busy} onClick={()=>void onAction('rebuy')}>补入 {chips(g.rules.initial)}</Button>:<Button disabled={busy} onClick={()=>void onAction('ready')}>{me?.ready?'取消准备':g.phase==='finished'?'准备下一局':'准备好了'}</Button>}<span className="table-muted">{g.seats.filter(s=>s.ready).length}/{g.rules.capacity} 已准备</span></div>:<span className="table-muted">{g.phase==='closed'?'整桌已结束':me?.folded?'已弃牌':me?.allIn?'已全下':g.phase==='runout'?'正在摊牌':''}</span>}
  </div>}
 </section>;
}
