import { SEND_PCTS, type SendPct } from '../config';
import { deriveSeed, Rng } from '../rng';
import { capacity, interval, isAlive } from '../rules';
import type { Command, GameState, PlayerId, World } from '../types';

export type BotLevel = 'easy' | 'normal';

export interface Bot {
  player: PlayerId;
  level: BotLevel;
  rng: Rng;
  nextDecisionTick: number;
}

const PERIOD: Record<BotLevel, { base: number; jitter: number }> = {
  easy: { base: 30, jitter: 5 },
  normal: { base: 15, jitter: 3 },
};

/** Bots only read state and emit the same commands a human could (docs/02 §9). */
export function createBot(player: PlayerId, level: BotLevel, matchSeed: number): Bot {
  const rng = new Rng(deriveSeed(matchSeed, 101 + player));
  return { player, level, rng, nextDecisionTick: 5 + rng.int(PERIOD[level].base) };
}

interface Candidate {
  cmd: Command;
  score: number;
}

const eta = (world: World, from: number, to: number) =>
  Math.ceil((world.paths[from]?.[to]?.length ?? 0) / world.config.squadSpeed);

/** Troops heading to `tower`, split into those owned by `who` and everyone else. */
function incoming(s: GameState, tower: number, who: PlayerId, speed: number) {
  let mine = 0;
  let others = 0;
  let soonest = Number.POSITIVE_INFINITY;
  for (const q of s.squads) {
    if (q.to !== tower) continue;
    if (q.owner === who) mine += q.count;
    else {
      others += q.count;
      soonest = Math.min(soonest, Math.ceil((q.dist - q.traveled) / speed));
    }
  }
  return { mine, others, soonest };
}

/** Defenders expected at `target` after `ticks`, minus what we already have on the way. */
function needed(world: World, s: GameState, me: PlayerId, target: number, ticks: number): number {
  const t = s.towers[target];
  if (!t) return Number.POSITIVE_INFINITY;
  const growth = t.owner === null ? 0 : Math.floor(ticks / interval(world, target, t.level));
  const defenders = Math.min(t.troops + growth, Math.max(t.troops, capacity(world, t.level)));
  const inc = incoming(s, target, me, world.config.squadSpeed);
  const ownerReinforce =
    t.owner === null
      ? 0
      : s.squads.filter((q) => q.to === target && q.owner === t.owner).reduce((a, q) => a + q.count, 0);
  return defenders + ownerReinforce - inc.mine + 2;
}

function smallestPct(troops: number, need: number): SendPct | null {
  for (const pct of SEND_PCTS) if (Math.max(1, Math.floor((troops * pct) / 100)) >= need) return pct;
  return null;
}

function value(world: World, s: GameState, me: PlayerId, target: number): number {
  const def = world.map.towers[target];
  const t = s.towers[target];
  if (!def || !t) return 0;
  let v = def.kind === 'pantry' ? 3 : def.kind === 'boss' ? 2 : def.kind === 'team' ? 1.4 : 1;
  if (t.owner !== null && t.owner !== me) {
    v += 0.4;
    const owned = s.towers.filter((x) => x.owner === t.owner).length;
    if (owned <= 2) v += 0.8;
  }
  return v;
}

