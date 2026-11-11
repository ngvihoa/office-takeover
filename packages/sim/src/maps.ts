import office01 from '../maps/office-01.json';
import office02 from '../maps/office-02.json';
import tutorial01 from '../maps/tutorial-01.json';
import tutorial02 from '../maps/tutorial-02.json';
import { deriveSeed, Rng } from './rng';
import type { MapDef, PlayerId } from './types';

/** Bundled maps. JSON imports widen tuples to arrays, so they are asserted here once (buildWorld validates the graph). */
export const MAPS: Record<string, MapDef> = {
  'office-01': office01 as unknown as MapDef,
  'office-02': office02 as unknown as MapDef,
  'tutorial-01': tutorial01 as unknown as MapDef,
  'tutorial-02': tutorial02 as unknown as MapDef,
};

/**
 * Seat order for a match, derived from its seed: `order[k]` is the player who starts in the room the map file
 * assigns to seat k. Shuffling start rooms is fair only because maps are 4-way symmetric (tested in rules.test).
 */
export function seatOrder(seed: number): PlayerId[] {
  const order: PlayerId[] = [0, 1, 2, 3];
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
