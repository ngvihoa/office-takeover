import { color, map as m, primitive as p, type TeamId, team } from '../tokens';
import { countPlate, type PlateState } from './hud';
import { dashedOutline, digits, outline, type Painter } from './painter';

export type Dept =
  | 'dev'
  | 'design'
  | 'sales'
  | 'data'
  | 'acc'
  | 'mkt'
  | 'hr'
  | 'qa'
  | 'pantry'
  | 'meet'
  | 'boss'
  | 'server';

export interface RoomView {
  name: string;
  rect: readonly [number, number, number, number];
  /** Door sides: any of 't' | 'b' | 'l' | 'r'. */
  doors: string;
  team: TeamId;
  troops: number;
  dept: Dept;
  level?: number;
}

export interface RoomState extends PlateState {
  hoverOwn?: boolean;
  selected?: boolean;
  /** Marching-ants phase for the selection outline. */
  phase?: number;
  validTarget?: boolean;
  justLost?: boolean;
}

export const WALL_FACE = 12;
export const DOOR = 18;
const R = (g: Painter, x: number, y: number, w: number, h: number, c: string) => g.rect(x, y, w, h, c);

// ---------------- furniture (top-down 3/4) ----------------
type DeskKind = 'pc' | 'phone' | 'tablet' | 'chart' | 'paper';

function chair(g: Painter, x: number, y: number, t: TeamId) {
  R(g, x, y, 8, 6, p.ink);
  R(g, x + 1, y + 1, 6, 4, team[t].main);
  R(g, x + 1, y + 1, 6, 1, team[t].light);
}

export function desk(g: Painter, x: number, y: number, t: TeamId, kind: DeskKind = 'pc') {
  R(g, x - 1, y - 1, 20, 11, p.ink);
  R(g, x, y, 18, 9, p.wood);
  R(g, x, y, 18, 2, p.tan);
  R(g, x + 5, y + 1, 8, 3, p.gray700);
  R(g, x + 6, y + 2, 6, 1, kind === 'chart' ? p.green500 : p.cyan);
  if (kind === 'pc' || kind === 'chart') R(g, x + 6, y + 6, 6, 2, p.gray100);
  if (kind === 'phone') {
    R(g, x + 5, y + 6, 5, 2, p.gray100);
    R(g, x + 13, y + 5, 3, 3, p.red500);
  }
  if (kind === 'tablet') {
    R(g, x + 3, y + 5, 8, 3, p.gray500);
    R(g, x + 12, y + 5, 3, 1, p.magenta);
    R(g, x + 12, y + 7, 3, 1, p.amber);
  }
  if (kind === 'paper') {
    R(g, x + 3, y + 5, 5, 3, p.white);
    R(g, x + 10, y + 5, 4, 3, p.white);
  }
  chair(g, x + 5, y + 10, t);
}

export function cabinet(g: Painter, x: number, y: number) {
  R(g, x, y, 10, 16, p.ink);
  R(g, x + 1, y + 1, 8, 14, p.gray300);
  R(g, x + 1, y + 1, 8, 2, p.gray100);
  R(g, x + 1, y + 6, 8, 1, p.ink);
  R(g, x + 1, y + 11, 8, 1, p.ink);
  for (const dy of [4, 8, 13]) R(g, x + 4, y + dy, 2, 1, p.gray100);
}

export function plant(g: Painter, x: number, y: number) {
  R(g, x + 2, y + 7, 7, 5, p.ink);
  R(g, x + 3, y + 8, 5, 3, p.wood);
  R(g, x + 1, y, 9, 8, p.green900);
  R(g, x, y + 1, 11, 6, p.green900);
  R(g, x + 1, y + 1, 8, 5, p.green700);
  R(g, x + 2, y + 1, 3, 2, p.green500);
  R(g, x + 6, y + 3, 2, 2, p.green500);
}

export function rack(g: Painter, x: number, y: number) {
  R(g, x, y, 12, 20, p.ink);
  R(g, x + 1, y + 1, 10, 18, p.gray700);
  for (let i = 0; i < 4; i++) {
    R(g, x + 2, y + 2 + i * 4, 8, 3, p.slate);
    R(g, x + 3, y + 3 + i * 4, 3, 1, p.gray500);
    R(g, x + 8, y + 3 + i * 4, 1, 1, i % 2 ? p.green500 : p.cyan);
  }
}

