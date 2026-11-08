import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import match from './fixtures/match.json';

const root = fileURLToPath(new URL('../', import.meta.url));
let worker: Miniflare;
let database: Awaited<ReturnType<Miniflare['getD1Database']>>;

beforeAll(async () => {
  const bundle = await build({
    entryPoints: [`${root}src/index.ts`],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    write: false,
  });
  const output = bundle.outputFiles[0];
  if (!output) throw new Error('Worker bundling produced no output');
  worker = new Miniflare({
    modules: true,
    script: output.text,
    compatibilityDate: '2026-07-30',
    d1Databases: ['TELEMETRY_DB'],
    assets: {
      directory: `${root}test/fixtures/assets`,
      binding: 'ASSETS',
      routerConfig: { invoke_user_worker_ahead_of_assets: true, has_user_worker: true },
      assetConfig: { not_found_handling: 'single-page-application' },
    },
  });
  database = await worker.getD1Database('TELEMETRY_DB');
  const migration = await readFile(`${root}migrations/0001_telemetry_matches.sql`, 'utf8');
  await database.batch(
    migration
      .split(';')
      .filter((sql) => sql.trim())
      .map((sql) => database.prepare(sql)),
  );
}, 30000);

afterAll(async () => {
  await worker?.dispose();
});

beforeEach(async () => {
  await database.prepare('DELETE FROM telemetry_matches').run();
});

function post(body: string, headers: Record<string, string> = {}) {
  return worker.dispatchFetch('https://game.example/api/telemetry', { method: 'POST', body, headers });
}

