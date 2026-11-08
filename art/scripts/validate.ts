import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PNG } from 'pngjs';
import { DERIVED, PALETTE, TEAM_IDS } from '../../packages/design/src/tokens';
import { sources } from '../src/manifest';
import { type FrameSpec, hexAt, OUT, PLACEHOLDERS, ROOT, readJson, readPng } from './lib';

const palette = readFileSync(resolve(ROOT, 'art/palette.hex'), 'utf8');
const sections = palette.split('[derived]');
const colors = (section: string) => section.replace(/#.*$/gm, '').match(/\b[0-9a-f]{6}\b/g) ?? [];
const base = new Set(colors(sections[0] ?? ''));
const derived = new Set(colors(sections[1] ?? ''));
if (JSON.stringify([...base]) !== JSON.stringify(PALETTE.map((c) => c.slice(1))))
  throw new Error('Palette/token drift');
if (JSON.stringify([...derived]) !== JSON.stringify(DERIVED.map((c) => c.slice(1))))
  throw new Error('Derived/token drift');

export function expectedSpecs(mode: 'source' | 'output'): FrameSpec[] {
  return sources.flatMap(({ draw: _, ...spec }) => {
    if (mode === 'source') return [spec];
    return (spec.team ? TEAM_IDS : [undefined]).map((t) => ({
      ...spec,
      name: t ? (spec.name.includes('{team}') ? spec.name.replace('{team}', t) : `${spec.name}_${t}`) : spec.name,
      team: false,
    }));
  });
}

export function validateImage(png: PNG, spec: FrameSpec, mode: 'source' | 'output'): void {
  const fail = (message: string): never => {
    throw new Error(`${spec.name}: ${message}`);
  };
  if (png.width !== spec.width || png.height !== spec.height) fail(`wrong dimensions ${png.width}x${png.height}`);
  let opaque = 0;
  const placeholders = new Set<string>();
  const edges = [false, false, false, false];
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      const alpha = png.data[i + 3];
      if (alpha !== 0 && alpha !== 255) fail(`partial alpha ${alpha} at ${x},${y}`);
      if (!alpha) continue;
      opaque++;
      const hex = hexAt(png, i);
      if (PLACEHOLDERS.some((c) => c === hex)) {
        if (mode !== 'source' || !spec.team) fail('forbidden team placeholder');
        placeholders.add(hex);
      } else if (!base.has(hex) && !(spec.derived && derived.has(hex))) {
        fail(`off-palette color ${hex} at ${x},${y}`);
      }
      if (x === 0) edges[0] = true;
      if (x === png.width - 1) edges[1] = true;
      if (y === 0) edges[2] = true;
      if (y === png.height - 1) edges[3] = true;
    }
  }
  if (mode === 'source' && spec.team && !placeholders.size) fail('missing team placeholders');
  if (spec.name.startsWith('person_') && mode === 'source' && placeholders.size !== 3) {
    fail('person requires all three team placeholders');
  }
  if (!opaque && !spec.canvas?.blank) fail('empty sprite without blank glyph permission');
  if (edges.some((edge) => !edge) && !spec.canvas) fail('unapproved empty border');
  if (spec.canvas) {
    const { pivot, reason } = spec.canvas;
    if (
      !reason.trim() ||
      !pivot.every(Number.isInteger) ||
      pivot[0] < 0 ||
      pivot[0] > png.width ||
      pivot[1] < 0 ||
      pivot[1] > png.height
    ) {
      fail('invalid canvas exemption');
    }
  }
  if (
    spec.hotspot &&
    !spec.hotspot.every((n, i) => Number.isInteger(n) && n >= 0 && n < (i ? png.height : png.width))
  ) {
    fail('invalid cursor hotspot');
  }
  if (spec.nineSlice) {
    const { left, right, top, bottom } = spec.nineSlice;
    if (
      ![left, right, top, bottom].every((n) => Number.isInteger(n) && n > 0) ||
      left + right >= png.width ||
      top + bottom >= png.height
    ) {
      fail('invalid nine-slice margins');
    }
  }
}

export function validateDirectory(
  mode: 'source' | 'output',
  directory = resolve(OUT, mode === 'source' ? 'source' : 'sprites'),
): void {
  const specs = expectedSpecs(mode);
  const manifest = readJson<FrameSpec[]>(resolve(directory, 'manifest.json'));
  if (JSON.stringify(manifest) !== JSON.stringify(specs))
    throw new Error(`${mode}: manifest does not match source contracts`);
  const names = specs.map((spec) => `${spec.name}.png`).sort();
  if (
    JSON.stringify(
      readdirSync(directory)
        .filter((file) => file.endsWith('.png'))
        .sort(),
    ) !== JSON.stringify(names)
  ) {
    throw new Error(`${mode}: missing or unexpected PNG files`);
  }
  for (const spec of specs) validateImage(readPng(resolve(directory, `${spec.name}.png`)), spec, mode);
  console.log(
    `Validated ${specs.length} ${mode} sprites: alpha, palette, dimensions, placeholders, borders, metadata.`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  if (mode !== 'source' && mode !== 'output')
    throw new Error('Usage: tsx art/scripts/validate.ts source|output [directory]');
  validateDirectory(mode, process.argv[3] ? resolve(process.argv[3]) : undefined);
}
