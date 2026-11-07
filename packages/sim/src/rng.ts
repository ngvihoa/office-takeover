/** mulberry32: tiny seeded PRNG. State is a uint32 so it can live inside GameState and be hashed. */
export class Rng {
  constructor(public state: number) {
    this.state = state >>> 0;
  }

  /** Next uint32. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  /** Integer in [0, n). */
  int(n: number): number {
    return this.next() % n;
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(items.length)] as T;
  }
}

/** Derive a sub-seed (e.g. per bot) from a match seed without correlating streams. */
export function deriveSeed(seed: number, salt: number): number {
  let h = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
