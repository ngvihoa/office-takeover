import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { team } from '../../packages/design/src/tokens';
import { sources } from '../src/manifest';
import { hexAt, OUT, PLACEHOLDERS, Raster, setHex, writeJson, writePng } from './lib';

rmSync(resolve(OUT, 'source'), { recursive: true, force: true });
const names = new Set<string>();
for (const source of sources) {
  if (names.has(source.name)) throw new Error(`Duplicate frame: ${source.name}`);
  names.add(source.name);
  const first = new Raster(source.width, source.height);
  source.draw(first, 'p1');
  if (source.team) {
    const second = new Raster(source.width, source.height);
    source.draw(second, 'p2');
    // Compare two renders to distinguish team pixels from fixed cyan/navy highlights.
    // A global replacement of p1 colors would accidentally recolor PC screens as well.
    const channels = [team.p1.main, team.p1.light, team.p1.dark].map((c) => c.slice(1));
    for (let i = 0; i < first.png.data.length; i += 4) {
      if (hexAt(first.png, i) === hexAt(second.png, i)) continue;
      const channel = channels.indexOf(hexAt(first.png, i));
      const placeholder = PLACEHOLDERS[channel];
      if (!placeholder) throw new Error(`Unexpected team color in ${source.name}`);
      setHex(first.png, i, placeholder);
    }
  }
  writePng(resolve(OUT, 'source', `${source.name}.png`), first.png);
}
writeJson(
  resolve(OUT, 'source/manifest.json'),
  sources.map(({ draw: _, ...spec }) => spec),
);
console.log(`Built ${sources.length} source sprites (team placeholders retained).`);