export function meetingTable(g: Painter, x: number, y: number, w: number, h: number, t: TeamId) {
  for (let cx = x + 3; cx <= x + w - 9; cx += 10) {
    chair(g, cx, y - 7, t);
    chair(g, cx, y + h + 1, t);
  }
  R(g, x - 1, y - 1, w + 2, h + 2, p.ink);
  R(g, x, y, w, h, p.wood);
  R(g, x, y, w, 2, p.tan);
  R(g, x + 4, y + 4, 6, 3, p.white);
  R(g, x + w - 12, y + 4, 6, 3, p.white);
}

export function roundTable(g: Painter, x: number, y: number, t: TeamId) {
  chair(g, x - 9, y + 3, t);
  chair(g, x + 13, y + 3, t);
  R(g, x + 1, y - 1, 10, 14, p.ink);
  R(g, x - 1, y + 1, 14, 10, p.ink);
  R(g, x + 2, y, 8, 12, p.tan);
  R(g, x, y + 2, 12, 8, p.tan);
  R(g, x + 3, y + 3, 3, 2, p.white);
}

export function pantryCounter(g: Painter, x: number, y: number, w: number) {
  R(g, x - 1, y - 1, w + 2, 11, p.ink);
  R(g, x, y, w, 9, p.gray100);
  R(g, x, y, w, 2, p.white);
  // coffee machine
  R(g, x + 4, y - 3, 9, 10, p.ink);
  R(g, x + 5, y - 2, 7, 8, p.gray700);
  R(g, x + 7, y + 1, 3, 2, p.red500);
  // cup
  R(g, x + 16, y + 2, 4, 4, p.white);
  R(g, x + 17, y + 3, 2, 2, p.woodDark);
  // fridge
  R(g, x + w - 14, y - 5, 12, 15, p.ink);
  R(g, x + w - 13, y - 4, 10, 13, p.white);
  R(g, x + w - 13, y + 1, 10, 1, p.gray100);
  R(g, x + w - 5, y - 2, 1, 3, p.gray300);
}

export function sofa(g: Painter, x: number, y: number) {
  R(g, x - 1, y - 1, 26, 11, p.ink);
  R(g, x, y, 24, 9, p.plum);
  R(g, x, y, 24, 3, p.magenta);
  R(g, x + 2, y + 4, 9, 4, p.magenta);
  R(g, x + 13, y + 4, 9, 4, p.magenta);
}

export function bossDesk(g: Painter, x: number, y: number, t: TeamId) {
  R(g, x - 1, y - 1, 38, 14, p.ink);
  R(g, x, y, 36, 12, p.woodDark);
  R(g, x, y, 36, 2, p.wood);
  R(g, x + 27, y + 11, 10, 16, p.ink);
  R(g, x + 28, y + 12, 8, 14, p.woodDark);
  R(g, x + 5, y + 2, 10, 4, p.gray700);
  R(g, x + 6, y + 3, 8, 2, p.cyan);
  R(g, x + 19, y + 3, 5, 6, p.white);
  R(g, x + 30, y + 3, 3, 3, p.amber);
  R(g, x + 11, y + 14, 11, 9, p.ink);
  R(g, x + 12, y + 15, 9, 7, team[t].main);
  R(g, x + 12, y + 15, 9, 2, team[t].light);
}

export function rug(g: Painter, x: number, y: number, w: number, h: number) {
  R(g, x, y, w, h, p.red700);
  outline(g, x + 2, y + 2, w - 4, h - 4, p.amber);
}

export function bugBoard(g: Painter, x: number, y: number) {
  R(g, x - 1, y - 1, 22, 14, p.ink);
  R(g, x, y, 20, 12, p.white);
  R(g, x + 2, y + 2, 3, 3, p.red500);
  R(g, x + 8, y + 5, 3, 3, p.red500);
  R(g, x + 14, y + 2, 3, 3, p.green500);
  R(g, x + 3, y + 8, 4, 2, p.amber);
}

export function easel(g: Painter, x: number, y: number) {
  R(g, x - 1, y - 1, 16, 14, p.ink);
  R(g, x, y, 14, 12, p.white);
  R(g, x + 2, y + 2, 4, 4, p.magenta);
  R(g, x + 7, y + 2, 4, 4, p.blue);
  R(g, x + 2, y + 7, 4, 3, p.amber);
  R(g, x + 7, y + 7, 4, 3, p.green500);
}

