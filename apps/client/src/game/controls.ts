import { SEND_PCTS, type SendPct } from '@ot/sim';

/** Phaser input uses physical canvas coordinates; the game uses logical pixels. */
export function logicalPoint(x: number, y: number, scale: number) {
  return { x: x / scale, y: y / scale };
}

export function wheelRatio(current: SendPct, deltaY: number): SendPct {
  const index = SEND_PCTS.indexOf(current) + Math.sign(deltaY);
  return SEND_PCTS[Math.max(0, Math.min(SEND_PCTS.length - 1, index))] as SendPct;
}

/** Entropy belongs to the browser host, never the deterministic simulation. */
export function newMatchSeed(previous?: number): number {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0] as number;
  return seed === previous ? (seed + 1) >>> 0 : seed;
}
