import { TELEMETRY_MAX_BYTES, type TelemetryMatch, validateTelemetry } from '@ot/telemetry';

interface Env {
  TELEMETRY_DB: D1Database;
  ASSETS: Fetcher;
  EMBED_ALLOWED_ORIGINS?: string;
}

function frameAncestors(allowedOrigins = ''): string {
  const ancestors = new Set(["'self'"]);
  for (const entry of allowedOrigins.split(',')) {
    const origin = entry.trim();
    // Canonical HTTPS origins only; reject wildcards, CSP syntax and URL normalization tricks.
    if (!/^https:\/\/(?:[a-z0-9.-]+|\[[0-9a-f:]+\])(?::[0-9]+)?$/.test(origin)) continue;
    try {
      if (new URL(origin).origin === origin) ancestors.add(origin);
    } catch {
      // A malformed entry grants no additional framing permission.
    }
  }
  return [...ancestors].join(' ');
}

function secureResponse(response: Response, env: Env): Response {
  const secured = new Response(response.body, response);
  secured.headers.set('X-Content-Type-Options', 'nosniff');
  secured.headers.set('Referrer-Policy', 'no-referrer');
  secured.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  secured.headers.set('Strict-Transport-Security', 'max-age=31536000');
  secured.headers.set(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors ${frameAncestors(env.EMBED_ALLOWED_ORIGINS)}`,
  );
  // CSP is authoritative: SAMEORIGIN would conflict with explicitly allowed embedders.
  secured.headers.delete('X-Frame-Options');
  return secured;
}

async function readBody(request: Request): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const bytes = new Uint8Array(TELEMETRY_MAX_BYTES);
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (size + value.byteLength > TELEMETRY_MAX_BYTES) {
        await reader.cancel();
        return null;
      }
      bytes.set(value, size);
      size += value.byteLength;
    }
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes.subarray(0, size));
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

async function insertMatch(database: D1Database, match: TelemetryMatch): Promise<void> {
  await database
    .prepare(`
    INSERT INTO telemetry_matches (
      schema_version, session_id, build_version, mode, samples,
      fps, frame_p50_ms, frame_p95_ms, cpu_p95_ms, frames_over_20_ms,
      max_squads, scale, viewport_width, viewport_height, dpr,
      hardware_concurrency, browser, os, match_ticks, wall_seconds,
      end_reason, player_rank, bots, human_commands, human_captured, reduced_motion
    )
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE (
      SELECT COUNT(*) FROM telemetry_matches
      WHERE session_id = ? AND received_at > unixepoch() - 3600
    ) < 30
  `)
    .bind(
      match.schemaVersion,
      match.sessionId.toLowerCase(),
      match.buildVersion,
      match.mode,
      match.samples,
      match.fps,
      match.frameP50Ms,
      match.frameP95Ms,
      match.cpuP95Ms,
      match.framesOver20Ms,
      match.maxSquads,
      match.scale,
      match.viewport[0],
      match.viewport[1],
      match.dpr,
      match.hardwareConcurrency,
      match.browser,
      match.os,
      match.matchTicks,
      match.wallSeconds,
      match.endReason,
      match.playerRank,
      JSON.stringify(match.bots),
      match.humanCommands,
      match.humanCaptured,
      Number(match.reducedMotion),
      match.sessionId.toLowerCase(),
    )
    .run();
}

async function route(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === '/api/telemetry') {
    if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
    const body = await readBody(request);
    if (body === null) return new Response(null, { status: 413 });
    const match = validateTelemetry(body);
    if (!match) return new Response(null, { status: 400 });
    await insertMatch(env.TELEMETRY_DB, match);
    return new Response(null, { status: 204 });
  }
  if (path.startsWith('/api/')) return new Response(null, { status: 404 });
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return secureResponse(await route(request, env), env);
    } catch {
      return secureResponse(new Response(null, { status: 500 }), env);
    }
  },
} satisfies ExportedHandler<Env>;
