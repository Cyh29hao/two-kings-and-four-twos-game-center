"use client";
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ComponentPropsWithRef,type ReactNode} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {NavigationGuard,internalHref,shouldHandleLink} from '@/lib/club/navigation';

type Options={scroll?:boolean};
type Navigator={push:(href:string,options?:Options)=>void;replace:(href:string,options?:Options)=>void};
const Context=createContext<Navigator|null>(null);

export function SiteNavigation({children}:{children:ReactNode}) {
  // Import the public router statically. vinext beta's Link dynamically imports a
  // namespace whose named exports are lost in this project's production chunks.
  const router=useRouter(),pathname=usePathname(),params=useSearchParams();
  const [pending,setPending]=useState<string|null>(null);
  const guard=useRef<NavigationGuard|null>(null);
  if(!guard.current)guard.current=new NavigationGuard((href,replace)=>{
    setPending(null);if(replace)window.location.replace(href);else window.location.assign(href);
  });
  const navigate=useCallback((href:string,replace:boolean,options?:Options)=>{
    const next=internalHref(href,window.location.origin);
    if(next===null)throw Error('只能在站内切换页面');
    if(next===window.location.pathname+window.location.search+window.location.hash){guard.current!.cancel();setPending(null);return;}
    setPending(next);const id=guard.current!.start(next,replace);
    try {if(replace)router.replace(next,options);else router.push(next,options);}catch{guard.current!.fail(id);}
  },[router]);
  const push=useCallback((href:string,options?:Options)=>navigate(href,false,options),[navigate]);
  const replace=useCallback((href:string,options?:Options)=>navigate(href,true,options),[navigate]);
  const search=params.toString();
  useEffect(()=>{
    const current=window.location.pathname+window.location.search+window.location.hash;
    guard.current!.complete(current);setPending(old=>old===current?null:old);
  },[pathname,search]);
  useEffect(()=>{const cancel=()=>{guard.current!.cancel();setPending(null)};window.addEventListener('popstate',cancel);window.addEventListener('pagehide',cancel);return()=>{guard.current!.cancel();window.removeEventListener('popstate',cancel);window.removeEventListener('pagehide',cancel);};},[]);
  return <Context.Provider value={{push,replace}}>{children}{pending&&<div className="site-navigation-progress" role="status"><span>正在打开页面…</span><a href={pending}>直接打开</a></div>}</Context.Provider>;
}
export function useSiteRouter(){const value=useContext(Context);if(!value)throw Error('SiteNavigation is required');return value;}

type LinkProps=Omit<ComponentPropsWithRef<'a'>,'href'> & {href:string;replace?:boolean;scroll?:boolean};
export default function SiteLink({href,replace=false,scroll,onClick,children,...props}:LinkProps) {
  const router=useSiteRouter();
  return <a {...props} href={href} onClick={e=>{
    onClick?.(e);
    if(!shouldHandleLink(e,e.currentTarget.target,e.currentTarget.hasAttribute('download')))return;
    const next=internalHref(href,window.location.origin);if(next===null)return;
    e.preventDefault();if(replace)router.replace(next,{scroll});else router.push(next,{scroll});
  }}>{children}</a>;
}
