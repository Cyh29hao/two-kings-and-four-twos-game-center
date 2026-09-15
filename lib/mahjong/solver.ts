import {FAN_TABLE} from './rules.ts';
import {tileType, type Meld} from './engine.ts';

export type Fan = {id: string; name: string; multiplier: string};
export type PlanGroup = {kind: 'sequence'|'triplet'|'pair'|'special'|'kong'; types: number[]; wild: boolean[]; tiles: number[]; incoming: number; exposed?: boolean};
export type WinPlan = {id: string; family: 'standard'|'seven'|'orphans'|'gates'|'fourWild'; groups: PlanGroup[];
  assignments: {tile: number; type: number}[]; fans: Fan[]; multiplier: string; hitTypes: number[]; incomingType: number; middle: boolean};
export type WinContext = {round: string; hand: number[]; melds: Meld[]; wildcard: number; incoming: number;
  winType: 'self'|'discard'|'rob'; flower: boolean; heaven: boolean; earth: boolean;selfDrawUnit?:number;noWildBonus?:boolean;closedBonus?:boolean;fourWildWin?:boolean;disabledWins?:string[];doubleWildIncludesSelfDraw?:boolean};
type Shape = {kind: PlanGroup['kind']; types: number[]; wild: boolean[]};
export const effectiveType = (tile: number, wildcard: number) => tileType(tile) === 33 && wildcard >= 0 ? wildcard : tileType(tile);
export const isWild = (tile: number, wildcard: number) => wildcard >= 0 && tileType(tile) === wildcard;
export const typeName = (t: number) => t < 27 ? `${t % 9 + 1}${['万','筒','条'][Math.floor(t / 9)]}` : ['东','南','西','北','中','发','白'][t - 27];
const order = (s: Shape) => `${s.kind}:${s.types.map(t=>String(t).padStart(2,'0')).join('.')}:${s.wild.map(Number).join('')}`;
const terminal = (t: number) => t < 27 && (t % 9 === 0 || t % 9 === 8);
export const hasFourWild = (ctx:WinContext) => !!ctx.fourWildWin && ctx.winType==='self' && ctx.hand.filter(t=>isWild(t,ctx.wildcard)).length===4;