/** Auto-layout furniture for a department inside a room (pure: depends only on rect + dept). */
function furnish(g: Painter, r: RoomView) {
  const [x, y, w] = r.rect;
  const t = r.team;
  const ix = x + 6;
  const iy = y + WALL_FACE + 6;
  const iw = w - 12;
  const grid = (kind: DeskKind, cols: number, rows: number, dx = 36, dy = 30) => {
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) desk(g, ix + 4 + i * dx, iy + 2 + j * dy, t, kind);
  };
  switch (r.dept) {
    case 'dev':
      grid('pc', 3, 2);
      break;
    case 'sales':
      grid('phone', 3, 2);
      break;
    case 'data':
      grid('chart', 3, 2);
      break;
    case 'design':
      grid('tablet', 2, 2, 40);
      easel(g, ix + iw - 18, iy + 2);
      plant(g, ix + iw - 14, iy + 38);
      break;
    case 'acc':
      cabinet(g, ix, iy);
      cabinet(g, ix + 12, iy);
      cabinet(g, ix + 24, iy);
      desk(g, ix + 44, iy + 2, t, 'paper');
      desk(g, ix + 66, iy + 2, t, 'paper');
      desk(g, ix + 44, iy + 32, t, 'paper');
      plant(g, ix + 2, iy + 42);
      break;
    case 'mkt':
      roundTable(g, ix + 38, iy + 10, t);
      desk(g, ix + 4, iy + 34, t, 'tablet');
      desk(g, ix + 66, iy + 34, t, 'pc');
      plant(g, ix + 2, iy + 2);
      plant(g, ix + iw - 12, iy + 2);
      break;
    case 'hr':
      desk(g, ix + 6, iy + 2, t, 'paper');
      desk(g, ix + 36, iy + 2, t, 'pc');
      cabinet(g, ix + iw - 12, iy);
      sofa(g, ix + 6, iy + 40);
      plant(g, ix + iw - 12, iy + 40);
      break;
    case 'qa':
      grid('pc', 2, 2, 40);
      bugBoard(g, ix + iw - 22, iy + 2);
      plant(g, ix + iw - 12, iy + 40);
      break;
    case 'pantry':
      pantryCounter(g, ix + 2, iy, iw - 4);
      roundTable(g, ix + 18, iy + 26, t);
      roundTable(g, ix + 66, iy + 26, t);
      plant(g, ix + iw - 12, iy + 44);
      break;
    case 'meet':
      meetingTable(g, ix + 14, iy + 18, iw - 28, 16, t);
      plant(g, ix, iy);
      plant(g, ix + iw - 11, iy);
      break;
    case 'boss':
      rug(g, ix + 10, iy + 2, iw - 20, 48);
      bossDesk(g, ix + 44, iy + 8, t);
      sofa(g, ix + 16, iy + 56);
      sofa(g, ix + iw - 40, iy + 56);
      plant(g, ix, iy);
      plant(g, ix + iw - 11, iy);
      break;
    case 'server':
      for (let j = 0; j < 2; j++) for (let i = 0; i < 5; i++) rack(g, ix + 6 + i * 19, iy + 2 + j * 28);
      break;
  }
}

