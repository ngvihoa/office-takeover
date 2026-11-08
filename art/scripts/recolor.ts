import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { TEAM_IDS, team } from '../../packages/design/src/tokens';
import { type FrameSpec, hexAt, OUT, PLACEHOLDERS, readJson, readPng, setHex, writeJson, writePng } from './lib';
import { validateDirectory } from './validate';

validateDirectory('source');
const sources = readJson<FrameSpec[]>(resolve(OUT, 'source/manifest.json'));
const output: FrameSpec[] = [];
rmSync(resolve(OUT, 'sprites'), { recursive: true, force: true });
for (const spec of sources) {
  for (const t of spec.team ? TEAM_IDS : [undefined]) {
    const png = readPng(resolve(OUT, 'source', `${spec.name}.png`));
    const name = t ? (spec.name.includes('{team}') ? spec.name.replace('{team}', t) : `${spec.name}_${t}`) : spec.name;
    if (t) {
      const colors = [team[t].main, team[t].light, team[t].dark];
      for (let i = 0; i < png.data.length; i += 4) {
        const channel = PLACEHOLDERS.indexOf(hexAt(png, i));
        const color = colors[channel];
        if (color) setHex(png, i, color);
      }
    }
    output.push({ ...spec, name, team: false });
    writePng(resolve(OUT, 'sprites', `${name}.png`), png);
  }
}
writeJson(resolve(OUT, 'sprites/manifest.json'), output);
console.log(`Recolored ${sources.length} sources into ${output.length} runtime sprites (5 teams).`);
