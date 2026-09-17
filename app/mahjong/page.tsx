"use client";
import {MahjongActions} from '@/components/mahjong-actions';
import {RoundSummary,TableDetailsTrigger} from '@/components/table-ui';
import {RoomCodeCopy} from '@/components/room-code-copy';
import {TableEffectsProvider} from '@/components/table-effects';
import {useSearchParams} from 'next/navigation';
import {useClub,useClubState,useRoomNavigation,HistoryEntry} from '@/components/club-provider';
import {MahjongCustomRules} from '@/components/mahjong-custom-rules';
import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,ChevronRight,Club,Copy,DoorOpen,History,Info,Layers3,LogOut,Plus,Settings,ShieldCheck,Timer,Trophy,Users,X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogTrigger,DialogDescription} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {RoomChat} from '@/components/room-chat';
import {PlayerChat,useChatBubbles} from '@/components/player-chat';
import {soloPractice} from '@/lib/practice/types';
import {TableSound} from '@/components/table-sound';
import AuthScreen from '@/components/auth-screen';
import {Bot} from 'lucide-react';
import {RoomMode,PracticeBanner} from '@/components/room-mode';
import {MahjongSurface,ExpandMahjong} from '@/components/mahjong-board';
import {MahjongTile} from '@/components/mahjong-tile';
import {MahjongAwards} from '@/components/mahjong-awards';
import {MahjongRules} from '@/components/mahjong-rules';
import {WinPicker} from '@/components/mahjong-win-picker';
import {ReportDialog,RoundDetails} from '@/components/mahjong-report';
import {api} from '@/lib/client';
import {tileLabel} from '@/lib/mahjong/engine';
import type {MahjongView} from '@/lib/mahjong/game';
import {HAM,MODERN_PRESETS,isHamRules} from '@/lib/mahjong/rules';
import {typeName} from '@/lib/mahjong/solver';
import {chips,publicRound} from '@/lib/mahjong/report';