/** Draw a department room: carpet → furniture → walls → door mats → name → count plate → interaction state. */
export function room(g: Painter, r: RoomView, s: RoomState = {}) {
  const [x, y, w, h] = r.rect;
  const tc = team[r.team];
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor((h + WALL_FACE) / 2);
  const has = (side: string) => r.doors.includes(side);

  // carpet (team-tinted, pre-computed color) with checker dots
  R(g, x, y, w, h, tc.carpet);
  for (let row = 0, yy = y + WALL_FACE + 2; yy < y + h - 4; row++, yy += 6) {
    for (let xx = x + 4 + (row % 2) * 3; xx < x + w - 4; xx += 6) R(g, xx, yy, 1, 1, m.carpetDot);
  }
  furnish(g, r);

  // top wall face (3/4 view)
  R(g, x, y, w, WALL_FACE, m.wallFace);
  R(g, x, y, w, 3, m.wall);
  R(g, x, y + 3, w, 1, m.wallFaceLight);
  R(g, x, y + WALL_FACE - 1, w, 1, m.wallFaceBase);
  if (has('t')) {
    R(g, cx - DOOR / 2, y, DOOR, WALL_FACE, m.corridor);
    R(g, cx - DOOR / 2, y + WALL_FACE - 3, DOOR, 3, tc.main);
  }
  // side walls
  for (const [sx, side] of [
    [x, 'l'],
    [x + w - 3, 'r'],
  ] as const) {
    if (has(side)) {
      R(g, sx, y, 3, cy - DOOR / 2 - y, m.wall);
      R(g, sx, cy + DOOR / 2, 3, y + h - cy - DOOR / 2, m.wall);
      R(g, sx, cy - DOOR / 2, 3, DOOR, tc.main);
    } else R(g, sx, y, 3, h, m.wall);
  }
  // bottom wall
  if (has('b')) {
    R(g, x, y + h - 3, cx - DOOR / 2 - x, 3, m.wall);
    R(g, cx + DOOR / 2, y + h - 3, x + w - cx - DOOR / 2, 3, m.wall);
    R(g, cx - DOOR / 2, y + h - 3, DOOR, 3, tc.main);
  } else R(g, x, y + h - 3, w, 3, m.wall);

  // name on the wall face + level stars
  const stars = r.level && r.level > 1 ? ` ${'*'.repeat(r.level - 1)}` : '';
  g.text(x + 6, y + 11, r.name + stars, { size: 9, color: p.ink });

  // interaction states (drawn before the plate so the plate stays on top)
  if (s.hoverOwn) outline(g, x + 3, y + WALL_FACE, w - 6, h - WALL_FACE - 3, p.white);
  if (s.selected) dashedOutline(g, x - 3, y - 3, w + 6, h + 6, tc.main, s.phase ?? 0);
  if (s.validTarget) outline(g, x - 2, y - 2, w + 4, h + 4, color.accent);
  if (s.justLost) {
    outline(g, x - 2, y - 2, w + 4, h + 4, color.danger);
    outline(g, x - 3, y - 3, w + 6, h + 6, color.danger);
  }
  countPlate(g, x + w - 4, y - 5, r.troops, r.team, s);
}

// ---------------- people ----------------
export function person(g: Painter, x: number, y: number, t: TeamId, frame = 0) {
  R(g, x, y, 5, 7, p.ink);
  R(g, x + 1, y + 1, 3, 2, p.hair);
  R(g, x + 1, y + 3, 3, 1, p.skin);
  R(g, x + 1, y + 4, 3, 2, team[t].main);
  if (frame === 1) R(g, x + 1, y + 6, 1, 1, p.ink);
}

/** A walking group of employees at (x, y), with the count box above. */
export function squad(g: Painter, x: number, y: number, t: TeamId, n: number, frame = 0) {
  const slots = [
    [-6, -4],
    [0, -5],
    [6, -4],
    [-3, 2],
    [3, 2],
    [0, 8],
  ] as const;
  const count = Math.min(slots.length, Math.max(3, Math.ceil(n / 3)));
  for (let i = 0; i < count; i++) {
    const [dx, dy] = slots[i] as readonly [number, number];
    person(g, x + dx - 2, y + dy - 3, t, (i + frame) % 2);
  }
  const label = String(n);
  const w = label.length * 6 + 5;
  R(g, x - Math.floor(w / 2), y - 19, w, 10, p.ink);
  digits(g, x, y - 18, label, p.white, 'center');
}

/** Dashed corridor path for a squad (polyline of axis-aligned segments). */
export function path(g: Painter, pts: readonly (readonly [number, number])[], t: TeamId) {
  const c = team[t].main;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1] as readonly [number, number];
    const [bx, by] = pts[i] as readonly [number, number];
    const len = Math.abs(bx - ax) + Math.abs(by - ay);
    const sx = Math.sign(bx - ax);
    const sy = Math.sign(by - ay);
    for (let k = 0; k < len; k++) if (k % 7 < 4) R(g, ax + sx * k, ay + sy * k, 2, 2, c);
  }
  const [ex, ey] = pts[pts.length - 1] as readonly [number, number];
  outline(g, ex - 3, ey - 3, 7, 7, c);
}

export function corridor(g: Painter, b = { x: 6, y: 20, w: 628, h: 320 }) {
  R(g, 0, 0, 640, 360, m.outside);
  R(g, b.x, b.y, b.w, b.h, m.corridor);
  for (let x = b.x; x < b.x + b.w; x += 16) R(g, x, b.y, 1, b.h, m.corridorLine);
  for (let y = b.y; y < b.y + b.h; y += 16) R(g, b.x, y, b.w, 1, m.corridorLine);
  R(g, b.x, b.y, b.w, 4, m.wall);
  R(g, b.x, b.y + b.h - 4, b.w, 4, m.wall);
  R(g, b.x, b.y, 4, b.h, m.wall);
  R(g, b.x + b.w - 4, b.y, 4, b.h, m.wall);
}
