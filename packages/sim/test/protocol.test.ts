import { describe, expect, it } from 'vitest';
import { generateRoomCode, isValidRoomCode, parseClientMessage, ROOM_CODE_CHARS } from '../src/protocol';

describe('multiplayer protocol', () => {
  it('validates and generates valid 4-character room codes', () => {
    expect(isValidRoomCode('ABCD')).toBe(true);
    expect(isValidRoomCode('2345')).toBe(true);
    expect(isValidRoomCode('ab23')).toBe(true); // case-insensitive check
    expect(isValidRoomCode('ABC1')).toBe(false); // '1' is omitted from Crockford base
    expect(isValidRoomCode('AB0D')).toBe(false); // '0' is omitted
    expect(isValidRoomCode('ABC')).toBe(false);
    expect(isValidRoomCode('ABCDE')).toBe(false);
    expect(isValidRoomCode('')).toBe(false);

    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code.length).toBe(4);
      expect(isValidRoomCode(code)).toBe(true);
      for (const char of code) {
        expect(ROOM_CODE_CHARS).toContain(char);
      }
    }
  });

  it('parses client messages correctly', () => {
    expect(parseClientMessage({ k: 'join', name: '  Alice  ' })).toEqual({
      k: 'join',
      name: 'Alice',
      seatToken: undefined,
    });
    expect(parseClientMessage({ k: 'join', name: 'Bob', seatToken: 'tok123' })).toEqual({
      k: 'join',
      name: 'Bob',
      seatToken: 'tok123',
    });
    expect(parseClientMessage({ k: 'join', name: '' })).toBeNull();

    expect(parseClientMessage({ k: 'seat', seat: 2 })).toEqual({ k: 'seat', seat: 2 });
    expect(parseClientMessage({ k: 'seat', seat: null })).toEqual({ k: 'seat', seat: null });
    expect(parseClientMessage({ k: 'seat', seat: 4 })).toBeNull();

    expect(parseClientMessage({ k: 'bot', seat: 1, level: 'normal' })).toEqual({
      k: 'bot',
      seat: 1,
      level: 'normal',
    });
    expect(parseClientMessage({ k: 'bot', seat: 1, level: null })).toEqual({
      k: 'bot',
      seat: 1,
      level: null,
    });
    expect(parseClientMessage({ k: 'bot', seat: 1, level: 'hard' })).toBeNull();

    expect(parseClientMessage({ k: 'ready', ready: true })).toEqual({ k: 'ready', ready: true });
    expect(parseClientMessage({ k: 'start' })).toEqual({ k: 'start' });

    expect(
      parseClientMessage({
        k: 'cmd',
        cmd: { t: 'send', from: [1, 2], to: 3, pct: 50 },
      }),
    ).toEqual({
      k: 'cmd',
      cmd: { t: 'send', from: [1, 2], to: 3, pct: 50 },
    });

    expect(
      parseClientMessage({
        k: 'cmd',
        cmd: { t: 'upgrade', tower: 2 },
      }),
    ).toEqual({
      k: 'cmd',
      cmd: { t: 'upgrade', tower: 2 },
    });

    expect(
      parseClientMessage({
        k: 'cmd',
        cmd: { t: 'skill', skill: 'deadline' },
      }),
    ).toEqual({
      k: 'cmd',
      cmd: { t: 'skill', skill: 'deadline', target: undefined },
    });

    expect(parseClientMessage({ k: 'emote', id: 3 })).toEqual({ k: 'emote', id: 3 });
    expect(parseClientMessage({ k: 'emote', id: 0 })).toBeNull();
    expect(parseClientMessage({ k: 'emote', id: 7 })).toBeNull();

    expect(parseClientMessage({ k: 'resync' })).toEqual({ k: 'resync' });
    expect(parseClientMessage({ k: 'rematch' })).toEqual({ k: 'rematch' });
    expect(parseClientMessage({ k: 'unknown' })).toBeNull();
  });
});
