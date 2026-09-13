/** One identity mapping for the table, candidate picker, reports and PNG export. */
export const TILE_ART=[...Array.from({length:9},(_,i)=>`Man${i+1}`),...Array.from({length:9},(_,i)=>`Pin${i+1}`),...Array.from({length:9},(_,i)=>`Sou${i+1}`),'Ton','Nan','Shaa','Pei','Chun','Hatsu','Haku'] as const;
export function tileFaceSrc(type:number){if(!Number.isInteger(type)||type<0||type>=34)throw Error('未知麻将牌种');return `/tiles/${TILE_ART[type]}.svg`;}
