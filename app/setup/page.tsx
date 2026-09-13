"use client";
import {useEffect,useState} from 'react';
import AuthScreen from '@/components/auth-screen';
export default function Setup(){const[token,setToken]=useState('');useEffect(()=>{setToken(new URLSearchParams(location.hash.slice(1)).get('key')||'');history.replaceState(null,'','/setup')},[]);return <AuthScreen setup token={token} onAuth={()=>location.href='/admin'}/>}
