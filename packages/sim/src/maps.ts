import duel01 from '../maps/duel-01.json';
import office01 from '../maps/office-01.json';
import office02 from '../maps/office-02.json';
import office03 from '../maps/office-03.json';
import office04 from '../maps/office-04.json';
import trio01 from '../maps/trio-01.json';
import tutorial01 from '../maps/tutorial-01.json';
import tutorial02 from '../maps/tutorial-02.json';
import { deriveSeed, Rng } from './rng';
import type { MapDef, PlayerId } from './types';

/** Bundled maps. JSON imports widen tuples to arrays, so they are asserted here once (buildWorld validates the graph). */
export const MAPS: Record<string, MapDef> = {
  'office-01': office01 as unknown as MapDef,
  'office-02': office02 as unknown as MapDef,
  'office-03': office03 as unknown as MapDef,
  'office-04': office04 as unknown as MapDef,
  'duel-01': duel01 as unknown as MapDef,
  'trio-01': trio01 as unknown as MapDef,
  'tutorial-01': tutorial01 as unknown as MapDef,
  'tutorial-02': tutorial02 as unknown as MapDef,
};

/** Returns the set of starting seats defined in the map, sorted ascending. */
export function mapSeats(map: MapDef): PlayerId[] {
  const seats = new Set<PlayerId>();
  for (const t of map.towers) {
    if (t.seat !== null) seats.add(t.seat);
  }
  return Array.from(seats).sort((a, b) => a - b);
}

/**
 * Seat order for a match, derived from its seed: `order[k]` is the player who starts in the room the map file
 * assigns to seat k. Shuffling start rooms is fair because maps have symmetric distances across starting seats.
 */
export function seatOrder(seed: number, seatCount = 4): PlayerId[] {
  const count = Math.min(4, Math.max(2, seatCount));
  const order: PlayerId[] = ([0, 1, 2, 3] as PlayerId[]).slice(0, count);
  const rng = new Rng(deriveSeed(seed, 7));
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [order[i], order[j]] = [order[j] as PlayerId, order[i] as PlayerId];
  }
  return order;
}

/** Copy of `map` with start rooms reassigned by `order` (see `seatOrder`). Colours and player ids are unchanged. */
export function withSeatOrder(map: MapDef, order: readonly PlayerId[]): MapDef {
  return {
    ...map,
    towers: map.towers.map((t) => ({ ...t, seat: t.seat === null ? null : (order[t.seat] ?? t.seat) })),
  };
}
