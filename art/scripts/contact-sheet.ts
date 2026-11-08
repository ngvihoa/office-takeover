import { resolve } from 'node:path';
import { primitive as p } from '../../packages/design/src/tokens';
import { LABEL_FONT } from '../src/label-font';
import { blit, type FrameSpec, OUT, Raster, readJson, readPng, writePng } from './lib';

const specs = readJson<FrameSpec[]>(resolve(OUT, 'sprites/manifest.json')).sort((a, b) =>
  a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
);
const cellWidth = 240;
const cellHeight = 94;
const columns = 4;
const sheet = new Raster(columns * cellWidth, Math.ceil(specs.length / columns) * cellHeight + 26);
sheet.rect(0, 0, sheet.png.width, sheet.png.height, p.gray100);
function label(x: number, y: number, text: string, scale = 1): void {
  for (const ch of text.toUpperCase()) {
    const bits = LABEL_FONT[ch];
    if (!bits) throw new Error(`Missing contact-sheet glyph: ${ch}`);
    [...bits].forEach((bit, i) => {
      if (bit === '1') sheet.rect(x + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale, p.ink);
    });
    x += 4 * scale;
  }
}
label(8, 8, `OFFICE TAKEOVER - ${specs.length} FRAMES - 2X PREVIEW`, 2);
specs.forEach((spec, i) => {
  const x = (i % columns) * cellWidth;
  const y = Math.floor(i / columns) * cellHeight + 26;
  sheet.rect(x + 1, y + 1, cellWidth - 2, cellHeight - 2, p.sand);
  // Checkerboard makes alpha and accidental margins visible; never blends sprite pixels.
  for (let yy = 0; yy < 60; yy += 4) {
    for (let xx = 0; xx < cellWidth - 16; xx += 4) {
      sheet.rect(x + 8 + xx, y + 8 + yy, 4, 4, (xx + yy) % 8 ? p.gray100 : p.white);
    }
  }
  // White runtime glyphs disappear against the light checker at this tiny scale.
  if (spec.glyph) sheet.rect(x + 10, y + 8, spec.width * 2 + 4, spec.height * 2 + 4, p.ink);
  blit(sheet.png, readPng(resolve(OUT, 'sprites', `${spec.name}.png`)), x + 12, y + 10, 2);
  label(x + 8, y + 73, spec.name, 2);
  label(x + 8, y + 86, `${spec.width}X${spec.height}`, 1);
});
writePng(resolve(OUT, 'contact-sheet.png'), sheet.png);
console.log(
  `Contact sheet: art/out/contact-sheet.png (${sheet.png.width}x${sheet.png.height}, ${specs.length} labeled frames).`,
);
