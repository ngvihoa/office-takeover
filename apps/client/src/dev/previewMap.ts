import type { RoomView, TeamId } from '@ot/design';

// Preview layout of office-01 (matches research/map-style-sketches.html, direction 1). Real map data will live in
// packages/sim/maps once the sim exists; this copy only feeds /dev/ui.
export const PREVIEW_ROOMS: RoomView[] = [
  { name: 'TEAM DEV', rect: [16, 28, 120, 86], doors: 'b', team: 'p1', troops: 22, dept: 'dev', level: 2 },
  { name: 'KẾ TOÁN', rect: [150, 28, 100, 86], doors: 'b', team: 'neutral', troops: 5, dept: 'acc' },
  { name: 'PANTRY', rect: [264, 28, 112, 86], doors: 'b', team: 'p2', troops: 18, dept: 'pantry' },
  { name: 'MARKETING', rect: [390, 28, 100, 86], doors: 'b', team: 'p2', troops: 7, dept: 'mkt' },
  { name: 'TEAM DESIGN', rect: [504, 28, 120, 86], doors: 'b', team: 'p2', troops: 12, dept: 'design', level: 2 },
  { name: 'HỌP A', rect: [60, 142, 116, 78], doors: 'lr', team: 'p1', troops: 14, dept: 'meet' },
  { name: 'PHÒNG SẾP', rect: [248, 136, 144, 90], doors: 'tb', team: 'neutral', troops: 40, dept: 'boss' },
  { name: 'HỌP B', rect: [464, 142, 116, 78], doors: 'lr', team: 'p3', troops: 8, dept: 'meet' },
  { name: 'TEAM SALES', rect: [16, 248, 120, 86], doors: 't', team: 'p3', troops: 11, dept: 'sales' },
  { name: 'HR', rect: [150, 248, 100, 86], doors: 't', team: 'p1', troops: 6, dept: 'hr' },
  { name: 'SERVER', rect: [264, 248, 112, 86], doors: 't', team: 'neutral', troops: 10, dept: 'server' },
  { name: 'QA', rect: [390, 248, 100, 86], doors: 't', team: 'neutral', troops: 5, dept: 'qa' },
  { name: 'TEAM DATA', rect: [504, 248, 120, 86], doors: 't', team: 'p4', troops: 3, dept: 'data' },
];

export interface PreviewSquad {
  path: [number, number][];
  t: number;
  team: TeamId;
  n: number;
}

export const PREVIEW_SQUADS: PreviewSquad[] = [
  {
    path: [
      [76, 116],
      [76, 125],
      [320, 125],
      [320, 116],
    ],
    t: 0.62,
    team: 'p1',
    n: 11,
  },
  {
    path: [
      [564, 116],
      [564, 125],
      [320, 125],
      [320, 134],
    ],
    t: 0.55,
    team: 'p2',
    n: 9,
  },
  {
    path: [
      [582, 181],
      [600, 181],
      [600, 237],
      [564, 237],
      [564, 246],
    ],
    t: 0.45,
    team: 'p3',
    n: 6,
  },
];

export const PREVIEW_PLANTS: [number, number][] = [
  [200, 192],
  [430, 192],
  [26, 124],
  [604, 124],
];

/** Point at fraction t along an axis-aligned polyline. */
export function along(path: [number, number][], t: number): [number, number] {
  const lens = path
    .slice(1)
    .map(
      (p, i) => Math.abs(p[0] - (path[i] as [number, number])[0]) + Math.abs(p[1] - (path[i] as [number, number])[1]),
    );
  let rest = lens.reduce((a, b) => a + b, 0) * t;
  for (let i = 0; i < lens.length; i++) {
    const len = lens[i] as number;
    if (rest <= len) {
      const [ax, ay] = path[i] as [number, number];
      const [bx, by] = path[i + 1] as [number, number];
      const k = len === 0 ? 0 : rest / len;
      return [Math.round(ax + (bx - ax) * k), Math.round(ay + (by - ay) * k)];
    }
    rest -= len;
  }
  return path[path.length - 1] as [number, number];
}
