import { MAX_LEVEL } from './config';
import {
  type Command,
  type GameEvent,
  type GameState,
  type MatchResult,
  PLAYER_IDS,
  type PlayerId,
  type SeatKind,
  type Tower,
  type World,
} from './types';

// ---------- setup ----------

/**
 * Create the initial state. `seats[i]` decides seat i: 'empty' turns that seat's starting room neutral.
 */
export function createMatch(world: World, seats: readonly SeatKind[], seed: number): GameState {
  const { map, config } = world;
  const active = (seat: PlayerId | null) => seat !== null && (seats[seat] ?? 'empty') !== 'empty';
  const towers: Tower[] = map.towers.map((t) => {
    const owner = active(t.seat) ? t.seat : null;
    const level = t.level;
    return { id: t.id, owner, troops: t.troops, level, prodTimer: interval(world, t.id, level) };
  });
  return {
    tick: 0,
    seed: seed >>> 0,
    towers,
    squads: [],
    nextSquadId: 0,
    players: PLAYER_IDS.map((id) => ({
      id,
      active: (seats[id] ?? 'empty') !== 'empty',
      eliminatedAt: null,
      skillReadyAt: { deadline: config.skillWarmup, coffee: config.skillWarmup },
      deadlineUntil: 0,
    })),
    result: null,
  };
}

export function cloneState(s: GameState): GameState {
  return {
    ...s,
    towers: s.towers.map((t) => ({ ...t })),
    squads: s.squads.map((q) => ({ ...q })),
    players: s.players.map((p) => ({ ...p, skillReadyAt: { ...p.skillReadyAt } })),
    result: s.result ? { ...s.result, ranking: [...s.result.ranking] } : null,
  };
}

// ---------- derived values ----------

export function interval(world: World, towerId: number, level: number): number {
  const base = world.config.productionInterval[level - 1] as number;
  return world.map.towers[towerId]?.kind === 'pantry' ? Math.max(1, Math.floor(base / 2)) : base;
}

export function capacity(world: World, level: number): number {
  return world.config.capacity[level - 1] as number;
}

export function isAlive(s: GameState, p: PlayerId): boolean {
  const pl = s.players[p];
  return !!pl && pl.active && pl.eliminatedAt === null;
}

export function squadSpeed(world: World, s: GameState, owner: PlayerId): number {
  const boosted = (s.players[owner]?.deadlineUntil ?? 0) > s.tick;
  return world.config.squadSpeed * (boosted ? world.config.deadline.speedMultiplier : 1);
}

// ---------- commands ----------

export function validate(world: World, s: GameState, c: Command): boolean {
  if (s.result || !isAlive(s, c.player)) return false;
  const owns = (id: number) => s.towers[id]?.owner === c.player;
  switch (c.t) {
    case 'send':
      return (
        Number.isInteger(c.to) &&
        c.to >= 0 &&
        c.to < s.towers.length &&
        [25, 50, 75, 100].includes(c.pct) &&
        c.from.some((f) => f !== c.to && owns(f) && (s.towers[f]?.troops ?? 0) >= 1)
      );
    case 'upgrade': {
      const t = s.towers[c.tower];
      if (!t || t.owner !== c.player || t.level >= MAX_LEVEL) return false;
      return t.troops >= (world.config.upgradeCost[t.level - 1] as number);
    }
    case 'skill': {
      const p = s.players[c.player];
      if (!p || s.tick < p.skillReadyAt[c.skill]) return false;
      if (c.skill === 'coffee') return c.target !== undefined && owns(c.target);
      return true;
    }
  }
}

function apply(world: World, s: GameState, c: Command, events: GameEvent[]): void {
  switch (c.t) {
    case 'send': {
      const seen = new Set<number>();
      for (const f of c.from) {
        const t = s.towers[f];
        if (seen.has(f) || f === c.to || !t || t.owner !== c.player || t.troops < 1) continue;
        seen.add(f);
        const count = Math.max(1, Math.floor((t.troops * c.pct) / 100));
        t.troops -= count;
        const id = s.nextSquadId++;
        const dist = world.paths[f]?.[c.to]?.length ?? 0;
        s.squads.push({ id, owner: c.player, count, from: f, to: c.to, dist, traveled: 0, spawnTick: s.tick });
        events.push({ t: 'squadSpawned', squad: id, owner: c.player, from: f, to: c.to, count });
      }
      return;
    }
    case 'upgrade': {
      const t = s.towers[c.tower] as Tower;
      t.troops -= world.config.upgradeCost[t.level - 1] as number;
      t.level += 1;
      t.prodTimer = Math.min(t.prodTimer, interval(world, t.id, t.level));
      events.push({ t: 'upgraded', tower: t.id, level: t.level });
      return;
    }
    case 'skill': {
      const p = s.players[c.player];
      if (!p) return;
      if (c.skill === 'deadline') {
        p.deadlineUntil = s.tick + world.config.deadline.durationTicks;
        p.skillReadyAt.deadline = s.tick + world.config.deadline.cooldownTicks;
      } else {
        const t = s.towers[c.target as number] as Tower;
        t.troops += world.config.coffee.troops;
        p.skillReadyAt.coffee = s.tick + world.config.coffee.cooldownTicks;
      }
      events.push({ t: 'skillUsed', player: c.player, skill: c.skill, target: c.target });
      return;
    }
  }
}

