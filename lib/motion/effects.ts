import type {EffectId} from './events.ts';
import type {FrameMotion} from './timeline.ts';
export type TableEffect={id:EffectId;label:string;src:string;duration:number;motion?:FrameMotion};
const timing:Partial<Record<EffectId,number[]>>={
 bomb:[150,100,90,80,80,70,70,120,100,100,90,90,90,120,180,380],
 airplane:[140,100,100,110,110,110,110,130,130,110,110,100,100,120,160,300],
 rocket:[120,100,100,100,90,90,90,110,130,110,110,110,110,150,180,300],
 'airplane-single':[140,100,100,110,110,110,110,130,130,110,110,100,100,120,160,300],
 'airplane-pair':[140,100,100,110,110,110,110,130,130,110,110,100,100,120,160,300],
 hu:[100,90,90,100,100,100,100,140,120,110,100,100,100,120,180,350],
};
export const TABLE_EFFECTS:readonly TableEffect[]=(Object.entries({bomb:'炸弹',rocket:'王炸',straight:'顺子',pairs:'连对',airplane:'飞机','airplane-single':'飞机带单','airplane-pair':'飞机带对','four-two':'四带二','four-pairs':'四带两对',spring:'春天','anti-spring':'反春天',chi:'吃',pong:'碰',kong:'杠',hu:'胡'}) as [EffectId,string][]).map(([id,label])=>{
 const src=`/effects/v1/${id}/poster.webp`,durations=timing[id];
 return {id,label,src,duration:durations?.reduce((a,b)=>a+b,0)??1200,...(durations?{motion:{id:`effect-${id}`,label,poster:src,sheets:[{src:`/effects/v1/${id}/atlas.webp`,columns:4,rows:4,cellWidth:360,cellHeight:360}],frames:durations.map((duration,cell)=>({sheet:0,cell,duration}))}}:{})};
});
export const getTableEffect=(id:string)=>TABLE_EFFECTS.find(effect=>effect.id===id);
