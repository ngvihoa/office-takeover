import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Miniflare } from 'miniflare';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import legacyMatch from './fixtures/match.json';

const match = { ...legacyMatch, schemaVersion: 2, samples: 21600, maxFrameMs: 40.125, startRoom: 12 };

const root = fileURLToPath(new URL('../', import.meta.url));
let worker: Miniflare;
let workerOptions: ConstructorParameters<typeof Miniflare>[0];
let database: Awaited<ReturnType<Miniflare['getD1Database']>>;

async function migrate(db: typeof database, name: string) {
  const migration = await readFile(`${root}migrations/${name}`, 'utf8');
  await db.batch(
    migration
      .split(';')
      .filter((sql) => sql.trim())
      .map((sql) => db.prepare(sql)),
  );
}

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
  workerOptions = {
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
  };
  worker = new Miniflare(workerOptions);
  database = await worker.getD1Database('TELEMETRY_DB');
  await migrate(database, '0001_telemetry_matches.sql');
  await migrate(database, '0002_telemetry_v2.sql');
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

function expectSecurityHeaders(response: Response, ancestors = "'self'") {
  expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  expect(response.headers.get('permissions-policy')).toBe('camera=(), microphone=(), geolocation=()');
  expect(response.headers.get('strict-transport-security')).toBe('max-age=31536000');
  expect(response.headers.get('content-security-policy')).toBe(
    `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors ${ancestors}`,
  );
  expect(response.headers.has('x-frame-options')).toBe(false);
}

