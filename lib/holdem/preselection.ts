import type {HoldemActionPreview} from './engine.ts';
export type BettingAction='fold'|'check'|'call'|'allin'|'raise';
export type Selection={action:BettingAction;callAtSelection:string};
export type PreselectionContext={scope:string;ownAction:string;eligible:boolean;acting:boolean;preview:HoldemActionPreview|null};
export type PreselectionDraft={eligible:boolean;scope:string;ownAction:string;raise:string;selected:Selection|null;notice:string};
export function newDraft(context:PreselectionContext):PreselectionDraft{
 return {eligible:context.eligible,scope:context.scope,ownAction:context.ownAction,raise:context.eligible?context.preview?.minRaise??'':'',selected:null,notice:''};
}
/** Ordinary opponent turns and polls retain the draft; local lifecycle boundaries do not. */
export function reconcileDraft(draft:PreselectionDraft,context:PreselectionContext):PreselectionDraft{
 if(draft.scope!==context.scope||draft.ownAction!==context.ownAction||draft.eligible!==context.eligible)return newDraft(context);
 const p=context.preview,action=draft.selected?.action;
 if(action==='check'&&p&&!p.check)return {...draft,selected:null,notice:'现在需要跟注，已取消过牌预选。'};
 if(action==='call'&&p?.check)return {...draft,selected:null,notice:'当前无需跟注，请选择过牌。'};
 if(action==='allin'&&p&&!p.canAllIn)return {...draft,selected:null,notice:p.allInReason};
 return draft;
}
export function selectAction(draft:PreselectionDraft,action:BettingAction,p:HoldemActionPreview):PreselectionDraft{
 return {...draft,notice:'',selected:draft.selected?.action===action?null:{action,callAtSelection:p.call}};
}
export function raiseDetails(value:string,p:HoldemActionPreview,alreadyBet:string){
 if(!/^(0|[1-9]\d{0,99})$/.test(value))return {valid:false,extra:null,error:'请输入整数筹码'};
 const amount=BigInt(value),extra=amount-BigInt(alreadyBet);
 const error=!p.canRaise?p.raiseReason:amount<BigInt(p.minRaise)?`最低加注至 ${p.minRaise}，请修改金额`:amount>BigInt(p.maxRaise)?`最多加注至 ${p.maxRaise}`:'';
 return {valid:!error,extra:extra>=0n?extra.toString():null,error};
}
/** No effect or timer dispatches actions. A fresh deliberate click is always required. */
export function canSubmitAction(action:BettingAction,context:PreselectionContext,raise:string,alreadyBet:string){
 const p=context.preview;
 if(!context.eligible||!context.acting||!p)return false;
 return action==='fold'||action==='check'&&p.check||action==='call'&&!p.check||action==='allin'&&p.canAllIn||action==='raise'&&raiseDetails(raise,p,alreadyBet).valid;
}
