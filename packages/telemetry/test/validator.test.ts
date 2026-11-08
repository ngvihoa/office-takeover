import { describe, expect, it } from 'vitest';
import { validateTelemetry } from '../src/index';

export const validMatch = {
  schemaVersion: 1,
  sessionId: '550e8400-e29b-41d4-a716-446655440000',
  buildVersion: 'dev',
  mode: 'offline',
  samples: 60,
  fps: 60,
  frameP50Ms: 16,
  frameP95Ms: 20,
  cpuP95Ms: null,
  framesOver20Ms: 2,
  maxSquads: 30,
  scale: 2,
  viewport: [1280, 720],
  dpr: 1.5,
  hardwareConcurrency: 8,
  browser: 'chrome',
  os: 'linux',
  matchTicks: 1200,
  wallSeconds: 123.5,
  endReason: 'elimination',
  playerRank: 1,
  bots: ['easy', 'normal', null],
  humanCommands: 10,
  humanCaptured: 4,
  reducedMotion: false,
};

describe('validateTelemetry', () => {
  it('accepts the complete anonymous match contract', () => {
    expect(validateTelemetry(JSON.stringify(validMatch))).toEqual(validMatch);
  });

  it('rejects unknown fields at every JSON level rather than stripping them', () => {
    for (const changed of [
      { ...validMatch, email: 'private@example.com' },
      { ...validMatch, viewport: { 0: 1280, 1: 720, length: 2, ip: 'private' } },
      { ...validMatch, viewport: [1280, 720, 1] },
      { ...validMatch, bots: ['easy', 'normal', { name: 'private' }] },
      { ...validMatch, bots: ['easy', 'normal', null, 'easy'] },
    ]) {
      expect(validateTelemetry(JSON.stringify(changed))).toBeNull();
    }
  });

  it('rejects malformed JSON and non-object roots without throwing', () => {
    for (const body of ['', '{', 'null', 'true', '1', '"text"', '[]']) {
      expect(validateTelemetry(body)).toBeNull();
    }
  });

  it('counts UTF-8 bytes, accepting exactly 2048 bytes and rejecting 2049', () => {
    const json = JSON.stringify(validMatch);
    expect(validateTelemetry(json.padEnd(2048, ' '))).toEqual(validMatch);
    expect(validateTelemetry(json.padEnd(2049, ' '))).toBeNull();
    const multibyte = JSON.stringify({ ...validMatch, buildVersion: 'é'.repeat(800) });
    expect(multibyte.length).toBeLessThan(2048);
    expect(new TextEncoder().encode(multibyte).length).toBeGreaterThan(2048);
    expect(validateTelemetry(multibyte)).toBeNull();
  });

  it('requires every field and rejects type coercions for every field', () => {
    for (const key of Object.keys(validMatch)) {
      const missing: Record<string, unknown> = { ...validMatch };
      delete missing[key];
      expect(validateTelemetry(JSON.stringify(missing)), key).toBeNull();
      for (const wrong of [{}, [], 'wrong type', true]) {
        if (key === 'reducedMotion' && wrong === true) continue;
        expect(validateTelemetry(JSON.stringify({ ...validMatch, [key]: wrong })), `${key}: ${wrong}`).toBeNull();
      }
    }
  });

  it('rejects invalid enum, UUID and build values including trailing line terminators', () => {
    for (const change of [
      { schemaVersion: 2 },
      { sessionId: 'not-a-uuid' },
      { sessionId: '550e8400-e29b-11d4-a716-446655440000' },
      { sessionId: '550e8400-e29b-41d4-7716-446655440000' },
      { sessionId: `${validMatch.sessionId}\n` },
      { buildVersion: '' },
      { buildVersion: 'a'.repeat(65) },
      { buildVersion: 'dev\n' },
      { buildVersion: 'dev build' },
      { buildVersion: 'bản-mới' },
      { mode: 'online' },
      { browser: 'Chrome' },
      { os: 'Windows' },
      { endReason: 'won' },
      { bots: [null, null, null] },
      { bots: ['hard', null, null] },
    ]) {
      expect(validateTelemetry(JSON.stringify({ ...validMatch, ...change })), JSON.stringify(change)).toBeNull();
    }
  });

  it('enforces all numeric bounds, integer requirements and nullable fields', () => {
    const invalid: Record<string, unknown[]> = {
      samples: [-1, 3601, 1.5, null],
      fps: [-1, 1000001, null],
      frameP50Ms: [-1, 1000001, null, 21],
      frameP95Ms: [-1, 1000001, null, 15],
      cpuP95Ms: [-1, 1000001],
      framesOver20Ms: [-1, 61, 1.5, null],
      maxSquads: [-1, 1000001, 1.5, null],
      scale: [0, 33, 1.5, null],
      viewport: [
        [0, 720],
        [1280, 16385],
        [1.5, 720],
        [1280, null],
      ],
      dpr: [0, -1, 16.01, null],
      hardwareConcurrency: [0, 1025, 1.5],
      matchTicks: [-1, 3601, 1.5, null],
      wallSeconds: [-1, 31536001, null],
      playerRank: [0, 5, 1.5],
      humanCommands: [-1, 1000001, 1.5, null],
      humanCaptured: [-1, 1000001, 1.5, null],
      reducedMotion: [0, 1, null],
    };
    for (const [key, values] of Object.entries(invalid)) {
      for (const value of values) {
        expect(validateTelemetry(JSON.stringify({ ...validMatch, [key]: value })), `${key}: ${value}`).toBeNull();
      }
    }
    for (const key of ['fps', 'frameP50Ms', 'frameP95Ms', 'cpuP95Ms', 'dpr', 'wallSeconds']) {
      const json = JSON.stringify({ ...validMatch, [key]: 'NONFINITE' });
      expect(validateTelemetry(json.replace('"NONFINITE"', '1e999')), key).toBeNull();
      expect(validateTelemetry(json.replace('"NONFINITE"', '-1e999')), key).toBeNull();
    }
  });

  it('accepts zero-sample and upper-bound packets but rejects inconsistent timings', () => {
    const zero = { ...validMatch, samples: 0, fps: null, frameP50Ms: null, frameP95Ms: null, framesOver20Ms: 0 };
    expect(validateTelemetry(JSON.stringify(zero))).toEqual(zero);
    for (const key of ['fps', 'frameP50Ms', 'frameP95Ms']) {
      expect(validateTelemetry(JSON.stringify({ ...zero, [key]: 0 }))).toBeNull();
    }
    const upper = {
      ...validMatch,
      buildVersion: 'a'.repeat(64),
      mode: 'controlled',
      samples: 3600,
      fps: 1000000,
      frameP50Ms: 1000000,
      frameP95Ms: 1000000,
      cpuP95Ms: 1000000,
      framesOver20Ms: 3600,
      maxSquads: 1000000,
      scale: 32,
      viewport: [16384, 16384],
      dpr: 16,
      hardwareConcurrency: 1024,
      matchTicks: 3600,
      wallSeconds: 31536000,
      playerRank: 4,
      humanCommands: 1000000,
      humanCaptured: 1000000,
      reducedMotion: true,
    };
    expect(validateTelemetry(JSON.stringify(upper))).toEqual(upper);
    const nullable = { ...validMatch, hardwareConcurrency: null, playerRank: null, cpuP95Ms: null };
    expect(validateTelemetry(JSON.stringify(nullable))).toEqual(nullable);
  });
});