export function botThink(world: World, s: GameState, bot: Bot): Command[] {
  const me = bot.player;
  if (s.result || !isAlive(s, me) || s.tick < bot.nextDecisionTick) return [];
  const period = PERIOD[bot.level];
  bot.nextDecisionTick = s.tick + period.base - period.jitter + bot.rng.int(period.jitter * 2 + 1);

  const cmds: Command[] = [];
  const mine = s.towers.filter((t) => t.owner === me);
  if (mine.length === 0) return cmds;
  const player = s.players[me];
  const ready = (skill: 'deadline' | 'coffee') => !!player && s.tick >= player.skillReadyAt[skill];
  const spent = new Map<number, number>();
  const avail = (id: number) => (s.towers[id]?.troops ?? 0) - (spent.get(id) ?? 0);

  // 1) Defence: reinforce rooms that will fall to incoming enemies.
  const threatened = new Set<number>();
  for (const t of mine) {
    const inc = incoming(s, t.id, me, world.config.squadSpeed);
    if (inc.others === 0) continue;
    const growth = Number.isFinite(inc.soonest) ? Math.floor(inc.soonest / interval(world, t.id, t.level)) : 0;
    const deficit = inc.others - (t.troops + growth + inc.mine) + 2;
    if (deficit <= 0) continue;
    threatened.add(t.id);
    const helpers = mine
      .filter((h) => h.id !== t.id && !threatened.has(h.id) && eta(world, h.id, t.id) <= inc.soonest + 5)
      .sort((a, b) => eta(world, a.id, t.id) - eta(world, b.id, t.id) || a.id - b.id);
    let covered = false;
    for (const h of helpers) {
      const pct = smallestPct(avail(h.id), deficit);
      if (pct === null) continue;
      cmds.push({ t: 'send', player: me, from: [h.id], to: t.id, pct });
      spent.set(h.id, (spent.get(h.id) ?? 0) + Math.floor((avail(h.id) * pct) / 100));
      covered = true;
      break;
    }
    if (!covered && bot.level === 'normal' && ready('coffee') && deficit <= world.config.coffee.troops) {
      cmds.push({ t: 'skill', player: me, skill: 'coffee', target: t.id });
    }
  }

  // 2) Attack: best target by value / cost.
  const sources = mine.filter((t) => !threatened.has(t.id) && avail(t.id) >= 6);
  const cands: Candidate[] = [];
  for (const target of s.towers) {
    if (target.owner === me) continue;
    for (const src of sources) {
      const ticks = eta(world, src.id, target.id);
      const need = needed(world, s, me, target.id, ticks);
      if (need <= 2) continue; // enough of our troops are already on the way
      const pct = smallestPct(avail(src.id), need);
      if (pct === null) continue;
      const dist = world.paths[src.id]?.[target.id]?.length ?? 0;
      cands.push({
        cmd: { t: 'send', player: me, from: [src.id], to: target.id, pct },
        score: value(world, s, me, target.id) / (need + dist * 0.08),
      });
    }
    if (bot.level === 'normal' && sources.length > 1) {
      // Pool 75% of several nearby rooms when no single room is enough.
      const near = [...sources].sort(
        (a, b) => eta(world, a.id, target.id) - eta(world, b.id, target.id) || a.id - b.id,
      );
      const from: number[] = [];
      let sum = 0;
      for (const src of near) {
        from.push(src.id);
        sum += Math.floor((avail(src.id) * 75) / 100);
        const need = needed(world, s, me, target.id, eta(world, src.id, target.id));
        if (need <= 2) break;
        if (from.length > 1 && sum >= need) {
          const dist = world.paths[src.id]?.[target.id]?.length ?? 0;
          cands.push({
            cmd: { t: 'send', player: me, from: [...from], to: target.id, pct: 75 },
            score: (value(world, s, me, target.id) / (need + dist * 0.08)) * 0.9,
          });
          break;
        }
      }
    }
  }
  if (cands.length > 0) {
    cands.sort((a, b) => b.score - a.score);
    const best = cands[0] as Candidate;
    const pool = bot.level === 'easy' ? cands.slice(0, 3) : cands.filter((c) => c.score >= best.score * 0.95);
    cmds.push(bot.rng.pick(pool.length > 0 ? pool : [best]).cmd);
  }

  // 3) Normal bots grow and use Deadline when a big push is on the way.
  if (bot.level === 'normal') {
    const safe = mine.filter((t) => !threatened.has(t.id) && t.level < 3);
    for (const t of safe) {
      const cost = world.config.upgradeCost[t.level - 1] as number;
      if (avail(t.id) >= cost + 12 && bot.rng.int(4) === 0) {
        cmds.push({ t: 'upgrade', player: me, tower: t.id });
        break;
      }
    }
    const pushing = s.squads
      .filter((q) => q.owner === me && s.towers[q.to]?.owner !== me)
      .reduce((a, q) => a + q.count, 0);
    if (ready('deadline') && pushing >= 12) cmds.push({ t: 'skill', player: me, skill: 'deadline' });
  }
  return cmds;
}
