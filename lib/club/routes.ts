import type {HistoryGame} from './history.ts';
export const gamePaths:Record<HistoryGame,string>={landlord:'/',mahjong:'/mahjong',holdem:'/holdem'};
export const gameAPIs:Record<HistoryGame,string>={landlord:'/api/game',mahjong:'/api/mahjong',holdem:'/api/holdem'};
export function roomDestination(href:string){if(!href.startsWith('/')||href.startsWith('//'))throw Error('房间链接无效');const u=new URL(href,'https://room.invalid');const game=(Object.keys(gamePaths) as HistoryGame[]).find(k=>gamePaths[k]===u.pathname),code=u.searchParams.get('room');if(!game||!code||!/^\d{6}$/.test(code))throw Error('房间链接无效');return {game,code};}
