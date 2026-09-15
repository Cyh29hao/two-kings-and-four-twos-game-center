/** One navigation at a time: a failed or stalled client transition retains a real URL. */
export class NavigationGuard {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private pending: {id:number;href:string;replace:boolean} | null = null;
  private serial = 0;
  private recover:(href:string,replace:boolean)=>void;
  private delay:number;
  constructor(recover:(href:string,replace:boolean)=>void,delay=8000) {this.recover=recover;this.delay=delay;}
  start(href:string,replace=false) {
    this.cancel();const id=++this.serial;this.pending={id,href,replace};
    this.timer=setTimeout(()=>this.fail(id),this.delay);return id;
  }
  complete(href:string) {if(this.pending?.href===href)this.cancel();}
  fail(id:number) {if(this.pending?.id!==id)return;const p=this.pending;this.cancel();this.recover(p.href,p.replace);}
  cancel() {if(this.timer!==undefined)clearTimeout(this.timer);this.timer=undefined;this.pending=null;}
}
export function internalHref(href:string,origin:string) {
  try {const u=new URL(href,origin);return u.origin===origin&&['http:','https:'].includes(u.protocol)?u.pathname+u.search+u.hash:null;}catch{return null;}
}
export function shouldHandleLink(e:{defaultPrevented:boolean;button:number;metaKey:boolean;ctrlKey:boolean;shiftKey:boolean;altKey:boolean},target?:string,download=false) {
  return !e.defaultPrevented&&e.button===0&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&(!target||target==='_self')&&!download;
}
