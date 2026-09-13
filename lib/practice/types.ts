export type Practice = {difficulty:'advanced';botIds:string[];nextAt:number};
export const BOT_DELAY_MS=900;
export const BOT_NAMES=['阿竹','小满','阿松'];
export function practiceMode(value:unknown){if(value!==undefined&&value!=='friends'&&value!=='practice')throw Error('请选择好友联机或人机测试');return value==='practice';}
