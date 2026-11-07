import type { RoomView, TeamId } from '@ot/design';
import { buildWorld, MAPS, type MapDef } from '@ot/sim';

// /dev/ui preview built from the real office-01 map, with a hand-picked mid-game situation.
const world = buildWorld(MAPS['office-01'] as MapDef);

const OWNER: TeamId[] = [
  'p1',
  'neutral',
  'p2',
  'p2',
  'p2',
  'p1',
  'neutral',
  'p3',
  'p3',
  'p1',
  'neutral',
  'neutral',
  'p4',
];
const TROOPS = [22, 5, 18, 7, 12, 14, 40, 8, 11, 6, 12, 5, 3];
const LEVEL = [2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1];

export const PREVIEW_ROOMS: RoomView[] = world.map.towers.map((t) => ({
  name: t.name,
  rect: t.rect,
  doors: t.doors.map((d) => d.side).join(''),
  team: OWNER[t.id] ?? 'neutral',
  troops: TROOPS[t.id] ?? 0,
  dept: t.dept as RoomView['dept'],
  level: LEVEL[t.id],
}));

export interface PreviewSquad {
  path: [number, number][];
  t: number;
  team: TeamId;
  n: number;
}

const route = (from: number, to: number) => world.paths[from]?.[to]?.points ?? [];

export const PREVIEW_SQUADS: PreviewSquad[] = [
  { path: route(0, 2), t: 0.62, team: 'p1', n: 11 },
  { path: route(4, 6), t: 0.55, team: 'p2', n: 9 },
  { path: route(7, 12), t: 0.45, team: 'p3', n: 6 },
];

export const PREVIEW_PLANTS: [number, number][] = [
  [196, 168],
  [432, 168],
  [22, 150],
  [608, 150],
];

/** Point at fraction t along an axis-aligned polyline. */
export function along(path: [number, number][], t: number): [number, number] {
  const lens = path.slice(1).map((p, i) => {
    const prev = path[i] as [number, number];
    return Math.abs(p[0] - prev[0]) + Math.abs(p[1] - prev[1]);
  });
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
  return (path[path.length - 1] ?? [0, 0]) as [number, number];
}
