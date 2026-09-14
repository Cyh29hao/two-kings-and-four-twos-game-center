/** Session-only view state. Never persisted to disk or shared across accounts. */
export class ClubMemory {
  epoch=0;
  private values=new Map<string,unknown>();
  private listeners=new Map<string,Set<()=>void>>();
  get<T>(key:string,fallback:T):T{return this.values.has(key)?this.values.get(key) as T:fallback;}
  set<T>(key:string,value:T|((old:T)=>T),fallback:T,epoch=this.epoch){
    if(epoch!==this.epoch)return;
    const old=this.get(key,fallback),next=typeof value==='function'?(value as (old:T)=>T)(old):value;
    if(Object.is(old,next))return;this.values.set(key,next);this.listeners.get(key)?.forEach(fn=>fn());
  }
  subscribe(key:string,listener:()=>void){const set=this.listeners.get(key)??new Set();set.add(listener);this.listeners.set(key,set);return()=>{set.delete(listener);if(!set.size)this.listeners.delete(key)};}
  clear(){this.epoch++;this.values.clear();this.listeners.forEach(set=>set.forEach(fn=>fn()));}
}
