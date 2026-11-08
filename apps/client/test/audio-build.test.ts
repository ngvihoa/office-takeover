import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

it('builds with bundled audio when ffmpeg is absent without changing runtime files', () => {
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  const files = ['sfx.json', 'sfx.ogg', 'sfx.m4a'].map((file) => join(root, 'apps/client/public/art', file));
  const before = files.map((file) => readFileSync(file));
  const path = mkdtempSync(join(tmpdir(), 'office-no-ffmpeg-'));
  try {
    const build = spawnSync(process.execPath, ['--import', 'tsx', 'art/scripts/build-sfx.ts'], {
      cwd: root,
      env: { ...process.env, PATH: path },
      encoding: 'utf8',
    });
    expect(build.status, build.stderr).toBe(0);
    expect(build.stderr).toContain('using bundled audio');
    expect(files.map((file) => readFileSync(file))).toEqual(before);
  } finally {
    rmSync(path, { recursive: true, force: true });
  }
});
