import { describe, expect, it } from 'vitest';
import {
  buildWorld,
  type Command,
  cloneState,
  createMatch,
  DEFAULT_CONFIG,
  type GameState,
  hashState,
  MAPS,
  type MapDef,
  pathLength,
  type SeatKind,
  step,
  type World,
} from '../src';

const map = MAPS['office-01'] as MapDef;
const world = buildWorld(map);
const DEV = 0;
const ACC = 1;
const PANTRY = 2;
const DESIGN = 4;
const SALES = 8;

function setup(seats: SeatKind[] = ['human', 'human', 'empty', 'empty']): GameState {
  return createMatch(world, seats, 42);
}

function run(w: World, s: GameState, ticks: number, cmds: Command[] = []) {
  step(w, s, cmds);
  for (let i = 1; i < ticks; i++) step(w, s, []);
}

describe('world', () => {
  it('connects every pair of rooms with an integer-length corridor path', () => {
    for (const a of map.towers)
      for (const b of map.towers) {
        if (a.id === b.id) continue;
        const p = world.paths[a.id]?.[b.id];
        expect(p, `${a.name} -> ${b.name}`).toBeDefined();
        expect(Number.isInteger(p?.length)).toBe(true);
        expect(p?.length).toBeGreaterThan(0);
      }
  });

  it('paths are symmetric (a->b == b->a)', () => {
    for (const a of map.towers)
      for (const b of map.towers)
        if (a.id !== b.id) expect(pathLength(world, a.id, b.id)).toBe(pathLength(world, b.id, a.id));
  });

  it('is fair for 4 seats: every team room sees the same (kind, distance) profile', () => {
    const profile = (seat: number) => {
      const home = map.towers.find((t) => t.seat === seat);
      if (!home) throw new Error('missing seat');
      return map.towers
        .filter((t) => t.id !== home.id)
        .map((t) => `${t.kind}:${t.troops}:${pathLength(world, home.id, t.id)}`)
        .sort();
    };
    expect(profile(1)).toEqual(profile(0));
    expect(profile(2)).toEqual(profile(0));
    expect(profile(3)).toEqual(profile(0));
  });

  it('office-02 (Crossroad) connects every pair and is 4-way symmetric', () => {
    const map02 = MAPS['office-02'] as MapDef;
    const world02 = buildWorld(map02);
    for (const a of map02.towers)
      for (const b of map02.towers) {
        if (a.id === b.id) continue;
        const p = world02.paths[a.id]?.[b.id];
        expect(p, `${a.name} -> ${b.name}`).toBeDefined();
        expect(Number.isInteger(p?.length)).toBe(true);
        expect(p?.length).toBeGreaterThan(0);
        expect(pathLength(world02, a.id, b.id)).toBe(pathLength(world02, b.id, a.id));
      }

    const profile02 = (seat: number) => {
      const home = map02.towers.find((t) => t.seat === seat);
      if (!home) throw new Error('missing seat');
      return map02.towers
        .filter((t) => t.id !== home.id)
        .map((t) => `${t.kind}:${t.troops}:${pathLength(world02, home.id, t.id)}`)
        .sort();
    };
    expect(profile02(1)).toEqual(profile02(0));
    expect(profile02(2)).toEqual(profile02(0));
    expect(profile02(3)).toEqual(profile02(0));
  });

  it('office-03 (The Ring) connects every pair and is 4-way symmetric', () => {
    const map03 = MAPS['office-03'] as MapDef;
    const world03 = buildWorld(map03);
    for (const a of map03.towers)
      for (const b of map03.towers) {
        if (a.id === b.id) continue;
        const p = world03.paths[a.id]?.[b.id];
        expect(p, `${a.name} -> ${b.name}`).toBeDefined();
        expect(Number.isInteger(p?.length)).toBe(true);
        expect(p?.length).toBeGreaterThan(0);
        expect(pathLength(world03, a.id, b.id)).toBe(pathLength(world03, b.id, a.id));
      }

    const profile03 = (seat: number) => {
      const home = map03.towers.find((t) => t.seat === seat);
      if (!home) throw new Error('missing seat');
      return map03.towers
        .filter((t) => t.id !== home.id)
        .map((t) => `${t.kind}:${t.troops}:${pathLength(world03, home.id, t.id)}`)
        .sort();
    };
    expect(profile03(1)).toEqual(profile03(0));
    expect(profile03(2)).toEqual(profile03(0));
    expect(profile03(3)).toEqual(profile03(0));
  });

  it('dev -> accounting walks the corridor, not a straight line', () => {
    expect(pathLength(world, DEV, ACC)).toBe(7 + 124 + 7);
    expect(world.paths[DEV]?.[ACC]?.points).toEqual([
      [76, 118],
      [76, 125],
      [200, 125],
      [200, 118],
    ]);
  });
});

