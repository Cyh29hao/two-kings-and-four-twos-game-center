export type HitRegion={id:number;left:number;right:number;top:number;bottom:number};
/** Test the entire travelled segment, including cards crossed between pointer events. */
export function crossedCards(rects:HitRegion[],from:{x:number;y:number},to:{x:number;y:number}){
 const dx=to.x-from.x,dy=to.y-from.y,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/3)),ids=new Set<number>();
 for(let i=1;i<=steps;i++){const x=from.x+dx*i/steps,y=from.y+dy*i/steps;const hit=rects.find(r=>x>=r.left&&x<r.right&&y>=r.top&&y<=r.bottom);if(hit)ids.add(hit.id);}
 return [...ids];
}
export function brushSelection(selected:number[],crossed:number[],select:boolean,visited:Set<number>){
 let next=[...selected];for(const id of crossed){if(visited.has(id))continue;visited.add(id);next=select?next.includes(id)?next:[...next,id]:next.filter(c=>c!==id);}return next;
}
