import * as legacy from './engine.ts';
import * as modern from './modern.ts';
import {BASIC_136,BASIC_CHIPS,HAM} from './rules.ts';
export type MahjongGame=legacy.MahjongGame|modern.ModernGame;
export function isModern(g:MahjongGame):g is modern.ModernGame{
 if(g.schemaVersion===2&&[HAM.id,BASIC_CHIPS.id].includes(g.rules.id))return true;
 if(g.schemaVersion===1&&g.rules.id===BASIC_136.id)return false;
 throw Error('无法识别这桌的规则版本，不能降级为旧玩法');
}
export function timeoutMahjong(g:MahjongGame,now=Date.now()){return isModern(g)?modern.timeoutModern(g,now):legacy.timeoutMahjong(g,now);}
export function dealMahjong(g:MahjongGame){return isModern(g)?modern.dealModern(g):legacy.dealMahjong(g);}
export function moveMahjong(g:MahjongGame,seat:number,m:modern.ModernMove){return isModern(g)?modern.moveModern(g,seat,m):legacy.moveMahjong(g,seat,m as legacy.Move);}
export function mahjongView(g:MahjongGame,id:string){if(isModern(g))return modern.modernView(g,id);return {...legacy.mahjongView(g,id),schemaVersion:1 as const,
  wildcard:-1,result:null,session:null,entries:[],canChoose:false,seats:legacy.mahjongView(g,id).seats.map(s=>({...s,balance:null}))};}
export type MahjongView=ReturnType<typeof mahjongView>;
