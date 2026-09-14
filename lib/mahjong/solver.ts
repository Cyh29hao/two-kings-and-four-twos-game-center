import {FAN_TABLE} from './rules.ts';
import {tileType, type Meld} from './engine.ts';

export type Fan = {id: string; name: string; multiplier: string};
export type PlanGroup = {kind: 'sequence'|'triplet'|'pair'|'special'|'kong'; types: number[]; wild: boolean[]; tiles: number[]; incoming: number; exposed?: boolean};
export type WinPlan = {id: string; family: 'standard'|'seven'|'orphans'|'gates'; groups: PlanGroup[];
  assignments: {tile: number; type: number}[]; fans: Fan[]; multiplier: string; hitTypes: number[]; incomingType: number; middle: boolean};
export type WinContext = {round: string; hand: number[]; melds: Meld[]; wildcard: number; incoming: number;
  winType: 'self'|'discard'|'rob'; flower: boolean; heaven: boolean; earth: boolean;selfDrawUnit?:number;noWildBonus?:boolean};
type Shape = {kind: PlanGroup['kind']; types: number[]; wild: boolean[]};
export const effectiveType = (tile: number, wildcard: number) => tileType(tile) === 33 && wildcard >= 0 ? wildcard : tileType(tile);
export const isWild = (tile: number, wildcard: number) => wildcard >= 0 && tileType(tile) === wildcard;
export const typeName = (t: number) => t < 27 ? `${t % 9 + 1}${['万','筒','条'][Math.floor(t / 9)]}` : ['东','南','西','北','中','发','白'][t - 27];
const order = (s: Shape) => `${s.kind}:${s.types.map(t=>String(t).padStart(2,'0')).join('.')}:${s.wild.map(Number).join('')}`;
const terminal = (t: number) => t < 27 && (t % 9 === 0 || t % 9 === 8);

function score(ctx: WinContext, family: WinPlan['family'], groups: PlanGroup[], natural: number[], wildCount: number) {
  const ids = new Set<string>(), types = groups.flatMap(g=>g.types), pair = groups.find(g=>g.kind === 'pair')?.types[0];
  const triples = groups.filter(g=>g.kind === 'triplet' || g.kind === 'kong').map(g=>g.types[0]);
  const honors = types.some(t=>t >= 27), suits = new Set(types.filter(t=>t < 27).map(t=>Math.floor(t/9)));
  if (family === 'seven') { const luxury = natural.filter(n=>n === 4).length; ids.add(luxury ? `luxury${luxury}` : 'seven'); }
  if (family === 'orphans') ids.add('orphans');
  if (family === 'gates') ids.add('gates');
  if (family === 'standard' && triples.length === 4) ids.add('pong');
  if (suits.size === 1) ids.add(honors ? 'mixed' : 'pure');
  if (!suits.size) ids.add('honors');
  if (types.every(t=>terminal(t) || t >= 27) && suits.size) ids.add(honors ? 'mixedTerminals' : 'terminals');
  if (family === 'standard') {
    const dragons = triples.filter(t=>t >= 31).length, winds = triples.filter(t=>t >= 27 && t <= 30).length;
    if (dragons === 3) ids.add('bigDragons'); else if (dragons === 2 && pair !== undefined && pair >= 31) ids.add('smallDragons');
    if (winds === 4) ids.add('bigWinds'); else if (winds === 3 && pair !== undefined && pair >= 27 && pair <= 30) ids.add('smallWinds');
  }
  if (ctx.melds.filter(m=>m.kind === 'kong').length === 4) ids.add('fourKongs');
  if (ctx.melds.every(m=>m.concealed)) ids.add('closed');
  // Missing fields retain the multipliers of already-saved choices.
  if (!wildCount && ctx.noWildBonus !== false) ids.add('noWild');
  // Missing field belongs to saved ham-v1 choices; never change an in-flight old plan.
  if (ctx.winType === 'self' && ctx.selfDrawUnit === 2) ids.add('selfDraw');
  if (ctx.flower && ctx.winType === 'self') ids.add('flower');
  if (ctx.winType === 'rob') ids.add('rob');
  if (ctx.heaven) ids.add('heaven');
  if (ctx.earth) ids.add('earth');
  const incomingGroup = groups.find(g=>g.incoming >= 0)!;
  const incomingType = incomingGroup.types[incomingGroup.incoming];
  const middle = incomingGroup.kind === 'sequence' && incomingGroup.incoming === 1 && incomingType % 9 >= 3 && incomingType % 9 <= 7;
  const preWild = wildCount - Number(isWild(ctx.incoming, ctx.wildcard));
  if (family === 'standard' && middle && preWild === 2 && incomingGroup.wild.every((w,i)=>i === incomingGroup.incoming || w)) ids.add('doubleWild');
  const exempt = family !== 'standard' || ['pong','smallDragons','bigDragons','smallWinds','bigWinds','honors','mixedTerminals','terminals','fourKongs','heaven','earth'].some(id=>ids.has(id));
  if (!middle && !exempt) return null;
  if (family !== 'standard' || ctx.heaven || ctx.earth) ids.delete('closed');
  if (family === 'gates') ids.delete('pure');
  if (family === 'orphans') ids.delete('mixedTerminals');
  if (['bigWinds','fourKongs','honors','mixedTerminals','terminals'].some(id=>ids.has(id))) ids.delete('pong');
  const fans: Fan[] = FAN_TABLE.filter(([id])=>ids.has(id)).map(([id,name,n])=>({id,name,multiplier:String(n)}));
  if (!fans.length) fans.push({id:'ordinary',name:'普通胡',multiplier:'1'});
  return {fans,multiplier:fans.reduce((n,f)=>n * BigInt(f.multiplier),1n).toString(),incomingType,middle};
}

