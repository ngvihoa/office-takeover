import type { Config, SendPct } from './config';

export type PlayerId = 0 | 1 | 2 | 3;
export const PLAYER_IDS: readonly PlayerId[] = [0, 1, 2, 3];

/** `kind` drives rules; MVP only gives `pantry` special behaviour (meeting, boss, server act as normal rooms). */
export type TowerKind = 'team' | 'normal' | 'pantry' | 'meeting' | 'boss' | 'server';
export type DoorSide = 't' | 'b' | 'l' | 'r';

// ---------- map file (packages/sim/maps/*.json) ----------
export interface MapTowerDef {
  id: number;
  name: string;
  kind: TowerKind;
  /** Furniture theme for the renderer only. */
  dept: string;
  rect: [number, number, number, number];
  doors: { side: DoorSide; node: string }[];
  /** Seat that starts in this room, or null for neutral. */
  seat: PlayerId | null;
  troops: number;
  level: number;
}

export interface MapDef {
  id: string;
  name: string;
  size: [number, number];
  building: { x: number; y: number; w: number; h: number };
  towers: MapTowerDef[];
  corridor: { nodes: Record<string, [number, number]>; edges: [string, string][] };
}

// ---------- static world derived from a map ----------
export interface PathInfo {
  /** Corridor length in px (integer). */
  length: number;
  /** Polyline from the source door to the target door, for rendering. */
  points: [number, number][];
}

export interface World {
  map: MapDef;
  config: Config;
  /** paths[from][to]; undefined on the diagonal. */
  paths: (PathInfo | undefined)[][];
}

// ---------- dynamic state ----------
export interface Tower {
  id: number;
  owner: PlayerId | null;
  troops: number;
  level: number;
  /** Ticks left until the next troop is produced. */
  prodTimer: number;
}

export interface Squad {
  id: number;
  owner: PlayerId;
  count: number;
  from: number;
  to: number;
  dist: number;
  traveled: number;
  /** Tick the squad left, for rendering and replays. */
  spawnTick: number;
}

export type SkillId = 'deadline' | 'coffee';
export const SKILL_IDS: readonly SkillId[] = ['deadline', 'coffee'];

export interface Player {
  id: PlayerId;
  /** False for empty seats: they never act and never count for victory. */
  active: boolean;
  eliminatedAt: number | null;
  /** Tick at which each skill becomes usable. */
  skillReadyAt: Record<SkillId, number>;
  /** Deadline speed boost lasts while tick < deadlineUntil. */
  deadlineUntil: number;
}

export interface MatchResult {
  /** Seats ordered best first; empty seats excluded. */
  ranking: PlayerId[];
  winner: PlayerId | null;
  reason: 'last-standing' | 'time-limit';
  endTick: number;
}

export interface GameState {
  tick: number;
  seed: number;
  towers: Tower[];
  squads: Squad[];
  nextSquadId: number;
  players: Player[];
  result: MatchResult | null;
}

// ---------- commands & events ----------
export type Command =
  | { t: 'send'; player: PlayerId; from: number[]; to: number; pct: SendPct }
  | { t: 'upgrade'; player: PlayerId; tower: number }
  | { t: 'skill'; player: PlayerId; skill: SkillId; target?: number };

export type GameEvent =
  | { t: 'squadSpawned'; squad: number; owner: PlayerId; from: number; to: number; count: number }
  | { t: 'squadArrived'; squad: number; owner: PlayerId; to: number; count: number }
  | { t: 'captured'; tower: number; from: PlayerId | null; to: PlayerId }
  | { t: 'upgraded'; tower: number; level: number }
  | { t: 'skillUsed'; player: PlayerId; skill: SkillId; target?: number }
  | { t: 'eliminated'; player: PlayerId }
  | { t: 'matchEnded'; result: MatchResult };

export type SeatKind = 'human' | 'bot' | 'empty';