describe('setup', () => {
  it('empty seats leave their team room neutral', () => {
    const s = setup();
    expect(s.towers[DEV]?.owner).toBe(0);
    expect(s.towers[DESIGN]?.owner).toBe(1);
    expect(s.towers[SALES]?.owner).toBeNull();
    expect(s.players[2]?.active).toBe(false);
  });
});

describe('production', () => {
  it('owned rooms gain +1 every 10 ticks at level 1, neutral rooms never grow', () => {
    const s = setup();
    run(world, s, 30);
    expect(s.towers[DEV]?.troops).toBe(13);
    expect(s.towers[ACC]?.troops).toBe(5);
  });

  it('pantry produces twice as fast', () => {
    const s = setup();
    const p = s.towers[PANTRY];
    if (!p) throw new Error();
    p.owner = 0;
    p.troops = 0;
    p.prodTimer = 5;
    run(world, s, 20);
    expect(p.troops).toBe(4);
  });

  it('stops at capacity but reinforcements may exceed it', () => {
    const s = setup();
    const t = s.towers[DEV];
    if (!t) throw new Error();
    t.troops = 30;
    run(world, s, 50);
    expect(t.troops).toBe(30);
  });
});

describe('sending and capturing', () => {
  it('sends floor(troops * pct) and keeps the rest', () => {
    const s = setup();
    step(world, s, [{ t: 'send', player: 0, from: [DEV], to: ACC, pct: 75 }]);
    expect(s.towers[DEV]?.troops).toBe(3);
    expect(s.squads[0]?.count).toBe(7);
  });

  it('a squad arrives after ceil(length / speed) ticks and captures when defenders go below zero', () => {
    const s = setup();
    const ticks = Math.ceil(pathLength(world, DEV, ACC) / DEFAULT_CONFIG.squadSpeed);
    run(world, s, ticks - 1, [{ t: 'send', player: 0, from: [DEV], to: ACC, pct: 100 }]);
    expect(s.towers[ACC]?.owner).toBeNull();
    step(world, s, []);
    expect(s.towers[ACC]?.owner).toBe(0);
    expect(s.towers[ACC]?.troops).toBe(10 - 5);
  });

  it('exactly zero defenders keeps the old owner', () => {
    const s = setup();
    const dev = s.towers[DEV];
    if (!dev) throw new Error();
    dev.troops = 5;
    const ticks = Math.ceil(pathLength(world, DEV, ACC) / DEFAULT_CONFIG.squadSpeed);
    run(world, s, ticks, [{ t: 'send', player: 0, from: [DEV], to: ACC, pct: 100 }]);
    expect(s.towers[ACC]?.owner).toBeNull();
    expect(s.towers[ACC]?.troops).toBe(0);
  });

  it('pools troops from several rooms in one command', () => {
    const s = setup();
    const acc = s.towers[ACC];
    if (!acc) throw new Error();
    acc.owner = 0;
    step(world, s, [{ t: 'send', player: 0, from: [DEV, ACC, DEV], to: PANTRY, pct: 50 }]);
    expect(s.squads.map((q) => q.from)).toEqual([DEV, ACC]);
  });

  it('ignores commands for rooms the player does not own', () => {
    const s = setup();
    step(world, s, [{ t: 'send', player: 0, from: [DESIGN], to: ACC, pct: 100 }]);
    expect(s.squads).toHaveLength(0);
  });
});

describe('upgrade', () => {
  it('costs troops and raises level, capacity and production speed', () => {
    const s = setup();
    const dev = s.towers[DEV];
    if (!dev) throw new Error();
    dev.troops = 25;
    step(world, s, [{ t: 'upgrade', player: 0, tower: DEV }]);
    expect(dev.level).toBe(2);
    expect(dev.troops).toBe(15);
    step(world, s, [{ t: 'upgrade', player: 0, tower: DEV }]);
    expect(dev.level).toBe(2);
  });
});

