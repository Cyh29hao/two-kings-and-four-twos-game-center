export type ReplayGame = 'landlord' | 'landlord-v3' | 'mahjong' | 'holdem';

export type ReplayFrame = {
  at: number;
  action: string;
  actor?: number;
  scene: {
    game: ReplayGame;
    phase: string;
    turn?: number;
    seats: {
      name: string;
      bot?: boolean;
      hand: number[];
      discards?: number[];
      melds?: {kind: string; cards: number[]}[];
      chips?: string;
      bet?: string;
      folded?: boolean;
    }[];
    board?: number[];
    bottom?: number[];
    last?: number[];
    wallRemaining?: number;
    pot?: string;
    street?: string;
    wildcard?: number;
    dealer?: number;
    winner?: number;
    lastDiscard?: {seat: number; tile: number};
  };
};

export type ReplayState = {
  roundId: string;
  game: ReplayGame;
  nextSeq: number;
  pending: ReplayFrame[];
  complete?: boolean;
};
