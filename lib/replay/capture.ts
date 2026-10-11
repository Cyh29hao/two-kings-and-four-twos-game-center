import type {ReplayFrame, ReplayGame, ReplayState} from './types.ts';

type Seat = {
  name: string; bot?: boolean; hand: number[]; river?: number[];
  melds?: {kind: string; tiles: number[]}[];
  balance?: string; stack?: string; bet?: string; total?: string; folded?: boolean;
};
type CaptureGame = {
  kind?: string; phase: string; round: string; turn?: number; seats: Seat[];
  bottom?: number[]; last?: {cards: number[]}|null; wall?: number[];
  board?: number[]; street?: string; replay?: ReplayState;
  wildcard?: number; dealer?: number; winner?: number;
  lastDiscard?: {seat: number; tile: number}|null;
};

function gameKind(g: CaptureGame): ReplayGame {
  if(g.kind==='landlord-v3')return 'landlord-v3';
  if(g.kind==='mahjong')return 'mahjong';
  if(g.kind==='holdem')return 'holdem';
  return 'landlord';
}

export function replayScene(g: CaptureGame): ReplayFrame['scene'] {
  const kind=gameKind(g);
  return {
    game:kind,phase:g.phase,
    ...(g.turn===undefined?{}:{turn:g.turn}),
    seats:g.seats.map(s=>({
      name:s.name,...(s.bot?{bot:true}:{}),hand:[...s.hand],
      ...(s.river?{discards:[...s.river]}:{}),
      ...(s.melds?{melds:s.melds.map(m=>({kind:m.kind,cards:[...m.tiles]}))}:{}),
      ...(s.balance!==undefined||s.stack!==undefined?{chips:s.balance??s.stack}:{}),
      ...(s.bet!==undefined?{bet:s.bet}:{}),
      ...(s.folded!==undefined?{folded:s.folded}:{})
    })),
    ...(g.board?{board:[...g.board]}:{}),
    ...(g.bottom?{bottom:[...g.bottom]}:{}),
    ...(g.last?.cards?{last:[...g.last.cards]}:{}),
    ...(g.wall?{wallRemaining:g.wall.length}:{}),
    ...(kind==='holdem'?{pot:g.seats.reduce((sum,s)=>sum+BigInt(s.total??'0'),0n).toString()}:{}),
    ...(g.street?{street:g.street}:{})
    ,...(g.wildcard!==undefined?{wildcard:g.wildcard}:{})
    ,...(g.dealer!==undefined?{dealer:g.dealer}:{})
    ,...(g.winner!==undefined?{winner:g.winner}:{})
    ,...(g.lastDiscard?{lastDiscard:{...g.lastDiscard}}:{})
  };
}

/** Capture a server-side scene; never expose the raw room state through a replay API. */
export function captureReplay(g: CaptureGame, action: string, actor?: number, at=Date.now()): void {
  if(!g.round)return;
  const kind=gameKind(g);
  if(!g.replay||g.replay.roundId!==g.round)
    g.replay={roundId:g.round,game:kind,nextSeq:0,pending:[]};
  if(g.replay.complete)return;
  g.replay.pending.push({at,action,...(actor===undefined?{}:{actor}),scene:replayScene(g)});
  g.replay.nextSeq++;
}

/** Mark the current round complete, adding its terminal state only if it changed. */
export function finishReplay(g: CaptureGame, at=Date.now()): void {
  if(!g.round)return;
  if(!g.replay||g.replay.roundId!==g.round)captureReplay(g,'结算',undefined,at);
  else {
    const latest=g.replay.pending.at(-1);
    if(!latest||JSON.stringify(latest.scene)!==JSON.stringify(replayScene(g)))
      captureReplay(g,'结算',undefined,at);
  }
  if(g.replay)g.replay.complete=true;
}
