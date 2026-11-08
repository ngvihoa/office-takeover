import { describe, expect, it } from 'vitest';
import {
  botThink,
  buildWorld,
  type Command,
  createBot,
  createMatch,
  HUMAN_GRACE_TICKS,
  hashState,
  MAPS,
  type MapDef,
  runBotMatch,
  seatOrder,
  step,
  withSeatOrder,
} from '../src';

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

  it('bots never attack a human room during the opening grace period', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const w = buildWorld(withSeatOrder(MAPS['office-01'] as MapDef, seatOrder(seed)));
      const s = createMatch(w, ['human', 'bot', 'bot', 'bot'], seed);
      const bots = ([1, 2, 3] as const).map((p) => createBot(p, p === 2 ? 'normal' : 'easy', seed, [0]));
      while (s.tick < HUMAN_GRACE_TICKS && !s.result) {
        const cmds: Command[] = bots.flatMap((b) => botThink(w, s, b));
        for (const c of cmds)
          if (c.t === 'send') expect(s.towers[c.to]?.owner, `seed ${seed} tick ${s.tick}`).not.toBe(0);
        step(w, s, cmds);
      }
    }
  });

  it('a first-time player stand-in has a fair chance against the default lineup (25–45%)', () => {
    let wins = 0;
    const n = 600;
    for (let seed = 1; seed <= n; seed++) {
      const w = buildWorld(withSeatOrder(MAPS['office-01'] as MapDef, seatOrder(seed)));
      const s = runBotMatch(w, ['novice', 'easy', 'normal', 'easy'], seed, [0]);
      if (s.result?.winner === 0) wins++;
    }
    console.info('novice vs easy/normal/easy win rate', wins / n);
    expect(wins / n).toBeGreaterThanOrEqual(0.25);
    expect(wins / n).toBeLessThanOrEqual(0.45);
  }, 60_000);
});

describe('start rooms', () => {
  it('seatOrder is a seeded permutation and spreads the human across all four rooms', () => {
    const counts = [0, 0, 0, 0];
    for (let seed = 1; seed <= 400; seed++) {
      const order = seatOrder(seed);
      expect([...order].sort()).toEqual([0, 1, 2, 3]);
      expect(seatOrder(seed)).toEqual(order);
      counts[order.indexOf(0)] = (counts[order.indexOf(0)] ?? 0) + 1;
    }
    for (const c of counts) expect(c).toBeGreaterThan(70);
  });

  it('shuffled maps keep exactly one start room per seat', () => {
    const m = withSeatOrder(MAPS['office-01'] as MapDef, [2, 0, 3, 1]);
    expect(
      m.towers
        .filter((t) => t.seat !== null)
        .map((t) => t.seat)
        .sort(),
    ).toEqual([0, 1, 2, 3]);
    expect(MAPS['office-01']?.towers.find((t) => t.seat === 0)?.name).toBe('TEAM DEV');
    expect(m.towers.find((t) => t.seat === 0)?.name).toBe('TEAM DESIGN');
  });
});
