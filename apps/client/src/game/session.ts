import {
  type BotLevel,
  buildWorld,
  MAPS,
  type MapDef,
  type MapTowerDef,
  type MatchResult,
  type PlayerId,
  seatOrder,
  withSeatOrder,
} from '@ot/sim';
import type { RemoteMatch } from '../net/remoteMatch';
import type { Settings } from './settings';

export const PLAYER_NAMES = ['Bạn', 'Bot An', 'Bot Bình', 'Bot Chi'] as const;
export const DEFAULT_BOTS: (BotLevel | null)[] = ['easy', 'normal', 'easy'];

/** Keep the map, human highlight and downloadable report on the same seeded layout. */
export function matchLayout(seed: number, controlled = false, playerSeat: PlayerId = 0) {
  const order: PlayerId[] = controlled ? [0, 1, 2, 3] : seatOrder(seed);
  const world = buildWorld(withSeatOrder(MAPS['office-01'] as MapDef, order));
  const startRoom = (world.map.towers.find((tower) => tower.seat === playerSeat) ?? world.map.towers[0]) as MapTowerDef;
  return { world, startRoom, order };
}

export interface MatchReport {
  seed: number;
  seatOrder: PlayerId[];
  startRoom: number;
  bots: (BotLevel | null)[];
  result: MatchResult;
  playerSeat?: PlayerId;
  isOnline?: boolean;
  players: { id: PlayerId; name: string; rooms: number; sent: number; captured: number }[];
}

export interface OfflineOptions {
  bots?: (BotLevel | null)[];
  benchmark?: boolean;
  remoteMatch?: RemoteMatch;
  onReady?: () => void;
  onLoadError?: () => void;
  onPause?: () => void;
  onEnd?: (report: MatchReport) => void;
  onSettings?: (settings: Settings) => void;
}
