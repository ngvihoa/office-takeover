import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const files = ['sfx.json', 'sfx.ogg', 'sfx.m4a'];
const publicDir = join(root, 'apps/client/public/art');
const ffmpegAvailable = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
const scratch: string[] = [];

afterEach(() => {
  for (const path of scratch.splice(0)) rmSync(path, { recursive: true, force: true });
});

function tempDir() {
  const path = mkdtempSync(join(tmpdir(), 'office-sfx-'));
  scratch.push(path);
  return path;
}

function snapshot(dir: string) {
  return files.map((file) => {
    const path = join(dir, file);
    return { bytes: readFileSync(path), mtime: statSync(path, { bigint: true }).mtimeNs };
  });
}

function build(env: NodeJS.ProcessEnv = {}, args: string[] = []) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'art/scripts/build-sfx.ts', ...args], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

function changedPresets() {
  const source = join(tempDir(), 'presets');
  cpSync(join(root, 'art/sfx'), source, { recursive: true });
  const file = join(source, 'capture.json');
  const preset = JSON.parse(readFileSync(file, 'utf8'));
  preset.p_base_freq = 0.42;
  writeFileSync(file, JSON.stringify(preset));
  return source;
}

it.skipIf(!ffmpegAvailable)('does not rewrite bundled audio or dirty Git on two unchanged builds', () => {
  const before = snapshot(publicDir);
  const status = () => {
    const result = spawnSync('git', ['status', '--porcelain', '--', ...files.map((f) => join(publicDir, f))], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(result.status, result.stderr).toBe(0);
    return result.stdout;
  };
  const beforeStatus = status();
  for (let i = 0; i < 2; i++) {
    const result = build();
    expect(result.status, result.stderr).toBe(0);
    expect(snapshot(publicDir)).toEqual(before);
    expect(status()).toBe(beforeStatus);
  }
});

it('uses matching bundled audio without ffmpeg and without writing files', () => {
  const before = snapshot(publicDir);
  const result = build({ PATH: tempDir() });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain('using bundled audio');
  expect(snapshot(publicDir)).toEqual(before);
});

it('rejects changed presets without ffmpeg and leaves bundled audio untouched', () => {
  const before = snapshot(publicDir);
  const result = build({ PATH: tempDir(), OT_SFX_SOURCE: changedPresets() });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Install ffmpeg');
  expect(result.stderr).toContain('commit');
  expect(snapshot(publicDir)).toEqual(before);
});

it('normalizes preset key order and whitespace before comparing sources', () => {
  const source = join(tempDir(), 'presets');
  cpSync(join(root, 'art/sfx'), source, { recursive: true });
  const file = join(source, 'capture.json');
  const preset = JSON.parse(readFileSync(file, 'utf8'));
  writeFileSync(file, JSON.stringify(Object.fromEntries(Object.entries(preset).reverse()), null, 4));
  const before = snapshot(publicDir);
  const result = build({ PATH: tempDir(), OT_SFX_SOURCE: source });
  expect(result.status, result.stderr).toBe(0);
  expect(snapshot(publicDir)).toEqual(before);
});

it.skipIf(!ffmpegAvailable)('rebuilds changed presets and then skips until forced', () => {
  const output = tempDir();
  const env = { OT_SFX_SOURCE: changedPresets(), OT_SFX_PUBLIC: output };
  const result = build(env);
  expect(result.status, result.stderr).toBe(0);
  const manifest = JSON.parse(readFileSync(join(output, 'sfx.json'), 'utf8'));
  const original = JSON.parse(readFileSync(join(publicDir, 'sfx.json'), 'utf8'));
  expect(manifest.sourceHash).toMatch(/^[a-f0-9]{64}$/);
  expect(manifest.sourceHash).not.toBe(original.sourceHash);
  expect(readFileSync(join(output, 'sfx.ogg'))).not.toEqual(readFileSync(join(publicDir, 'sfx.ogg')));
  const before = snapshot(output);
  expect(build({ ...env, PATH: tempDir() }).status).toBe(0);
  expect(snapshot(output)).toEqual(before);
  const forced = build(env, ['--force']);
  expect(forced.status, forced.stderr).toBe(0);
  expect(statSync(join(output, 'sfx.json'), { bigint: true }).mtimeNs).not.toBe(before[0]?.mtime);
  expect(JSON.parse(readFileSync(join(output, 'sfx.json'), 'utf8')).sourceHash).toBe(manifest.sourceHash);
});

it('requires ffmpeg for an explicitly forced rebuild even when sources match', () => {
  const before = snapshot(publicDir);
  const result = build({ PATH: tempDir() }, ['--force']);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Install ffmpeg');
  expect(snapshot(publicDir)).toEqual(before);
});
