import { LocalMatch } from '@ot/sim';
import { describe, expect, it } from 'vitest';
import { matchLayout } from '../src/game/session';

describe('match starting rooms', () => {
  it('highlights the actual blue human room across seeded seat permutations', () => {
    const rooms = new Set<number>();
    for (let seed = 0; seed < 32; seed++) {
      const { world, startRoom, order } = matchLayout(seed);
      const match = new LocalMatch(world, [{ kind: 'human' }, { kind: 'bot', level: 'easy' }], seed);
      expect(startRoom.seat).toBe(0);
      expect(match.state.towers[startRoom.id]?.owner).toBe(0);
      expect(order).toContain(0);
      expect(matchLayout(seed).startRoom.id).toBe(startRoom.id);
      rooms.add(startRoom.id);
    }
    expect([...rooms].sort((a, b) => a - b)).toEqual([0, 4, 8, 12]);
  });

  it('keeps benchmark rooms fixed and does not mutate another match layout', () => {
    const ordinary = matchLayout(7);
    const controlled = matchLayout(7, true);
    expect(controlled.order).toEqual([0, 1, 2, 3]);
    expect(controlled.startRoom.id).toBe(0);
    expect(ordinary.order).not.toEqual(controlled.order);
    expect(matchLayout(7).order).toEqual(ordinary.order);
  });
});