/** Enumerates shapes first, then the distinguished incoming tile. No hidden wall is an input. */
export function visitWinPlans(ctx: WinContext, visit: (plan: WinPlan)=>boolean | void) {
  if (ctx.hand.length !== 14 - 3 * ctx.melds.length || !ctx.hand.includes(ctx.incoming)) return;
  const physical = [...ctx.hand,...ctx.melds.flatMap(m=>m.tiles)];
  if (new Set(physical).size !== physical.length || physical.some(t=>!Number.isInteger(t) || t < 0 || t >= 136)) return;
  const wildTiles = ctx.hand.filter(t=>isWild(t,ctx.wildcard)).sort((a,b)=>a-b);
  const natural = Array<number>(34).fill(0), full = Array<number>(34).fill(0);
  for (const t of ctx.hand) if (!isWild(t,ctx.wildcard)) natural[effectiveType(t,ctx.wildcard)]++;
  natural.forEach((n,i)=>full[i]=n);
  const fixed: PlanGroup[] = ctx.melds.map(m=>{const tiles=[...m.tiles].sort((a,b)=>effectiveType(a,ctx.wildcard)-effectiveType(b,ctx.wildcard)||a-b);return {kind:m.kind === 'chi'?'sequence':m.kind === 'pong'?'triplet':'kong',types:tiles.map(t=>effectiveType(t,ctx.wildcard)),wild:tiles.map(()=>false),tiles,incoming:-1,exposed:true};});
  for (const g of fixed) for (const t of g.types) full[t]++;
  if (full.some(n=>n > 4) || ctx.melds.some(m=>m.tiles.some(t=>isWild(t,ctx.wildcard)))) return;
  const left = [...natural], usedWild = Array<number>(34).fill(0), shapes: Shape[] = [], seen = new Set<string>();
  let stopped = false;
  function emit(family: WinPlan['family']) {
    const sorted = [...shapes].sort((a,b)=>order(a).localeCompare(order(b)));
    const baseKey = `${family}|${sorted.map(order).join('/')}`;
    if (seen.has(baseKey)) return; seen.add(baseKey);
    for (let gi=0;gi<sorted.length && !stopped;gi++) for (let si=0;si<sorted[gi].types.length && !stopped;si++) {
      const s = sorted[gi], incomingWild = isWild(ctx.incoming,ctx.wildcard);
      if (s.wild[si] !== incomingWild || (!incomingWild && s.types[si] !== effectiveType(ctx.incoming,ctx.wildcard))) continue;
      // Equal positions in pairs/triplets are the same interpretation.
      if (si > 0 && s.kind !== 'sequence' && s.types[si] === s.types[si-1] && s.wild[si] === s.wild[si-1]) continue;
      const pools = Array.from({length:34},()=>[] as number[]), wp = wildTiles.filter(t=>t !== ctx.incoming);
      for (const tile of [...ctx.hand].sort((a,b)=>a-b)) if (tile !== ctx.incoming && !isWild(tile,ctx.wildcard)) pools[effectiveType(tile,ctx.wildcard)].push(tile);
      const groups: PlanGroup[] = sorted.map((shape,g)=>({...shape,types:[...shape.types],wild:[...shape.wild],incoming:g === gi?si:-1,
        tiles:shape.types.map((t,i)=>g === gi && i === si ? ctx.incoming : shape.wild[i]?wp.shift()!:pools[t].shift()!)}));
      groups.push(...fixed);
      const scored = score(ctx,family,groups,natural,wildTiles.length); if (!scored) continue;
      const assignments = groups.flatMap(g=>g.types.flatMap((type,i)=>g.wild[i]?[{tile:g.tiles[i],type}]:[])).sort((a,b)=>a.tile-b.tile);
      const plan: WinPlan = {id:`${ctx.round}|${baseKey}|${gi}.${si}`,family,groups,assignments,...scored,hitTypes:[...new Set(groups.flatMap(g=>g.types))].sort((a,b)=>a-b)};
      if (visit(plan) === false) stopped = true;
    }
  }
  function use(kind: Shape['kind'], types: number[], anchor: number, wildLeft: number, next:(remaining:number)=>void) {
    const mask: boolean[] = [];
    function assign(i:number,w:number,anchored:boolean) {
      if (stopped) return;
      if (i === types.length) {
        if (anchor >= 0 && !anchored) return;
        shapes.push({kind,types:[...types],wild:[...mask]});next(w);shapes.pop();return;
      }
      const t=types[i];
      // Identical slots use naturals before wilds to remove interchangeable permutations.
      const previousWild = i > 0 && types[i-1] === t && mask[i-1];
      if (left[t] && !previousWild) {left[t]--;mask.push(false);assign(i+1,w,anchored || t === anchor);mask.pop();left[t]++;}
      if (w && full[t]+usedWild[t] < 4) {usedWild[t]++;mask.push(true);assign(i+1,w-1,anchored);mask.pop();usedWild[t]--;}
    }
    assign(0,wildLeft,false);
  }
  function standard(melds:number,pair:boolean,w:number) {
    if (stopped) return;
    const t=left.findIndex(n=>n > 0);
    if (melds === 0 && !pair) {if (t < 0 && !w) emit('standard');return;}
    if (t < 0) {
      if (pair) for (let v=0;v<34&&!stopped;v++) use('pair',[v,v],-1,w,n=>standard(melds,false,n));
      else if (melds) for (let v=0;v<34&&!stopped;v++) {
        use('triplet',[v,v,v],-1,w,n=>standard(melds-1,false,n));
        if(v<27&&v%9<=6)use('sequence',[v,v+1,v+2],-1,w,n=>standard(melds-1,false,n));
      }
      return;
    }
    if (pair) use('pair',[t,t],t,w,n=>standard(melds,false,n));
    if (melds) {
      use('triplet',[t,t,t],t,w,n=>standard(melds-1,pair,n));
      if (t<27) for(let start=Math.max(t-t%9,t-2);start<=t && start%9<=6;start++) use('sequence',[start,start+1,start+2],t,w,n=>standard(melds-1,pair,n));
    }
  }
  function seven(pairs:number,w:number) {
    if(stopped)return; const t=left.findIndex(n=>n>0);
    if(!pairs){if(t<0&&!w)emit('seven');return;}
    if(t>=0)use('pair',[t,t],t,w,n=>seven(pairs-1,n));
    else for(let v=0;v<34&&!stopped;v++)use('pair',[v,v],-1,w,n=>seven(pairs-1,n));
  }
  function special(family:'orphans'|'gates',target:number[]) {
    if(stopped || natural.some((n,i)=>n>target[i]))return;
    const types:number[]=[], wild:boolean[]=[];
    for(let t=0;t<34;t++)for(let i=0;i<target[t];i++){types.push(t);wild.push(i>=natural[t]);}
    if(wild.filter(Boolean).length!==wildTiles.length)return;
    shapes.push({kind:'special',types,wild});emit(family);shapes.pop();
  }
  standard(4-ctx.melds.length,true,wildTiles.length);
  if(!ctx.melds.length && !stopped) {
    seven(7,wildTiles.length);
    const orphans=[0,8,9,17,18,26,27,28,29,30,31,32,33];
    for(const duplicate of orphans){const target=Array<number>(34).fill(0);for(const t of orphans)target[t]++;target[duplicate]++;special('orphans',target);}
    for(let suit=0;suit<3;suit++)for(let extra=0;extra<9;extra++){const target=Array<number>(34).fill(0);[3,1,1,1,1,1,1,1,3].forEach((n,i)=>target[suit*9+i]=n);target[suit*9+extra]++;special('gates',target);}
  }
}

const cache = new Map<string,WinPlan[]>();
function key(ctx:WinContext){return JSON.stringify(ctx);}
export function winPlans(ctx:WinContext) {
  const k=key(ctx), cached=cache.get(k);if(cached)return cached;
  const plans:WinPlan[]=[];visitWinPlans(ctx,p=>{plans.push(p);});
  plans.sort((a,b)=>BigInt(a.multiplier)>BigInt(b.multiplier)?-1:BigInt(a.multiplier)<BigInt(b.multiplier)?1:a.id<b.id?-1:a.id>b.id?1:0);
  // Keep isolate memory bounded. Large result sets are complete, but not retained in cache.
  if(plans.length<=1500){if(cache.size>=6)cache.delete(cache.keys().next().value!);cache.set(k,plans);}
  return plans;
}
const possibleCache = new Map<string,boolean>();
export function canWin(ctx:WinContext){const k=key(ctx);if(possibleCache.has(k))return possibleCache.get(k)!;let found=false;visitWinPlans(ctx,()=>{found=true;return false;});if(possibleCache.size>=128)possibleCache.delete(possibleCache.keys().next().value!);possibleCache.set(k,found);return found;}
