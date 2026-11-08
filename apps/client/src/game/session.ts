import type { BotLevel, MatchResult, PlayerId } from '@ot/sim';
import type { Settings } from './settings';

export const PLAYER_NAMES = ['Bạn', 'Bot An', 'Bot Bình', 'Bot Chi'] as const;
export const DEFAULT_BOTS: (BotLevel | null)[] = ['easy', 'normal', 'easy'];

export interface MatchReport {
  seed: number;
  bots: (BotLevel | null)[];
  result: MatchResult;
  players: { id: PlayerId; name: string; rooms: number; sent: number; captured: number }[];
}

export interface OfflineOptions {
  bots?: (BotLevel | null)[];
  onReady?: () => void;
  onLoadError?: () => void;
  onPause?: () => void;
  onEnd?: (report: MatchReport) => void;
  onSettings?: (settings: Settings) => void;
}
