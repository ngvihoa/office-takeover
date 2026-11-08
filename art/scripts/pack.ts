import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { blit, type FrameSpec, OUT, PUBLIC, readJson, readPng, writeJson, writePng } from './lib';
import { validateDirectory, validateImage } from './validate';

validateDirectory('output');
const specs = readJson<FrameSpec[]>(resolve(OUT, 'sprites/manifest.json')).sort((a, b) =>
  a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
);
const width = 512;
const padding = 2; // one extruded pixel, then one transparent pixel on every edge
let x = 0;
let y = 0;
let shelf = 0;
const placements = specs.map((spec) => {
  if (spec.width + padding * 2 > width) throw new Error(`Frame too wide: ${spec.name}`);
  if (x + spec.width + padding * 2 > width) {
    x = 0;
    y += shelf;
    shelf = 0;
  }
  const placement = { spec, x: x + padding, y: y + padding };
  x += spec.width + padding * 2;
  shelf = Math.max(shelf, spec.height + padding * 2);
  return placement;
});
const height = 2 ** Math.ceil(Math.log2(y + shelf));
const atlas = new PNG({ width, height });
const frames: Record<string, unknown> = {};
for (const { spec, x, y } of placements) {
  const png = readPng(resolve(OUT, 'sprites', `${spec.name}.png`));
  blit(atlas, png, x, y);
  // Extrude source edge pixels; do not fill transparent source corners.
  for (let dy = -1; dy <= png.height; dy++) {
    for (let dx = -1; dx <= png.width; dx++) {
      if (dx >= 0 && dx < png.width && dy >= 0 && dy < png.height) continue;
      const sx = Math.max(0, Math.min(png.width - 1, dx));
      const sy = Math.max(0, Math.min(png.height - 1, dy));
      const si = (sy * png.width + sx) * 4;
      const ti = ((y + dy) * width + x + dx) * 4;
      png.data.copy(atlas.data, ti, si, si + 4);
    }
  }
  frames[spec.name] = {
    frame: { x, y, w: spec.width, h: spec.height },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: spec.width, h: spec.height },
    sourceSize: { w: spec.width, h: spec.height },
  };
  // Verify the exact packed bytes, not just the source files.
  const extracted = new PNG({ width: spec.width, height: spec.height });
  for (let row = 0; row < spec.height; row++) {
    const start = ((y + row) * width + x) * 4;
    atlas.data.copy(extracted.data, row * spec.width * 4, start, start + spec.width * 4);
  }
  if (!extracted.data.equals(png.data)) throw new Error(`Atlas pixel mismatch: ${spec.name}`);
  validateImage(extracted, spec, 'output');
}
writePng(resolve(OUT, 'atlas.png'), atlas);
writeJson(resolve(OUT, 'atlas.json'), {
  frames,
  meta: {
    app: 'Office Takeover deterministic shelf packer',
    version: '1',
    image: 'atlas.png',
    format: 'RGBA8888',
    size: { w: width, h: height },
    scale: '1',
  },
});
writeJson(resolve(OUT, 'manifest.json'), { version: 1, atlas: 'atlas.json', frames: specs });

// BMFont XML can use the same PNG as the texture atlas. No browser/system font involved.
const chars = placements.filter(({ spec }) => spec.glyph);
const xml = `<?xml version="1.0"?>
<font><info face="Office Digits" size="7"/><common lineHeight="8" base="7" scaleW="${width}" scaleH="${height}" pages="1"/><pages><page id="0" file="atlas.png"/></pages><chars count="${chars.length}">
${chars.map(({ spec, x, y }) => `<char id="${spec.glyph?.codepoint}" x="${x}" y="${y}" width="${spec.width}" height="${spec.height}" xoffset="0" yoffset="0" xadvance="${spec.glyph?.xAdvance}" page="0" chnl="15"/>`).join('\n')}
</chars></font>\n`;
const { writeFileSync } = await import('node:fs');
writeFileSync(resolve(OUT, 'digits.xml'), xml);
mkdirSync(PUBLIC, { recursive: true });
for (const file of ['atlas.png', 'atlas.json', 'manifest.json', 'digits.xml'])
  copyFileSync(resolve(OUT, file), resolve(PUBLIC, file));
console.log(
  `Packed ${specs.length} unrotated frames into ${width}x${height}; 1px extrusion + 1px transparent padding. Copied runtime files to apps/client/public/art.`,
);
