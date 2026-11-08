import { type IconName, iconPixels } from '../icons';
import { primitive as p } from '../tokens';

/**
 * Minimal drawing surface in logical pixels. Implemented by a Canvas2D adapter (dev/ui) and later by Phaser.
 * Paint routines only ever call these methods, so they render identically everywhere.
 */
export interface Painter {
  rect(x: number, y: number, w: number, h: number, color: string): void;
  /** Optional atlas fast path. Return false when the surface has no matching frame. */
  sprite?(name: string, x: number, y: number, tint?: string): boolean;
  /** Static text (VT323). Numbers that change every frame should use `digits` instead. */
  text(
    x: number,
    y: number,
    str: string,
    opts: { size: number; color: string; align?: 'left' | 'center' | 'right' },
  ): void;
}

export function outline(g: Painter, x: number, y: number, w: number, h: number, color: string, t = 1): void {
  g.rect(x, y, w, t, color);
  g.rect(x, y + h - t, w, t, color);
  g.rect(x, y + t, t, h - 2 * t, color);
  g.rect(x + w - t, y + t, t, h - 2 * t, color);
}

/** Dashed outline; `phase` shifts the dashes to animate "marching ants". */
export function dashedOutline(g: Painter, x: number, y: number, w: number, h: number, color: string, phase = 0): void {
  const on = (i: number) => (i + phase) % 4 < 2;
  for (let i = 0; i < w; i++) {
    if (on(i)) g.rect(x + i, y, 1, 1, color);
    if (on(w + h + (w - 1 - i))) g.rect(x + i, y + h - 1, 1, 1, color);
  }
  for (let j = 1; j < h - 1; j++) {
    if (on(w + j)) g.rect(x + w - 1, y + j, 1, 1, color);
    if (on(2 * w + h + (h - 1 - j))) g.rect(x, y + j, 1, 1, color);
  }
}

/** Checkerboard dither: stands in for a 50% transparent overlay without breaking the no-alpha rule. */
export function dither(g: Painter, x: number, y: number, w: number, h: number, color: string): void {
  for (let j = 0; j < h; j++) for (let i = j % 2; i < w; i += 2) g.rect(x + i, y + j, 1, 1, color);
}

/** Box with 1px ink border and notched (pixel-rounded) corners. */
export function notchedBox(
  g: Painter,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  border: string = p.ink,
): void {
  g.rect(x + 1, y, w - 2, h, border);
  g.rect(x, y + 1, w, h - 2, border);
  g.rect(x + 1, y + 1, w - 2, h - 2, fill);
}

export function icon(g: Painter, name: IconName, x: number, y: number, tint?: string): void {
  if (g.sprite?.(`icon_${name}`, x, y, tint)) return;
  for (const px of iconPixels(name, tint)) g.rect(x + px.x, y + px.y, 1, 1, px.color);
}

// 5x7 digits font for numbers that change constantly (troop counts, timers).
const GLYPHS: Record<string, readonly string[]> = {
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['..##.', '.#...', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '.#...', '.#...', '.#...'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '...#.', '.##..'],
  ':': ['.', '#', '#', '.', '#', '#', '.'],
  '%': ['##..#', '##..#', '...#.', '..#..', '.#...', '#..##', '#..##'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  s: ['.....', '.....', '.####', '#....', '.###.', '....#', '####.'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
};

export const DIGIT_HEIGHT = 7;

export function digitsWidth(str: string): number {
  let w = 0;
  for (const ch of str) w += (GLYPHS[ch]?.[0]?.length ?? 5) + 1;
  return Math.max(0, w - 1);
}

/** Draw a string with the 5x7 digits font. `x` is the left edge unless `align` says otherwise. */
export function digits(
  g: Painter,
  x: number,
  y: number,
  str: string,
  color: string,
  align: 'left' | 'center' | 'right' = 'left',
): void {
  const w = digitsWidth(str);
  let cx = align === 'center' ? x - Math.floor(w / 2) : align === 'right' ? x - w : x;
  for (const ch of str) {
    const glyph = GLYPHS[ch] ?? GLYPHS['?'] ?? [];
    if (!g.sprite?.(`digit_${ch.codePointAt(0)}`, cx, y, color)) {
      glyph.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) if (row[i] === '#') g.rect(cx + i, y + j, 1, 1, color);
      });
    }
    cx += (glyph[0]?.length ?? 5) + 1;
  }
}