type User={id:string;name:string;username:string;role:string;score:number};
type Room={code:string;title:string;revision:number;serverNow:number;receivedAt:number;game:MahjongView};
type RecordItem={id:string;room_code:string;created:number;result:{practice?:boolean;schemaVersion?:number;winner:number;winType:string;seats:{id:string;name:string;delta:number|string}[]}};
type Lobby={user:User;config:{announcement:string;seconds:number;maintenance:boolean};activeRoom:string|null;activeKind:string|null;records:RecordItem[];tables:{code:string;title:string;updated:number}[]};
function Avatar({name,index=0}:{name:string;index?:number}){return <span className={`avatar avatar-${index%3}`}>{name.slice(0,1).toUpperCase()}</span>}
export default function MahjongPage(){
 const {user,setUser,loaded,lobby,loadLobby}=useClub(),search=useSearchParams();
 const {openRoom,followRoom}=useRoomNavigation();

 const [room,setRoom]=useClubState<Room|null>('mahjong:room',null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[code,setCode]=useClubState('mahjong:code',''),[title,setTitle]=useClubState('mahjong:title','');
 const [createOpen,setCreateOpen]=useState(false),[endAction,setEndAction]=useState<'leave'|'end_table'|'end_practice'|null>(null),[selected,setSelected]=useClubState<number|null>('mahjong:selected',null),[clock,setClock]=useState(Date.now()),[copied,setCopied]=useState(false);
 const [mode,setMode]=useClubState('mahjong:mode','friends');
 const [rulesId,setRulesId]=useClubState('mahjong:rulesId',HAM.id),[initial,setInitial]=useClubState('mahjong:initial','1000'),[base,setBase]=useClubState('mahjong:base','10');
 const [customRules,setCustomRules]=useClubState('mahjong:customRules',{allowChi:true,allowRobAddedKong:true,disabledWins:[] as string[]});
 const {bubbles,onSnapshot}=useChatBubbles(room?.code,user?.id);
 const [effectsConnected,setEffectsConnected]=useState(true);
 const requestPending=useRef(false);
 const roomRef=useRef<Room|null>(null);roomRef.current=room;
 const accept=useCallback((next:Room)=>setRoom(prev=>!prev||prev.code!==next.code||next.revision>=prev.revision?{...next,receivedAt:Date.now()}:prev),[setRoom]);
 const fail=useCallback((e:Error&{status?:number})=>{setError(e.message);if(e.status===401){setUser(null);setRoom(null)}else if(e.status===403){setRoom(null);void loadLobby(true).catch(()=>{})}},[setUser,setRoom,loadLobby]);
 useEffect(()=>{const requested=search.get('room');if(requested&&/^\d{6}$/.test(requested))setCode(requested);},[search,setCode]);
 useEffect(()=>{void loadLobby().catch(e=>setError(e.message));},[loadLobby]);

 useEffect(()=>{if(!room?.code)return;let active=true,pending=false;const current=room.code;const poll=async()=>{if(pending)return;pending=true;try{const d=await api('/api/mahjong?room='+current);if(active&&roomRef.current?.code===current){accept(d);setEffectsConnected(true);setError('')}}catch(e){if(active){setEffectsConnected(false);fail(e as Error)}}finally{pending=false}};void poll();const id=setInterval(poll,1500);return()=>{active=false;clearInterval(id)};},[room?.code,accept,fail]);
 useEffect(()=>{const id=setInterval(()=>setClock(Date.now()),300);return()=>clearInterval(id)},[]);
 useEffect(()=>{window.scrollTo({top:0,behavior:'auto'});},[room?.code]);
 const g=room?.game,seat=g?.seats.findIndex(s=>s.id===user?.id)??-1,me=g?.seats[seat];
 const handKey=[room?.code,g?.round,me?.hand.join(',')].join(':');const [selectionHand,setSelectionHand]=useClubState('mahjong:selectionHand','');
 useEffect(()=>{if(handKey!==selectionHand){setSelected(null);setSelectionHand(handKey)}},[handKey,selectionHand,setSelected,setSelectionHand]);
 useEffect(()=>{if(g?.phase==='finished'||g?.phase==='closed')loadLobby(true).catch(fail)},[g?.phase,loadLobby,fail]);
 async function act(action:string,extra:Record<string,unknown>={}){if(busy||requestPending.current)return;requestPending.current=true;setBusy(true);setError('');try{const r=roomRef.current,d=await api('/api/mahjong',{action,code:r?.code||code,revision:r?.revision,...extra});if(d.redirect){await followRoom(d.redirect);return;}if(d.left){setRoom(null);await loadLobby(true)}else accept(d);if(['create','join','end_table','end_practice'].includes(action)||d.game?.phase==='finished')await loadLobby(true);setCreateOpen(false);setEndAction(null);}catch(e){fail(e as Error);if((e as {status?:number}).status===409&&roomRef.current)api('/api/mahjong?room='+roomRef.current.code).then(accept).catch(fail)}finally{requestPending.current=false;setBusy(false)}}
 async function resume(){if(!lobby?.activeRoom||!lobby.activeKind)return;setBusy(true);try{await openRoom(lobby.activeKind,lobby.activeRoom)}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function copy(){try{await navigator.clipboard.writeText(`${location.origin}/mahjong?room=${room!.code}`);setCopied(true);setTimeout(()=>setCopied(false),2000)}catch{setError('请把房间号 '+room!.code+' 发给朋友')}}
 if(!loaded)return <main className="mj-loading"><span className="brand-icon"><Club size={22}/></span><p>正在打开游戏室…</p></main>;
 if(!user)return <><AuthScreen onAuth={setUser}/>{error&&<div className="floating-error" role="alert">{error}<button onClick={()=>loadLobby(true).catch(()=>{})}>重试</button></div>}</>;
 const offset=room?room.serverNow-room.receivedAt:0,seconds=g?Math.max(0,Math.ceil((g.deadline-clock-offset)/1000)):0;
 const myTurn=g?.phase==='playing'&&!g.pending&&g.turn===seat;
 const forbiddenSelection=myTurn&&selected!==null&&!!g&&'discardable' in g.options&&!g.options.discardable.includes(selected);
 const ownTiles=me?[...me.hand.filter(t=>t!==g?.drawn),...(g?.drawn!==null&&g?.drawn!==undefined&&me.hand.includes(g.drawn)?[g.drawn]:[])]:[];
 const solo=soloPractice(g||{}),botControls=g?.phase==='waiting'&&g.host===user.id&&!solo&&g.session&&!g.session.fixed?{busy,add:()=>{void act('add_bot')},remove:(botId:string)=>{void act('remove_bot',{botId})}}:undefined;
 const status=g?.phase==='waiting'?solo?'陪练已就位':g.seats.length===4?'四人已到齐，准备开局':'等朋友入座':g?.phase==='closed'?'这桌已结束':g?.phase==='finished'?g.winType==='draw'?'本局流局':g.winType==='aborted'?'本局中止':`${g.seats[g.winner]?.name} ${g.winType==='self'?'自摸':g.winType==='rob'?'抢杠胡':'胡牌'}`:g?.phase==='revealing'?`等待 ${g.seats[g.winner]?.name} 翻开奖牌`:g?.phase==='choosing'?`${g.seats[g.winner]?.name} 正在选择胡牌方案`:g?.pending?(g.options.canPass?'轮到你响应这张牌':'等待吃碰杠胡选择'):myTurn?'轮到你出牌':`等待 ${g?.seats[g.turn]?.name} 出牌`;
 const gameRules=g?.rules??HAM,ham=isHamRules(gameRules.id);

 return <TableEffectsProvider room={room} userId={user.id} connected={effectsConnected}><div className="app-shell mj-shell"><div className="club-game-tools"><TableSound room={room} userId={user.id} seconds={seconds}/>{!room&&<MahjongRules rulesId={gameRules.id} snapshot={gameRules}/>}</div>
 {error&&<div className="connection-error" role="alert">{error}<button aria-label="关闭提示" onClick={()=>setError('')}><X size={17}/></button></div>}
 {!room||!g||!me?<main className="mj-lobby"><section className="mj-lobby-main"><div className="lobby-heading"><div className="section-tag">再 聚 一 桌</div><h1>四个人，刚刚好。</h1><p>开一桌，按自己的规矩玩。</p></div>{lobby?.config.announcement&&<div className="announcement"><Info size={17}/><span>{lobby.config.announcement}</span></div>}
 <section className="mj-welcome"><div className="mj-welcome-top"><span className="mj-badge">ham 规 · 已就位</span><span>02 / MAHJONG</span></div><div className="mj-welcome-body"><div><h2>麻将</h2><p>赖子怎么用，这一手你说了算。</p><div className="mj-summary"><span><Users size={16}/>四人好友房</span><span>136 张 · 无花牌</span></div>{lobby?.activeRoom?<Button className="mj-start" onClick={resume} disabled={busy}>{lobby.activeKind==='mahjong'?'回到麻将桌':lobby.activeKind==='holdem'?'回到德州扑克桌':'回到斗地主房间'}<ArrowRight size={18}/></Button>:<Dialog open={createOpen} onOpenChange={setCreateOpen}><div className="create-actions"><DialogTrigger asChild><Button className="mj-start" disabled={!lobby||lobby.config.maintenance} onClick={()=>setMode('friends')}><Plus size={19}/>开一桌麻将</Button></DialogTrigger><Button className="practice-start" variant="outline" disabled={!lobby||lobby.config.maintenance} onClick={()=>{setMode('practice');setCreateOpen(true)}}><Bot size={18}/>人机测试</Button></div><DialogContent className="ham-create-modal"><DialogHeader><DialogTitle>开一桌麻将</DialogTitle><DialogDescription>{mode==='practice'?'三位进阶陪练自动入座，支持 ham 规和基础试玩。':'四人准备后发牌。这桌的规则和筹码从建房时确定。'}</DialogDescription></DialogHeader><form className="stack-form" onSubmit={e=>{e.preventDefault();act('create',{title,mode,rulesId,initialChips:initial,baseChips:base,customRules:{...customRules,disabledWins:rulesId===HAM.id?customRules.disabledWins:[]}})}}><RoomMode mode={mode} onChange={setMode} bots={3}/><MahjongCustomRules ham={rulesId===HAM.id} value={customRules} onChange={setCustomRules}/><label htmlFor="mj-title">房间名称</label><Input id="mj-title" maxLength={24} value={title} onChange={e=>setTitle(e.target.value)} placeholder={`${user.name} 的麻将桌`}/><label htmlFor="mj-rule">麻将规则</label><Select value={rulesId} onValueChange={setRulesId}><SelectTrigger id="mj-rule"><SelectValue/></SelectTrigger><SelectContent>{MODERN_PRESETS.map(r=><SelectItem value={r.id} key={r.id}>{r.name}</SelectItem>)}</SelectContent></Select><div className="ham-create-chips"><label htmlFor="mj-initial">每人初始筹码<Input id="mj-initial" inputMode="numeric" pattern="[1-9][0-9]*" maxLength={30} value={initial} onChange={e=>setInitial(e.target.value.replace(/\D/g,''))} required/></label><label htmlFor="mj-base">基础筹码 / 局<Input id="mj-base" inputMode="numeric" pattern="[1-9][0-9]*" maxLength={30} value={base} onChange={e=>setBase(e.target.value.replace(/\D/g,''))} required/></label></div><div className="mj-room-rules"><b>{rulesId===HAM.id?'ham 规 · 随机赖子 · 白板替代':'基础试玩 · 四组牌加一对将'}</b><p>{rulesId===HAM.id?'自摸 2 倍，点炮 1 倍；门前清、无赖子不加倍，赖子不能打出，四赖可胡（4 倍，可叠加）。胡牌自主选赖子方案，先翻奖牌加分再乘倍数。明杠 1 单位、暗杠 2 单位，保留末 12 张。':'不换三张、不定缺，可吃碰杠。没有赖子、特殊倍数和奖牌，牌墙摸完流局。'}<br/>出牌 {lobby?.config.seconds||30} 秒 · 响应 8 秒{rulesId===HAM.id?' · 选方案 60 秒':''}</p></div><Button type="submit" disabled={busy}>{busy?'正在开桌…':'创建房间'}<ArrowRight size={17}/></Button></form></DialogContent></Dialog>}</div><div className="mj-intro-tiles" aria-label="万筒条与赖子"><MahjongTile tile={16}/><MahjongTile tile={52} wildcard={13}/><MahjongTile tile={88}/><MahjongTile tile={132} wildcard={13}/></div></div><div className="mj-welcome-footer"><span>吃 · 碰 · 杠 · 胡</span><span>独立筹码 · 完整战报</span></div></section>
 <section className="join-box"><div><h3>朋友已经开桌了？</h3><p>输入房间号，留个位置给自己。</p></div><form onSubmit={e=>{e.preventDefault();act('join')}}><Input aria-label="6 位麻将房间号" placeholder="6 位房间号" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} required/><Button type="submit" disabled={busy||code.length!==6}>入座<ChevronRight size={17}/></Button></form></section>
 <div className="mj-rule-strip"><div><Layers3 size={20}/><b>赖子，自主决定</b><span>完整方案与倍数一目了然</span></div><div><Timer size={20}/><b>有响应，才等待</b><span>掉线后可回到原桌</span></div><div><Trophy size={20}/><b>好牌值得留念</b><span>结算战报一键保存</span></div></div>
 </section><aside className="mj-lobby-aside"><div className="profile-card"><Avatar name={user.name}/><h3>{user.name}</h3><span>每桌筹码独立结算</span><div className="profile-score"><span>历史账号积分</span><strong>{chips(user.score,true)}</strong></div></div><HistoryEntry game="mahjong"/><p className="aside-note"><ShieldCheck size={15}/>独立账号 · 分享由你主动生成</p></aside></main>:
 <main className="mj-room table-light"><div className="room-toolbar"><div><Button variant="ghost" size="icon" aria-label="返回麻将大厅" onClick={()=>{setRoom(null);loadLobby(true).catch(fail)}}><ArrowLeft size={20}/></Button><div><h2>{room.title}</h2><span>房间 {room.code}<RoomCodeCopy code={room.code} compact/> · {g.rules.name}{g.session?' · 基础 '+chips(g.session.baseChips)+' 筹码':''}</span></div></div>{g.phase!=='closed'&&(solo?<Button variant="outline" onClick={()=>setEndAction('end_practice')}><DoorOpen size={16}/>结束测试</Button>:<Button variant="outline" onClick={copy}>{copied?<Check size={16}/>:<Copy size={16}/>}<span>{copied?'已复制':'邀请朋友'}</span></Button>)}</div>
 <div className="mj-table-layout"><section className="mj-board" aria-label="四人麻将牌桌"><MahjongSurface bubbles={bubbles} g={g} seat={seat} seconds={seconds} botControls={botControls}>
 {g.phase==='waiting'?<div className="mj-waiting"><div className="mj-wait-icon"><Layers3 size={29}/></div><span className="section-tag">四 人 一 桌</span><h2>{status}</h2><div className="mj-room-code-controls"><div className="mj-room-code">{room.code}</div><RoomCodeCopy code={room.code}/></div></div>:g.phase==='closed'?<div className="mj-waiting"><Trophy size={33}/><h2>这桌已结束</h2><p>{g.session?'所有已完成的收支都保存在整桌战报中。':'未完成的本局不计分。'}</p>{g.session&&<ReportDialog code={room.code}/>}<Button variant="ghost" onClick={()=>{setRoom(null);loadLobby(true).catch(fail)}}>返回大厅</Button></div>:g.phase==='finished'?<RoundSummary title={status} delta={chips(g.deltas[seat],true)}/>:g.phase==='revealing'?<div className="ham-choosing-stage"><h2>{g.seats[g.winner].name} 正在翻奖牌</h2></div>:g.phase==='choosing'?<div className="ham-choosing-stage"><h2>{g.seats[g.winner].name} 胡牌</h2>{!g.canChoose&&<p>正在选择胡牌方案</p>}<div className="ham-sealed-awards"><MahjongTile hidden/><MahjongTile hidden/></div>{g.canChoose&&<WinPicker key={g.round} code={room.code} round={g.round} seconds={seconds} busy={busy} onConfirm={id=>act('confirm_win',{candidateId:id})}/>}</div>:null}
 </MahjongSurface>
 <div className={`mj-self ${myTurn?'is-my-turn':''}`}><div className="mj-self-top"><div><PlayerChat bubble={bubbles[me.id]} align="start"><Avatar name={me.name}/></PlayerChat><strong>{me.name}</strong><span>你{g.dealer===seat&&g.roundNumber>0?' · 庄家':''}</span></div><div className="table-self-tools"><span className="ham-own-balance">{me.balance!==null?chips(me.balance):''}</span><RoomChat compact key={room.code} userId={user.id} code={room.code} onSnapshot={onSnapshot} closed={g.phase==='closed'}/></div></div>
 <div className="mj-actions">{['waiting','finished'].includes(g.phase)?<div className="table-action-row"><Button disabled={busy} onClick={()=>act('ready')}>{me.ready?'取消准备':g.phase==='finished'?'准备下一局':'准备好了'}</Button><span className="table-muted">{g.seats.filter(s=>s.ready).length}/4 已准备</span></div>:g.phase==='playing'?<MahjongActions key={room.code+g.round} game={g} selected={selected} forbidden={forbiddenSelection} busy={busy} connected={effectsConnected} seconds={seconds} onAction={act}/>:null}</div>
 {ownTiles.length>0&&<div className="mj-hand" aria-label="你的手牌">{ownTiles.map(t=><MahjongTile tile={t} key={t} selected={selected===t} drawn={g.drawn===t} wildcard={g.wildcard} onClick={g.phase==='playing'?()=>setSelected(selected===t?null:t):undefined}/>)}</div>}
 </div></section></div><div className="mj-table-tools"><MahjongAwards key={g.round} g={g} seconds={seconds} busy={busy} serverNow={room.serverNow} onFlip={awardIndex=>act('flip_award',{awardIndex})}/><ExpandMahjong bubbles={bubbles} g={g} seat={seat} seconds={seconds}/><Dialog><DialogTrigger asChild><TableDetailsTrigger/></DialogTrigger><DialogContent className="mj-details-modal"><DialogHeader><DialogTitle>牌桌详情</DialogTitle><DialogDescription>本桌规则、筹码收支与公开操作记录。</DialogDescription></DialogHeader><div className="mj-details-content"><section className="mj-side-card"><div className="section-tag">这 一 桌</div><h3>{g.rules.name}</h3><p>136 张 · 无花牌<br/>不换三张 · 不定缺</p><div className="mj-rule-facts">{g.session?<><span>初始筹码<b>{chips(g.session.initialChips)} / 人</b></span><span>基础筹码<b>{chips(g.session.baseChips)} / 局</b></span><span>胡牌付款<b>自摸三家 · 点炮一家</b></span><span>响应时间<b>8 秒</b></span>{ham&&<><span>流局保留<b>12 张</b></span><span>庄家规则<b>庄赢或流局连庄</b></span>{g.wildcard>=0&&<span>赖子 / 白板代牌<b>{typeName(g.wildcard)}</b></span>}</>}</>:<span>胡牌基础分<b>1 分</b></span>}<span>出牌时限<b>{g.seconds} 秒</b></span></div><MahjongRules rulesId={g.rules.id} name={g.rules.name} snapshot={g.rules}/></section>
 {g.entries.length>0&&<section className="mj-side-card ham-live-ledger"><h3>本局筹码流水</h3>{g.entries.map(e=><p key={e.id}>{e.description}</p>)}</section>}
 {g.result&&<section className="mj-side-card ham-current-result"><h3>本局计算</h3><RoundDetails round={publicRound(g.result)}/></section>}
 <section className="mj-side-card mj-log"><h3><History size={16}/>牌桌动态</h3>{g.log.length?<div>{g.log.slice(-15).reverse().map((l,i)=><p key={i}>{l.text}</p>)}</div>:<p>牌局开始后，公开动作会记录在这里。</p>}</section>

 </div></DialogContent></Dialog></div><div className="ham-room-footer">{solo&&g.phase!=='closed'?<Button variant="ghost" onClick={()=>setEndAction('end_practice')}><DoorOpen size={16}/>结束测试</Button>:g.session&&g.host===user.id&&['waiting','finished'].includes(g.phase)?<Button variant="ghost" onClick={()=>setEndAction('end_table')}><DoorOpen size={16}/>结束整桌</Button>:(!g.session||!g.session.fixed)&&g.phase!=='closed'?<Button variant="ghost" onClick={()=>setEndAction('leave')}><DoorOpen size={16}/>离开房间</Button>:null}</div></main>}
 <AlertDialog open={!!endAction} onOpenChange={v=>!v&&setEndAction(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{endAction==='end_practice'?'结束人机测试？':endAction==='end_table'?'结束这一桌？':'离开房间？'}</AlertDialogTitle><AlertDialogDescription>{endAction==='end_practice'?'未完成的本局记为中止，并撤销本局杠分。已完成的筹码收支和战报保留。':endAction==='end_table'?'结余筹码与每局收支将保存为整桌战报。结束后，四位玩家可以各自开新桌。':'离座后需要重新加入房间。对局进行中只能暂时返回大厅，座位会保留。'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={()=>endAction&&act(endAction)}>{endAction==='end_practice'?'结束测试':endAction==='end_table'?'结束并生成战报':'确认离开'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
 </div></TableEffectsProvider>;
}
