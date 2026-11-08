import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { jsfxr, sfxr } from 'jsfxr';
import { OUT, PUBLIC, ROOT, readJson, writeJson } from './lib';

const names = [
  'send',
  'arrive',
  'capture',
  'lose',
  'skill_deadline',
  'skill_coffee',
  'countdown',
  'win',
  'lose_match',
  'click',
] as const;
const sampleRate = 44100;
const paddingSamples = 11025; // 250ms before, between and after markers (codec/seek guard).
const source = resolve(ROOT, 'art/sfx');
const expected = names.map((name) => `${name}.json`).sort();
const actual = readdirSync(source)
  .filter((file) => file.endsWith('.json'))
  .sort();
if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Expected exactly the 10 MVP SFX presets');
mkdirSync(resolve(OUT, 'sfx'), { recursive: true });
const chunks: Buffer[] = [Buffer.alloc(paddingSamples * 2)];
const spritemap: Record<string, { start: number; end: number; loop: false }> = {};
let cursor = paddingSamples;

for (const name of names) {
  const preset = readJson<Record<string, number>>(resolve(source, `${name}.json`));
  const defaults = new jsfxr.Params().fromJSON({});
  for (const [key, value] of Object.entries(preset)) {
    if (key === 'oldParams' || !(key in defaults) || !Number.isFinite(value)) {
      throw new Error(`${name}: invalid parameter ${key}`);
    }
  }
  if (![0, 1, 2].includes(preset.wave_type ?? -1)) throw new Error(`${name}: noise is not deterministic`);
  if (preset.sample_rate !== sampleRate || preset.sample_size !== 16) {
    throw new Error(`${name}: expected mono 44100Hz / 16-bit PCM`);
  }
  const wave = sfxr.toWave(new jsfxr.Params().fromJSON(preset));
  const pcm = Buffer.from(wave.data);
  const samples = pcm.length / 2;
  let peak = 0;
  for (let i = 0; i < pcm.length; i += 2) peak = Math.max(peak, Math.abs(pcm.readInt16LE(i)));
  if (!Number.isInteger(samples) || samples < 1 || samples > sampleRate * 2 || peak === 0 || wave.clipping) {
    throw new Error(`${name}: invalid, silent, overlong or clipped PCM`);
  }
  writeFileSync(resolve(OUT, 'sfx', `${name}.wav`), Buffer.from(wave.wav));
  spritemap[name] = { start: cursor / sampleRate, end: (cursor + samples) / sampleRate, loop: false };
  chunks.push(pcm, Buffer.alloc(paddingSamples * 2));
  cursor += samples + paddingSamples;
  console.log(`SFX ${name}: ${samples} samples, ${(samples / sampleRate).toFixed(3)}s, peak ${peak}/32768`);
}

// One mono PCM timeline, integer sample boundaries; never concatenate lossy encodings.
const pcm = Buffer.concat(chunks);
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVEfmt ', 8);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(1, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);
writeFileSync(resolve(OUT, 'sfx.wav'), Buffer.concat([header, pcm]));

// Bitexact muxing fixes the Ogg serial and suppresses timestamps/encoder metadata.
// Byte reproducibility is scoped to a fixed ffmpeg/libvorbis/AAC toolchain.
for (const [extension, codec] of [
  ['ogg', ['-c:a', 'libvorbis', '-q:a', '4', '-serial_offset', '0']],
  ['m4a', ['-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart']],
] as const) {
  execFileSync(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      resolve(OUT, 'sfx.wav'),
      '-map_metadata',
      '-1',
      '-fflags',
      '+bitexact',
      '-flags:a',
      '+bitexact',
      '-threads',
      '1',
      ...codec,
      resolve(OUT, `sfx.${extension}`),
    ],
    { stdio: 'inherit' },
  );
}
writeJson(resolve(OUT, 'sfx.json'), { resources: ['/art/sfx.ogg', '/art/sfx.m4a'], spritemap });
mkdirSync(PUBLIC, { recursive: true });
for (const file of ['sfx.ogg', 'sfx.m4a', 'sfx.json']) copyFileSync(resolve(OUT, file), resolve(PUBLIC, file));
console.log(`Built 10 SFX markers in ${(cursor / sampleRate).toFixed(3)}s; copied audio sprite to public/art.`);
