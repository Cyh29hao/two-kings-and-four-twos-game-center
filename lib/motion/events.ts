/** Public, cosmetic events. Never attach tile identities, hands, or claim options. */
export type EffectId='bomb'|'rocket'|'straight'|'pairs'|'airplane'|'airplane-single'|'airplane-pair'|'four-two'|'four-pairs'|'spring'|'anti-spring'|'chi'|'pong'|'kong'|'hu';
export type VisualEvent={id:string;round:string;seat:number;type:EffectId|'discard';at:number;detail?:'exposed'|'concealed'|'added'|'self'|'discard'|'rob'};
export type VisualState={round:string;visualEvents?:VisualEvent[]};
export function emitVisual(g:VisualState,seat:number,type:VisualEvent['type'],at:number,detail?:VisualEvent['detail']){
 const event:VisualEvent={id:crypto.randomUUID(),round:g.round,seat,type,at,...(detail?{detail}:{})};
 g.visualEvents=[...(g.visualEvents??[]),event].slice(-32);return event.id;
}
export const DDZ_EFFECTS:Readonly<Record<string,EffectId>>={'炸弹':'bomb','王炸':'rocket','顺子':'straight','连对':'pairs','飞机':'airplane','飞机带单':'airplane-single','飞机带对':'airplane-pair','四带二':'four-two','四带两对':'four-pairs'};
export function publicVisuals(g:VisualState):VisualEvent[]{return (g.visualEvents??[]).filter(e=>e.round===g.round).slice(-32).map(({id,round,seat,type,at,detail})=>({id,round,seat,type,at,...(detail?{detail}:{})}));}
export const IMPORTANT_EFFECTS=new Set<EffectId>(['bomb','rocket','airplane','airplane-single','airplane-pair','hu']);
export type VisualFrame={code:string;revision:number;serverNow:number;receivedAt:number;game:VisualState&{phase:string}};
/** Polling order and reconnection are independent of server event ids. */
export function freshVisuals(previous:VisualFrame|null,next:VisualFrame):VisualEvent[]{
 if(!previous||next.code!==previous.code||next.game.round!==previous.game.round||next.game.phase==='closed'||next.revision<=previous.revision||next.receivedAt-previous.receivedAt>10000)return [];
 const seen=new Set((previous.game.visualEvents??[]).map(e=>e.id));
 return publicVisuals(next.game).filter(e=>!seen.has(e.id)&&e.at<=next.serverNow+1000&&next.serverNow-e.at<2500);
}