describe('anonymous telemetry HTTP Worker + D1', () => {
  it('persists every allowed match field and server time, never request identity', async () => {
    const before = Math.floor(Date.now() / 1000);
    const response = await post(JSON.stringify(match), {
      'content-type': 'text/plain;charset=UTF-8',
      'cf-connecting-ip': '192.0.2.1',
      'cf-access-jwt-assertion': 'private-identity',
      cookie: 'email=private@example.com',
      'user-agent': 'private-user-agent',
    });
    expect(response.status, await response.clone().text()).toBe(204);
    expect(await response.text()).toBe('');
    const row = await database.prepare('SELECT * FROM telemetry_matches').first();
    expect(row).toEqual({
      id: 1,
      received_at: expect.any(Number),
      schema_version: 1,
      session_id: match.sessionId,
      build_version: 'dev',
      mode: 'offline',
      samples: 60,
      fps: 60,
      frame_p50_ms: 16,
      frame_p95_ms: 20,
      cpu_p95_ms: null,
      frames_over_20_ms: 2,
      max_squads: 30,
      scale: 2,
      viewport_width: 1280,
      viewport_height: 720,
      dpr: 1.5,
      hardware_concurrency: 8,
      browser: 'chrome',
      os: 'linux',
      match_ticks: 1200,
      wall_seconds: 123.5,
      end_reason: 'elimination',
      player_rank: 1,
      bots: '["easy","normal",null]',
      human_commands: 10,
      human_captured: 4,
      reduced_motion: 0,
    });
    expect(row?.received_at).toBeGreaterThanOrEqual(before);
    expect(row?.received_at).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
  });

  it('atomically admits only 30 of 45 concurrent packets per session, ignoring excess with 204', async () => {
    const responses = await Promise.all(
      Array.from({ length: 45 }, (_, index) =>
        post(
          JSON.stringify({
            ...match,
            sessionId: index % 2 ? match.sessionId.toUpperCase() : match.sessionId,
          }),
        ),
      ),
    );
    expect(responses.every((response) => response.status === 204)).toBe(true);
    expect(await database.prepare('SELECT COUNT(*) AS count FROM telemetry_matches').first('count')).toBe(30);
    const other = await post(JSON.stringify({ ...match, sessionId: '650e8400-e29b-41d4-a716-446655440000' }));
    expect(other.status).toBe(204);
    expect(await database.prepare('SELECT COUNT(*) AS count FROM telemetry_matches').first('count')).toBe(31);
  });

  it('uses a rolling hour, not a wall-clock hour or lifetime counter', async () => {
    await Promise.all(Array.from({ length: 30 }, () => post(JSON.stringify(match))));
    await database.prepare('UPDATE telemetry_matches SET received_at = unixepoch() - 3500').run();
    expect((await post(JSON.stringify(match))).status).toBe(204);
    expect(await database.prepare('SELECT COUNT(*) AS count FROM telemetry_matches').first('count')).toBe(30);
    await database.prepare('UPDATE telemetry_matches SET received_at = unixepoch() - 3601').run();
    expect((await post(JSON.stringify(match))).status).toBe(204);
    expect(await database.prepare('SELECT COUNT(*) AS count FROM telemetry_matches').first('count')).toBe(31);
  });

  it('rejects invalid packets without writing any rows', async () => {
    for (const body of [
      '{',
      'null',
      JSON.stringify({ ...match, email: 'private@example.com' }),
      JSON.stringify({ ...match, viewport: { width: 1280, height: 720, secret: true } }),
      JSON.stringify({ ...match, bots: ['easy', 'normal', { secret: true }] }),
      JSON.stringify({ ...match, fps: '60' }),
      JSON.stringify(match).replace('"fps":60', '"fps":1e999'),
    ]) {
      expect((await post(body)).status, body).toBe(400);
    }
    expect(await database.prepare('SELECT COUNT(*) AS count FROM telemetry_matches').first('count')).toBe(0);
  });

  it('enforces the byte limit on streamed bodies with no Content-Length', async () => {
    const encoder = new TextEncoder();
    const json = JSON.stringify(match);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(json));
        controller.enqueue(encoder.encode(' '.repeat(2048 - json.length)));
        controller.enqueue(encoder.encode(' '));
        controller.close();
      },
    });
    const response = await worker.dispatchFetch('https://game.example/api/telemetry', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    });
    expect(response.status).toBe(413);
    expect(await database.prepare('SELECT COUNT(*) AS count FROM telemetry_matches').first('count')).toBe(0);
    expect((await post(json.padEnd(2048, ' '))).status).toBe(204);
    expect((await post(json.padEnd(2049, ' '))).status).toBe(413);
    expect((await post(JSON.stringify({ ...match, buildVersion: 'é'.repeat(800) }))).status).toBe(413);
  });

  it('stores nullable zero-sample and reduced-motion configuration metadata', async () => {
    const response = await post(
      JSON.stringify({
        ...match,
        mode: 'controlled',
        samples: 0,
        fps: null,
        frameP50Ms: null,
        frameP95Ms: null,
        framesOver20Ms: 0,
        hardwareConcurrency: null,
        playerRank: null,
        bots: [null, 'normal', null],
        reducedMotion: true,
      }),
    );
    expect(response.status).toBe(204);
    expect(
      await database
        .prepare(`
      SELECT mode, samples, fps, frame_p50_ms, frame_p95_ms, cpu_p95_ms,
        hardware_concurrency, player_rank, bots, reduced_motion FROM telemetry_matches
    `)
        .first(),
    ).toEqual({
      mode: 'controlled',
      samples: 0,
      fps: null,
      frame_p50_ms: null,
      frame_p95_ms: null,
      cpu_p95_ms: null,
      hardware_concurrency: null,
      player_rank: null,
      bots: '[null,"normal",null]',
      reduced_motion: 1,
    });
  });

  it('routes non-API requests to static assets with SPA fallback, without swallowing API errors', async () => {
    for (const path of ['/', '/index.html', '/some/client/route']) {
      const response = await worker.dispatchFetch(`https://game.example${path}`);
      expect(response.status).toBe(200);
      expect(await response.text()).toContain('SPA fixture');
    }
    const wrongMethod = await worker.dispatchFetch('https://game.example/api/telemetry');
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers.get('allow')).toBe('POST');
    expect((await worker.dispatchFetch('https://game.example/api/unknown')).status).toBe(404);
    expect(await database.prepare('SELECT COUNT(*) AS count FROM telemetry_matches').first('count')).toBe(0);
  });
});
