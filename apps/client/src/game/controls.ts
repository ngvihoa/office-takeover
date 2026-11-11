import { SEND_PCTS, type SendPct } from '@ot/sim';

/** Phaser input uses physical canvas coordinates; the game uses logical pixels. */
export function logicalPoint(x: number, y: number, scale: number) {
  return { x: x / scale, y: y / scale };
}

export function wheelRatio(current: SendPct, deltaY: number): SendPct {
  const index = SEND_PCTS.indexOf(current) + Math.sign(deltaY);
  return SEND_PCTS[Math.max(0, Math.min(SEND_PCTS.length - 1, index))] as SendPct;
}

export type Rect = readonly [x: number, y: number, w: number, h: number];

export function boxFromPoints(x1: number, y1: number, x2: number, y2: number): Rect {
  const x = Math.min(x1, x2);
  const y = Math.min(y1, y2);
  const w = Math.abs(x2 - x1);
  const h = Math.abs(y2 - y1);
  return [x, y, w, h];
}

export function boxIntersects(a: Rect, b: Rect): boolean {
  return a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
}

/** Entropy belongs to the browser host, never the deterministic simulation. */
export function newMatchSeed(previous?: number): number {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0] as number;
  return seed === previous ? (seed + 1) >>> 0 : seed;
}