function score(ctx: WinContext, family: WinPlan['family'], groups: PlanGroup[], natural: number[], wildCount: number) {
  const ids = new Set<string>(), types = groups.flatMap(g=>g.types), pair = groups.find(g=>g.kind === 'pair')?.types[0];
  const triples = groups.filter(g=>g.kind === 'triplet' || g.kind === 'kong').map(g=>g.types[0]);
  const honors = types.some(t=>t >= 27), suits = new Set(types.filter(t=>t < 27).map(t=>Math.floor(t/9)));
  if (family === 'seven') { const luxury = natural.filter(n=>n === 4).length; ids.add(luxury ? `luxury${luxury}` : 'seven'); }
  if (family === 'orphans') ids.add('orphans');
  if (family === 'gates') ids.add('gates');
  if (hasFourWild(ctx)) ids.add('fourWild');
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
  if (ctx.closedBonus !== false && ctx.melds.every(m=>m.concealed)) ids.add('closed');
  // Missing fields retain the multipliers of already-saved choices.
  if (!wildCount && ctx.noWildBonus !== false) ids.add('noWild');
  // Missing field belongs to saved ham-v1 choices; never change an in-flight old plan.
  if (ctx.winType === 'self' && ctx.selfDrawUnit === 2) ids.add('selfDraw');
  if (ctx.flower && ctx.winType === 'self') ids.add('flower');
  if (ctx.winType === 'rob') ids.add('rob');
  // Four-wild loose declarations waive structure; heaven/earth still require one.
  if (ctx.heaven && family !== 'fourWild') ids.add('heaven');
  if (ctx.earth && family !== 'fourWild') ids.add('earth');
  const incomingGroup = groups.find(g=>g.incoming >= 0)!;
  const incomingType = incomingGroup.types[incomingGroup.incoming];
  const middle = incomingGroup.kind === 'sequence' && incomingGroup.incoming === 1 && incomingType % 9 >= 3 && incomingType % 9 <= 7;
  const preWild = wildCount - Number(isWild(ctx.incoming, ctx.wildcard));
  if (family === 'standard' && middle && preWild === 2 && incomingGroup.wild.every((w,i)=>i === incomingGroup.incoming || w)) ids.add('doubleWild');
  // Check structural/composition tags before multiplier exclusions; a banned pure
  // hand cannot bypass the rule by selecting its nine-gates interpretation.
  if(ctx.disabledWins?.some(id=>ids.has(id)||id==='seven'&&family==='seven'))return null;
  // Check strict self-draw bans first, then remove only the overlapping bonus.
  // Missing policy keeps saved rooms and already-announced choices unchanged.
  if (ctx.doubleWildIncludesSelfDraw && ids.has('doubleWild')) ids.delete('selfDraw');
  const exempt = family !== 'standard' || ['fourWild','pong','smallDragons','bigDragons','smallWinds','bigWinds','honors','mixedTerminals','terminals','fourKongs','heaven','earth'].some(id=>ids.has(id));
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
export function visitWinPlans(ctx: WinContext, visit: (plan: WinPlan)=>boolean | void, includeLoose=true) {
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
  if(includeLoose && !stopped && hasFourWild(ctx)){
    const targets:number[]=[];
    function assign(start:number){
      if(stopped)return;
      if(targets.length===4){const p=fourWildPlan(ctx,targets);if(p&&visit(p)===false)stopped=true;return;}
      for(let t=start;t<34&&!stopped;t++)if(full[t]<4){full[t]++;targets.push(t);assign(t);targets.pop();full[t]--;}
    }
    assign(0);
  }
}

/** Called only after validating the context and the target multiset. Interchanging
 * identical loose wildcards cannot change a pattern, payout, prize or winning slot. */
function fourWildPlan(ctx:WinContext,targets:readonly number[]):WinPlan|null {
  const wildTiles=ctx.hand.filter(t=>isWild(t,ctx.wildcard)).sort((a,b)=>a-b);
  const naturals=ctx.hand.filter(t=>!isWild(t,ctx.wildcard)).sort((a,b)=>effectiveType(a,ctx.wildcard)-effectiveType(b,ctx.wildcard)||a-b);
  const group=(tiles:number[],types:number[],wild:boolean[],kind:PlanGroup['kind']='special',exposed=false):PlanGroup=>({kind,tiles,types,wild,incoming:tiles.indexOf(ctx.incoming),exposed});
  const groups=[group(naturals,naturals.map(t=>effectiveType(t,ctx.wildcard)),naturals.map(()=>false)),group(wildTiles,[...targets],[true,true,true,true]),...ctx.melds.map(m=>group([...m.tiles],m.tiles.map(t=>effectiveType(t,ctx.wildcard)),m.tiles.map(()=>false),m.kind==='chi'?'sequence':m.kind==='pong'?'triplet':'kong',true))];
  const scored=score(ctx,'fourWild',groups,[],4);if(!scored)return null;
  return {id:`${ctx.round}|fourWild|${targets.map(t=>String(t).padStart(2,'0')).join('.')}`,family:'fourWild',groups,assignments:wildTiles.map((tile,i)=>({tile,type:targets[i]})),...scored,hitTypes:[...new Set(groups.flatMap(g=>g.types))].sort((a,b)=>a-b)};
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

// Keep only compact metadata for large four-wild result sets. Browsers receive
// twelve full plans, and confirmation regenerates the selected plan on the server.
type PlanIndexEntry={id:string;multiplier:string;fanMask:number;targets:number;loose:boolean};
type PlanIndex={entries:PlanIndexEntry[];fanMask:number;wildTiles:number[]};
const fanDefinitions:Fan[]=[...FAN_TABLE.map(([id,name,m])=>({id,name,multiplier:String(m)})),{id:'ordinary',name:'普通胡',multiplier:'1'}];
const fanBits=new Map(fanDefinitions.map((f,i)=>[f.id,2**i]));
const indexCache=new Map<string,PlanIndex>();
function planIndex(ctx:WinContext):PlanIndex {
  const k=key(ctx),cached=indexCache.get(k);if(cached)return cached;
  const wildTiles=ctx.hand.filter(t=>isWild(t,ctx.wildcard)).sort((a,b)=>a-b),entries:PlanIndexEntry[]=[];let fanMask=0;
  visitWinPlans(ctx,p=>{
    const mask=p.fans.reduce((n,f)=>n|(fanBits.get(f.id)??0),0);fanMask|=mask;
    const targets=p.assignments.reduce((n,a)=>n|(a.type<<(wildTiles.indexOf(a.tile)*6)),0);
    entries.push({id:p.id,multiplier:p.multiplier,fanMask:mask,targets,loose:p.family==='fourWild'});
  });
  entries.sort((a,b)=>BigInt(a.multiplier)>BigInt(b.multiplier)?-1:BigInt(a.multiplier)<BigInt(b.multiplier)?1:a.id<b.id?-1:a.id>b.id?1:0);
  const value={entries,fanMask,wildTiles};
  // At most one large index per isolate; small hands do not accumulate around it.
  if(indexCache.size>=2||entries.length>1500||[...indexCache.values()].some(i=>i.entries.length>1500))indexCache.clear();
  indexCache.set(k,value);return value;
}
function materialize(ctx:WinContext,entry:PlanIndexEntry):WinPlan {
  if(entry.loose)return fourWildPlan(ctx,[0,1,2,3].map(i=>(entry.targets>>>(i*6))&63))!;
  let found:WinPlan|undefined;visitWinPlans(ctx,p=>{if(p.id===entry.id){found=p;return false;}},false);
  if(!found)throw Error('胡牌方案无法恢复');return found;
}
export function findWinPlan(ctx:WinContext,id:string){const entry=planIndex(ctx).entries.find(e=>e.id===id);return entry?materialize(ctx,entry):undefined;}
export function bestWinPlan(ctx:WinContext){const entry=planIndex(ctx).entries[0];return entry?materialize(ctx,entry):undefined;}
export function winPlanPage(ctx:WinContext,q:{page?:number;fan?:string|null;target?:string|null;wild?:string|null;targets?:string|null}={}){
  const index=planIndex(ctx),target=q.target===null||q.target===undefined?null:Number(q.target),wildIndex=q.wild?index.wildTiles.findIndex(t=>String(t)===q.wild):-1;
  const wanted=q.targets?q.targets.split(',').map(Number):[],valid=wanted.length<=index.wildTiles.length&&wanted.every(t=>Number.isInteger(t)&&t>=0&&t<34),counts=new Map<number,number>();wanted.forEach(t=>counts.set(t,(counts.get(t)??0)+1));
  const filtered=!q.fan&&target===null&&!wanted.length?index.entries:index.entries.filter(e=>valid&&(!q.fan||!!(e.fanMask&(fanBits.get(q.fan)??0)))&&(target===null||Number.isInteger(target)&&target>=0&&target<34&&index.wildTiles.some((_,i)=>(!q.wild||i===wildIndex)&&((e.targets>>>(i*6))&63)===target))&&[...counts].every(([t,n])=>index.wildTiles.filter((_,i)=>((e.targets>>>(i*6))&63)===t).length>=n));
  const page=Math.max(0,Math.min(Number.isFinite(q.page)?Math.floor(q.page!):0,Math.max(0,Math.ceil(filtered.length/12)-1)));
  return {total:filtered.length,allTotal:index.entries.length,page,pageSize:12,plans:filtered.slice(page*12,page*12+12).map(e=>materialize(ctx,e)),wildTiles:index.wildTiles,fans:fanDefinitions.filter((_,i)=>!!(index.fanMask&2**i))};
}