describe('anonymous telemetry HTTP Worker + D1', () => {
  it('retains populated v1 rows and the quota index while sharing one atomic quota with v2', async () => {
    const upgraded = new Miniflare(workerOptions);
    try {
      const db = await upgraded.getD1Database('TELEMETRY_DB');
      await migrate(db, '0001_telemetry_matches.sql');
      await db.batch(
        Array.from({ length: 29 }, (_, index) =>
          db
            .prepare(`
            INSERT INTO telemetry_matches (
              id, received_at, schema_version, session_id, build_version, mode, samples,
              fps, frame_p50_ms, frame_p95_ms, cpu_p95_ms, frames_over_20_ms,
              max_squads, scale, viewport_width, viewport_height, dpr, hardware_concurrency,
              browser, os, match_ticks, wall_seconds, end_reason, player_rank, bots,
              human_commands, human_captured, reduced_motion
            ) VALUES (?, unixepoch() - 100, 1, ?, 'legacy', 'offline', 60,
              60, 16, 20, NULL, 2, 30, 2, 1280, 720, 1.5, 8,
              'chrome', 'linux', 1200, 123.5, 'elimination', 1, '["easy","normal",null]', 10, 4, 0)
          `)
            .bind(index + 41, legacyMatch.sessionId),
        ),
      );
      const before = await db.prepare('SELECT * FROM telemetry_matches ORDER BY id').all();
      await migrate(db, '0002_telemetry_v2.sql');
      const after = await db.prepare('SELECT * FROM telemetry_matches ORDER BY id').all();
      expect(after.results).toEqual(before.results.map((row) => ({ ...row, max_frame_ms: null, start_room: null })));
      const indexColumns = await db.prepare("PRAGMA index_info('telemetry_matches_session_received_at')").all();
      expect(indexColumns.results.map((column) => column.name)).toEqual(['session_id', 'received_at']);

      const responses = await Promise.all(
        Array.from({ length: 45 }, () =>
          upgraded.dispatchFetch('https://game.example/api/telemetry', {
            method: 'POST',
            body: JSON.stringify({ ...match, sessionId: match.sessionId.toUpperCase() }),
          }),
        ),
      );
      expect(responses.every((response) => response.status === 204)).toBe(true);
      expect(await db.prepare('SELECT COUNT(*) AS count FROM telemetry_matches').first('count')).toBe(30);
      expect(
        await db.prepare('SELECT COUNT(*) AS count FROM telemetry_matches WHERE schema_version = 1').first('count'),
      ).toBe(29);
      expect(
        await db.prepare('SELECT COUNT(*) AS count FROM telemetry_matches WHERE schema_version = 2').first('count'),
      ).toBe(1);
      expect(await db.prepare('SELECT * FROM telemetry_matches WHERE schema_version = 2').first()).toMatchObject({
        id: 70,
        max_frame_ms: 40.125,
        start_room: 12,
        samples: 21600,
      });
      await expect(db.prepare('UPDATE telemetry_matches SET schema_version = 3').run()).rejects.toThrow();
    } finally {
      await upgraded.dispose();
    }
  });

  it('secures accepted and rejected API responses and static SPA responses', async () => {
    for (const response of [
      await post(JSON.stringify(match)),
      await post('{'),
      await post(' '.repeat(2049)),
      await worker.dispatchFetch('https://game.example/api/telemetry'),
      await worker.dispatchFetch('https://game.example/api/unknown'),
      await worker.dispatchFetch('https://game.example/'),
      await worker.dispatchFetch('https://game.example/some/client/route'),
    ]) {
      expectSecurityHeaders(response);
    }
  });

  it('allows only configured canonical HTTPS embed origins, never request Origin or CSP injection', async () => {
    const embeddedWorker = new Miniflare({
      ...workerOptions,
      bindings: {
        EMBED_ALLOWED_ORIGINS: [
          ' https://office.example ',
          'https://office.example',
          'https://office.example:8443',
          '*',
          'https://*.example',
          'https://evil.example;',
          'https://office.example:99999',
          'https://[invalid]',
          'https://OFFICE.example',
          'https://office.example:443',
          "https://evil.example; script-src 'unsafe-eval'",
          'https://evil.example\n; frame-ancestors *',
          'https://user:password@evil.example',
          'https://evil.example/path',
          'https://evil.example/',
          'https://evil.example?query',
          'https://evil.example#fragment',
          'https://evil.example\\path',
          'https://evil.example https://other.example',
          'http://evil.example',
          'javascript:alert(1)',
          'data:text/html,evil',
          '//evil.example',
          'null',
          'not-an-origin',
          '',
        ].join(','),
      },
    });
    try {
      for (const path of ['/', '/api/unknown']) {
        const response = await embeddedWorker.dispatchFetch(`https://game.example${path}`, {
          headers: { Origin: 'https://untrusted.example' },
        });
        expectSecurityHeaders(response, "'self' https://office.example https://office.example:8443");
      }
    } finally {
      await embeddedWorker.dispose();
    }
    expectSecurityHeaders(
      await worker.dispatchFetch('https://game.example/', { headers: { Origin: 'https://office.example' } }),
    );
  });

  it('returns a secured empty 500 on database failure without leaking SQL or runtime details', async () => {
    await database.prepare('ALTER TABLE telemetry_matches RENAME TO unavailable_matches').run();
    try {
      const response = await post(JSON.stringify(match));
      expect(response.status).toBe(500);
      expect(await response.text()).toBe('');
      expectSecurityHeaders(response);
    } finally {
      await database.prepare('ALTER TABLE unavailable_matches RENAME TO telemetry_matches').run();
    }
  });

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
      schema_version: 2,
      session_id: match.sessionId,
      build_version: 'dev',
      mode: 'offline',
      samples: 21600,
      fps: 60,
      frame_p50_ms: 16,
      frame_p95_ms: 20,
      max_frame_ms: 40.125,
      start_room: 12,
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
    for (const response of responses) expectSecurityHeaders(response);
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
      JSON.stringify(legacyMatch),
      JSON.stringify({ ...match, schemaVersion: 1 }),
      JSON.stringify({ ...match, startRoom: 13 }),
      JSON.stringify({ ...match, maxFrameMs: null }),
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
        maxFrameMs: null,
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
      SELECT mode, samples, fps, frame_p50_ms, frame_p95_ms, max_frame_ms, start_room, cpu_p95_ms,
        hardware_concurrency, player_rank, bots, reduced_motion FROM telemetry_matches
    `)
        .first(),
    ).toEqual({
      mode: 'controlled',
      samples: 0,
      fps: null,
      frame_p50_ms: null,
      frame_p95_ms: null,
      max_frame_ms: null,
      start_room: 12,
      cpu_p95_ms: null,
      hardware_concurrency: null,
      player_rank: null,
      bots: '[null,"normal",null]',
      reduced_motion: 1,
    });
  });

  it('preserves static asset body, content type, ETag and HEAD/304 status while adding headers', async () => {
    const asset = await worker.dispatchFetch('https://game.example/asset.txt');
    expect(asset.status).toBe(200);
    expect(await asset.text()).toBe('Static asset fixture.\n');
    expect(asset.headers.get('content-type')).toContain('text/plain');
    const etag = asset.headers.get('etag');
    expect(etag).toBeTruthy();
    expectSecurityHeaders(asset);
    const head = await worker.dispatchFetch('https://game.example/asset.txt', { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    expect(head.headers.get('etag')).toBe(etag);
    expect(head.headers.get('content-type')).toBe(asset.headers.get('content-type'));
    expectSecurityHeaders(head);
    const cached = await worker.dispatchFetch('https://game.example/asset.txt', {
      headers: { 'If-None-Match': etag ?? '' },
    });
    expect(cached.status).toBe(304);
    expect(await cached.text()).toBe('');
    expect(cached.headers.get('etag')).toBe(etag);
    expectSecurityHeaders(cached);
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