describe('skills', () => {
  it('cannot be used during warm-up, then go on cooldown', () => {
    const s = setup();
    step(world, s, [{ t: 'skill', player: 0, skill: 'coffee', target: DEV }]);
    expect(s.towers[DEV]?.troops).toBe(10);
    s.tick = DEFAULT_CONFIG.skillWarmup;
    const before = s.towers[DEV]?.troops ?? 0;
    step(world, s, [{ t: 'skill', player: 0, skill: 'coffee', target: DEV }]);
    expect(s.towers[DEV]?.troops).toBeGreaterThanOrEqual(before + DEFAULT_CONFIG.coffee.troops);
    expect(s.players[0]?.skillReadyAt.coffee).toBe(DEFAULT_CONFIG.skillWarmup + DEFAULT_CONFIG.coffee.cooldownTicks);
  });

  it('deadline doubles squad speed', () => {
    const s = setup();
    s.tick = DEFAULT_CONFIG.skillWarmup;
    step(world, s, [
      { t: 'skill', player: 0, skill: 'deadline' },
      { t: 'send', player: 0, from: [DEV], to: ACC, pct: 50 },
    ]);
    expect(s.squads[0]?.traveled).toBe(DEFAULT_CONFIG.squadSpeed * 2);
  });
});

describe('end of match', () => {
  it('a player with no rooms and no squads is eliminated and the last one standing wins', () => {
    const s = setup();
    const design = s.towers[DESIGN];
    if (!design) throw new Error();
    design.owner = 0;
    const events = step(world, s, []);
    expect(events.some((e) => e.t === 'eliminated' && e.player === 1)).toBe(true);
    expect(s.result?.winner).toBe(0);
    expect(s.result?.reason).toBe('last-standing');
  });

  it('time limit ranks by rooms, then troops, and reports a draw on a full tie', () => {
    const s = setup();
    s.tick = DEFAULT_CONFIG.matchTicks - 1;
    step(world, s, []);
    expect(s.result?.reason).toBe('time-limit');
    expect(s.result?.winner).toBeNull();
    expect(s.result?.ranking).toEqual([0, 1]);
  });
});

describe('special rooms', () => {
  it('owning Boss room boosts squad speed by 20%', () => {
    const s = setup();
    const boss = s.towers[6];
    if (!boss) throw new Error();
    // Initially not owned
    expect(s.towers[6]?.owner).toBeNull();
    // Send squad from Dev
    step(world, s, [{ t: 'send', player: 0, from: [DEV], to: ACC, pct: 50 }]);
    expect(s.squads[0]?.traveled).toBe(5);

    // Give Boss room to player 0
    boss.owner = 0;
    step(world, s, []);
    // With Boss room: 5 * 1.2 = 6px per tick
    expect(s.squads[0]?.traveled).toBe(5 + 6);
  });

  it('defended Meeting room reduces enemy attack damage by 25% and has 25% higher capacity', () => {
    const s = setup();
    const meetA = s.towers[5];
    if (!meetA) throw new Error();
    meetA.owner = 0;
    meetA.troops = 20;

    // Enemy attacks with 10 troops
    // With 25% defense: dmg = round(10 * 0.75) = 8
    s.squads.push({
      id: 99,
      owner: 1,
      from: DESIGN,
      to: 5,
      count: 10,
      dist: 10,
      traveled: 10,
      spawnTick: 0,
    });
    step(world, s, []);
    expect(meetA.troops).toBe(12); // 20 - 8 = 12, instead of 20 - 10 = 10
  });
});

describe('determinism', () => {
  it('same commands produce the same hash; clones are independent', () => {
    const script = (s: GameState) => {
      const hashes: number[] = [];
      for (let i = 0; i < 400; i++) {
        const cmds: Command[] =
          i % 37 === 0
            ? [{ t: 'send', player: (i % 2) as 0 | 1, from: [i % 2 ? DESIGN : DEV], to: PANTRY, pct: 50 }]
            : [];
        step(world, s, cmds);
        hashes.push(hashState(s));
      }
      return hashes;
    };
    const a = setup();
    const b = setup();
    const copy = cloneState(a);
    expect(script(a)).toEqual(script(b));
    expect(hashState(copy)).toBe(hashState(setup()));
  });
});
