import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import type { Painter } from '../../packages/design/src/paint/painter';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const OUT = resolve(ROOT, 'art/out');
export const PUBLIC = resolve(ROOT, 'apps/client/public/art');
export const PLACEHOLDERS: readonly string[] = ['ff00ff', 'ff80ff', '800080'];

export interface FrameSpec {
  name: string;
  width: number;
  height: number;
  team?: boolean;
  derived?: boolean;
  /** Original pure painter's (x,y) inside this sprite; place image at x-origin[0], y-origin[1]. */
  painterOrigin?: [number, number];
  /** Explicit fixed canvas exemption; never implicitly trim an asset. */
  canvas?: { reason: string; pivot: [number, number]; blank?: boolean };
  hotspot?: [number, number];
  nineSlice?: { left: number; right: number; top: number; bottom: number };
  animation?: { direction: string; frame: number; fps: number };
  glyph?: { codepoint: number; xAdvance: number };
}

export class Raster implements Painter {
  png: PNG;
  constructor(width: number, height: number) {
    this.png = new PNG({ width, height });
  }
  rect(x: number, y: number, w: number, h: number, color: string): void {
    if (![x, y, w, h].every(Number.isInteger) || w < 0 || h < 0) throw new Error('Non-integer rectangle');
    if (x < 0 || y < 0 || x + w > this.png.width || y + h > this.png.height) {
      throw new Error(`Rectangle outside ${this.png.width}x${this.png.height}: ${x},${y},${w},${h}`);
    }
    const rgb = Number.parseInt(color.replace('#', ''), 16);
    if (!/^#?[0-9a-f]{6}$/i.test(color)) throw new Error(`Invalid color ${color}`);
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const i = (yy * this.png.width + xx) * 4;
        this.png.data.set([rgb >> 16, (rgb >> 8) & 255, rgb & 255, 255], i);
      }
    }
  }
  text(): never {
    throw new Error('Static text is not an asset: use bitmap glyphs, never rasterize a runtime font');
  }
}

export function hexAt(png: PNG, i: number): string {
  return png.data.subarray(i, i + 3).toString('hex');
}

export function setHex(png: PNG, i: number, hex: string): void {
  png.data.set(Buffer.from(hex.replace('#', ''), 'hex'), i);
}

export function writePng(path: string, png: PNG): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, PNG.sync.write(png, { colorType: 6, filterType: 0 }));
}

export function readPng(path: string): PNG {
  return PNG.sync.read(readFileSync(path));
}

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function blit(target: PNG, source: PNG, x: number, y: number, scale = 1): void {
  for (let sy = 0; sy < source.height; sy++) {
    for (let sx = 0; sx < source.width; sx++) {
      const si = (sy * source.width + sx) * 4;
      if (source.data[si + 3] === 0) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const ti = ((y + sy * scale + dy) * target.width + x + sx * scale + dx) * 4;
          source.data.copy(target.data, ti, si, si + 4);
        }
      }
    }
  }
}
