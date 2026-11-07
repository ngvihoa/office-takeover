import type { GameState } from './types';

/** FNV-1a over every integer that matters for the simulation. Used to detect desyncs. */
export function hashState(s: GameState): number {
  let h = 0x811c9dc5;
  const mix = (n: number) => {
    h ^= n | 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  };
  mix(s.tick);
  mix(s.nextSquadId);
  for (const t of s.towers) {
    mix(t.id);
    mix(t.owner ?? -1);
    mix(t.troops);
    mix(t.level);
    mix(t.prodTimer);
  }
  mix(s.squads.length);
  for (const q of s.squads) {
    mix(q.id);
    mix(q.owner);
    mix(q.count);
    mix(q.from);
    mix(q.to);
    mix(q.traveled);
  }
  for (const p of s.players) {
    mix(p.active ? 1 : 0);
    mix(p.eliminatedAt ?? -1);
    mix(p.skillReadyAt.deadline);
    mix(p.skillReadyAt.coffee);
    mix(p.deadlineUntil);
  }
  return h >>> 0;
}
