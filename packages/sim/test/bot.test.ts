import { describe, expect, it } from 'vitest';
import { buildWorld, hashState, MAPS, type MapDef, runBotMatch } from '../src';

const world = buildWorld(MAPS['office-01'] as MapDef);

describe('bots', () => {
  it('a bot match is reproducible from its seed', () => {
    const a = runBotMatch(world, ['normal', 'normal', 'easy', 'easy'], 7);
    const b = runBotMatch(world, ['normal', 'normal', 'easy', 'easy'], 7);
    expect(hashState(a)).toBe(hashState(b));
    expect(a.result).toEqual(b.result);
  });

  it('1000 normal-vs-normal matches finish without errors and every seat wins 20–30% of decided games', () => {
    const wins = [0, 0, 0, 0];
    let decided = 0;
    let lastStanding = 0;
    const lengths: number[] = [];
    for (let seed = 1; seed <= 1000; seed++) {
      const s = runBotMatch(world, ['normal', 'normal', 'normal', 'normal'], seed);
      expect(s.result).not.toBeNull();
      const w = s.result?.winner;
      if (w !== null && w !== undefined) {
        wins[w] = (wins[w] ?? 0) + 1;
        decided++;
      }
      if (s.result?.reason === 'last-standing') lastStanding++;
      lengths.push(s.result?.endTick ?? 0);
    }
    const shares = wins.map((w) => w / decided);
    lengths.sort((a, b) => a - b);
    const pct = (p: number) => ((lengths[Math.floor(lengths.length * p)] ?? 0) / 10).toFixed(0);
    console.info(
      'seat win shares',
      shares.map((x) => x.toFixed(3)).join(' '),
      '| decided',
      decided,
      '| last-standing',
      lastStanding,
      '| match length s p10/p50/p90',
      pct(0.1),
      pct(0.5),
      pct(0.9),
    );
    for (const share of shares) {
      expect(share).toBeGreaterThanOrEqual(0.2);
      expect(share).toBeLessThanOrEqual(0.3);
    }
  }, 120_000);

  it('a normal bot beats three easy bots most of the time', () => {
    let wins = 0;
    const n = 200;
    for (let seed = 1; seed <= n; seed++) {
      const s = runBotMatch(world, ['normal', 'easy', 'easy', 'easy'], seed);
      if (s.result?.winner === 0) wins++;
    }
    console.info('normal vs 3 easy win rate', wins / n);
    expect(wins / n).toBeGreaterThan(0.4);
  }, 60_000);
});
