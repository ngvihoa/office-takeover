import { describe, expect, it, vi } from 'vitest';
import { boxFromPoints, boxIntersects, logicalPoint, newMatchSeed, wheelRatio } from '../src/game/controls';

describe('match input at integer display scales', () => {
  it.each([1, 2, 3])('keeps room and HUD coordinates in logical pixels at scale %i', (scale) => {
    expect(logicalPoint(76 * scale, 70 * scale, scale)).toEqual({ x: 76, y: 70 });
    expect(logicalPoint(320 * scale, 350 * scale, scale)).toEqual({ x: 320, y: 350 });
  });
  it('clamps wheel changes at both ends', () => {
    expect(wheelRatio(100, 100)).toBe(100);
    expect(wheelRatio(25, -100)).toBe(25);
    expect(wheelRatio(50, 100)).toBe(75);
    expect(wheelRatio(50, -100)).toBe(25);
  });
  it('ignores horizontal-only scrolling', () => {
    expect(wheelRatio(50, 0)).toBe(50);
  });
  it('computes box geometry and tests intersection', () => {
    expect(boxFromPoints(100, 80, 20, 30)).toEqual([20, 30, 80, 50]);
    expect(boxIntersects([20, 30, 80, 50], [50, 40, 20, 20])).toBe(true);
    expect(boxIntersects([20, 30, 80, 50], [150, 40, 20, 20])).toBe(false);
    expect(boxIntersects([20, 30, 80, 50], [20, 80, 10, 10])).toBe(false); // Touching border without overlap
  });
});

describe('offline match seeds', () => {
  it('uses browser entropy and avoids repeating the previous match seed', () => {
    const random = vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
      if (array instanceof Uint32Array) array[0] = 731;
      return array;
    });
    try {
      expect(newMatchSeed()).toBe(731);
      expect(newMatchSeed(731)).toBe(732);
      expect(newMatchSeed(123)).toBe(731);
    } finally {
      random.mockRestore();
    }
  });
});
