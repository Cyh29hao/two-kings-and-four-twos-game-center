"use client";
import {useEffect,useState} from 'react';
export function useHoldemTimeoutChoice(key:string,enabled:boolean,payload:string,onSync:(payload:Record<string,unknown>)=>Promise<boolean>){
 const [saved,setSaved]=useState<{key:string;ok:boolean}|null>(null);
 useEffect(()=>{
  if(!enabled)return;
  let active=true;
  void onSync(JSON.parse(payload)).then(ok=>{if(active)setSaved({key,ok})});
  return()=>{active=false};
 },[key,enabled,payload,onSync]);
 return !enabled?'idle':saved?.key!==key?'saving':saved.ok?'saved':'failed';
}