// ---------- tick ----------

/**
 * Advance exactly one tick, mutating `s`. Order (GDD §3): commands → move → arrivals (by squad id) → production →
 * elimination and victory. Invalid commands are dropped silently. Returns events for rendering and audio only.
 */
export function step(world: World, s: GameState, commands: readonly Command[]): GameEvent[] {
  const events: GameEvent[] = [];
  if (s.result) return events;

  for (const c of commands) if (validate(world, s, c)) apply(world, s, c, events);

  for (const q of s.squads) q.traveled += squadSpeed(world, s, q.owner);

  const arrived = s.squads.filter((q) => q.traveled >= q.dist).sort((a, b) => a.id - b.id);
  if (arrived.length > 0) {
    s.squads = s.squads.filter((q) => q.traveled < q.dist);
    for (const q of arrived) {
      const t = s.towers[q.to] as Tower;
      events.push({ t: 'squadArrived', squad: q.id, owner: q.owner, to: q.to, count: q.count });
      if (t.owner === q.owner) {
        t.troops += q.count;
        continue;
      }
      t.troops -= q.count;
      if (t.troops < 0) {
        const prev = t.owner;
        t.owner = q.owner;
        t.troops = -t.troops;
        t.prodTimer = interval(world, t.id, t.level);
        events.push({ t: 'captured', tower: t.id, from: prev, to: q.owner });
      }
    }
  }

  for (const t of s.towers) {
    if (t.owner === null) continue;
    if (t.troops >= capacity(world, t.level)) {
      t.prodTimer = interval(world, t.id, t.level);
      continue;
    }
    t.prodTimer -= 1;
    if (t.prodTimer <= 0) {
      t.troops += 1;
      t.prodTimer = interval(world, t.id, t.level);
    }
  }

  for (const p of s.players) {
    if (!p.active || p.eliminatedAt !== null) continue;
    const hasTower = s.towers.some((t) => t.owner === p.id);
    const hasSquad = s.squads.some((q) => q.owner === p.id);
    if (!hasTower && !hasSquad) {
      p.eliminatedAt = s.tick;
      events.push({ t: 'eliminated', player: p.id });
    }
  }

  s.tick += 1;

  const alive = s.players.filter((p) => p.active && p.eliminatedAt === null);
  const activeCount = s.players.filter((p) => p.active).length;
  if (
    (activeCount > 1 && alive.length <= 1) ||
    (activeCount === 1 && alive.length === 0) ||
    s.tick >= world.config.matchTicks
  ) {
    s.result = finish(s, alive.length <= 1 && s.tick < world.config.matchTicks ? 'last-standing' : 'time-limit');
    events.push({ t: 'matchEnded', result: s.result });
  }
  return events;
}

function score(s: GameState, p: PlayerId): [number, number] {
  const towers = s.towers.filter((t) => t.owner === p).length;
  const troops =
    s.towers.reduce((a, t) => a + (t.owner === p ? t.troops : 0), 0) +
    s.squads.reduce((a, q) => a + (q.owner === p ? q.count : 0), 0);
  return [towers, troops];
}

function finish(s: GameState, reason: MatchResult['reason']): MatchResult {
  const active = s.players.filter((p) => p.active);
  const alive = active.filter((p) => p.eliminatedAt === null).map((p) => p.id);
  const scored = alive.map((id) => ({ id, sc: score(s, id) }));
  scored.sort((a, b) => b.sc[0] - a.sc[0] || b.sc[1] - a.sc[1] || a.id - b.id);
  const dead = active
    .filter((p) => p.eliminatedAt !== null)
    .sort((a, b) => (b.eliminatedAt as number) - (a.eliminatedAt as number) || a.id - b.id)
    .map((p) => p.id);
  const ranking = [...scored.map((x) => x.id), ...dead];
  const [first, second] = scored;
  const tie = !!first && !!second && first.sc[0] === second.sc[0] && first.sc[1] === second.sc[1];
  return { ranking, winner: first && !tie ? first.id : null, reason, endTick: s.tick };
}
