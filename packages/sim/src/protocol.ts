import type { BotLevel } from './bot/bot';
import type { Config, SendPct } from './config';
import type { Command, GameState, MapDef, MatchResult, PlayerId, SkillId } from './types';

export const ROOM_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function isValidRoomCode(code: string): boolean {
  if (typeof code !== 'string' || code.length !== 4) return false;
  const upper = code.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const char = upper[i];
    if (!char || !ROOM_CODE_CHARS.includes(char)) return false;
  }
  return true;
}

export function generateRoomCode(randomFn: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(randomFn() * ROOM_CODE_CHARS.length);
    code += ROOM_CODE_CHARS[idx] ?? 'A';
  }
  return code;
}

export interface SeatState {
  seat: PlayerId;
  kind: 'human' | 'bot' | 'empty';
  name: string;
  id?: string;
  level?: BotLevel;
  ready: boolean;
  connected: boolean;
}

export type ClientCommand =
  | { t: 'send'; player?: PlayerId; from: number[]; to: number; pct: SendPct }
  | { t: 'upgrade'; player?: PlayerId; tower: number }
  | { t: 'skill'; player?: PlayerId; skill: SkillId; target?: number };

// ---------- Client → Server Messages ----------
export type ClientMessage =
  | { k: 'join'; name: string; seatToken?: string }
  | { k: 'seat'; seat: PlayerId | null }
  | { k: 'bot'; seat: PlayerId; level: BotLevel | null }
  | { k: 'ready'; ready: boolean }
  | { k: 'start' }
  | { k: 'cmd'; cmd: ClientCommand }
  | { k: 'emote'; id: number }
  | { k: 'resync' }
  | { k: 'rematch' };

// ---------- Server → Client Messages ----------
export type ServerMessage =
  | {
      k: 'lobby';
      code: string;
      hostId: string;
      seats: SeatState[];
      you: { id: string; seatToken: string; seat: PlayerId | null };
    }
  | {
      k: 'start';
      map: MapDef;
      seats: SeatState[];
      seed: number;
      tick0: number;
      config: Config;
    }
  | {
      k: 't';
      tick: number;
      cmds: Command[];
    }
  | {
      k: 's';
      tick: number;
      hash: number;
      snapshot?: GameState;
    }
  | {
      k: 'emote';
      seat: PlayerId;
      id: number;
    }
  | {
      k: 'end';
      result: MatchResult;
    }
  | {
      k: 'err';
      code: string;
      msg: string;
    };

export function parseClientMessage(raw: unknown): ClientMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const msg = raw as Record<string, unknown>;
  const k = msg.k;

  if (k === 'join') {
    if (typeof msg.name !== 'string') return null;
    const name = msg.name.trim().slice(0, 20);
    if (!name) return null;
    const seatToken = typeof msg.seatToken === 'string' ? msg.seatToken : undefined;
    return { k: 'join', name, seatToken };
  }

  if (k === 'seat') {
    const seat = msg.seat;
    if (seat === null || seat === 0 || seat === 1 || seat === 2 || seat === 3) {
      return { k: 'seat', seat };
    }
    return null;
  }

  if (k === 'bot') {
    const seat = msg.seat;
    if (seat !== 0 && seat !== 1 && seat !== 2 && seat !== 3) return null;
    const level = msg.level;
    if (level !== 'easy' && level !== 'normal' && level !== null) return null;
    return { k: 'bot', seat, level };
  }

  if (k === 'ready') {
    if (typeof msg.ready !== 'boolean') return null;
    return { k: 'ready', ready: msg.ready };
  }

  if (k === 'start') {
    return { k: 'start' };
  }

  if (k === 'cmd') {
    const cmd = msg.cmd as Record<string, unknown> | null;
    if (!cmd || typeof cmd !== 'object') return null;
    if (cmd.t === 'send') {
      if (!Array.isArray(cmd.from) || typeof cmd.to !== 'number' || typeof cmd.pct !== 'number') return null;
      if (![25, 50, 75, 100].includes(cmd.pct as number)) return null;
      return {
        k: 'cmd',
        cmd: {
          t: 'send',
          from: cmd.from.filter((f) => typeof f === 'number'),
          to: cmd.to,
          pct: cmd.pct as SendPct,
        },
      };
    }
    if (cmd.t === 'upgrade') {
      if (typeof cmd.tower !== 'number') return null;
      return { k: 'cmd', cmd: { t: 'upgrade', tower: cmd.tower } };
    }
    if (cmd.t === 'skill') {
      if (cmd.skill !== 'deadline' && cmd.skill !== 'coffee') return null;
      const target = typeof cmd.target === 'number' ? cmd.target : undefined;
      return { k: 'cmd', cmd: { t: 'skill', skill: cmd.skill, target } };
    }
    return null;
  }

  if (k === 'emote') {
    if (typeof msg.id !== 'number' || msg.id < 1 || msg.id > 6 || !Number.isInteger(msg.id)) return null;
    return { k: 'emote', id: msg.id };
  }

  if (k === 'resync') {
    return { k: 'resync' };
  }

  if (k === 'rematch') {
    return { k: 'rematch' };
  }

  return null;
}
