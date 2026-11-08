export const TELEMETRY_MAX_BYTES = 2048;

export interface TelemetryMatch {
  schemaVersion: 1;
  sessionId: string;
  buildVersion: string;
  mode: 'offline' | 'controlled';
  samples: number;
  fps: number | null;
  frameP50Ms: number | null;
  frameP95Ms: number | null;
  cpuP95Ms: number | null;
  framesOver20Ms: number;
  maxSquads: number;
  scale: number;
  viewport: [number, number];
  dpr: number;
  hardwareConcurrency: number | null;
  browser: 'chrome' | 'edge' | 'firefox' | 'safari' | 'other';
  os: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'other';
  matchTicks: number;
  wallSeconds: number;
  endReason: 'elimination' | 'timeout' | 'left';
  playerRank: number | null;
  bots: ['easy' | 'normal' | null, 'easy' | 'normal' | null, 'easy' | 'normal' | null];
  humanCommands: number;
  humanCaptured: number;
  reducedMotion: boolean;
}

const fields = [
  'schemaVersion',
  'sessionId',
  'buildVersion',
  'mode',
  'samples',
  'fps',
  'frameP50Ms',
  'frameP95Ms',
  'cpuP95Ms',
  'framesOver20Ms',
  'maxSquads',
  'scale',
  'viewport',
  'dpr',
  'hardwareConcurrency',
  'browser',
  'os',
  'matchTicks',
  'wallSeconds',
  'endReason',
  'playerRank',
  'bots',
  'humanCommands',
  'humanCaptured',
  'reducedMotion',
] satisfies (keyof TelemetryMatch)[];

function finite(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function integer(value: unknown, min: number, max: number): value is number {
  return finite(value, min, max) && Number.isInteger(value);
}

function oneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && options.some((option) => option === value);
}

function isTelemetryMatch(value: unknown): value is TelemetryMatch {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  if (Object.keys(value).length !== fields.length || !fields.every((key) => Object.hasOwn(value, key))) return false;
  if (
    !(
      'schemaVersion' in value &&
      'sessionId' in value &&
      'buildVersion' in value &&
      'mode' in value &&
      'samples' in value &&
      'fps' in value &&
      'frameP50Ms' in value &&
      'frameP95Ms' in value &&
      'cpuP95Ms' in value &&
      'framesOver20Ms' in value &&
      'maxSquads' in value &&
      'scale' in value &&
      'viewport' in value &&
      'dpr' in value &&
      'hardwareConcurrency' in value &&
      'browser' in value &&
      'os' in value &&
      'matchTicks' in value &&
      'wallSeconds' in value &&
      'endReason' in value &&
      'playerRank' in value &&
      'bots' in value &&
      'humanCommands' in value &&
      'humanCaptured' in value &&
      'reducedMotion' in value
    )
  )
    return false;

  return (
    value.schemaVersion === 1 &&
    typeof value.sessionId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.sessionId) &&
    typeof value.buildVersion === 'string' &&
    /^[A-Za-z0-9._-]{1,64}$/.test(value.buildVersion) &&
    oneOf(value.mode, ['offline', 'controlled']) &&
    integer(value.samples, 0, 3600) &&
    (value.samples === 0
      ? value.fps === null && value.frameP50Ms === null && value.frameP95Ms === null
      : finite(value.fps, 0, 1000000) &&
        finite(value.frameP50Ms, 0, 1000000) &&
        finite(value.frameP95Ms, 0, 1000000) &&
        value.frameP50Ms <= value.frameP95Ms) &&
    (value.cpuP95Ms === null || finite(value.cpuP95Ms, 0, 1000000)) &&
    integer(value.framesOver20Ms, 0, value.samples) &&
    integer(value.maxSquads, 0, 1000000) &&
    integer(value.scale, 1, 32) &&
    Array.isArray(value.viewport) &&
    value.viewport.length === 2 &&
    value.viewport.every((dimension) => integer(dimension, 1, 16384)) &&
    finite(value.dpr, 0, 16) &&
    value.dpr > 0 &&
    (value.hardwareConcurrency === null || integer(value.hardwareConcurrency, 1, 1024)) &&
    oneOf(value.browser, ['chrome', 'edge', 'firefox', 'safari', 'other']) &&
    oneOf(value.os, ['windows', 'macos', 'linux', 'android', 'ios', 'other']) &&
    integer(value.matchTicks, 0, 3600) &&
    finite(value.wallSeconds, 0, 31536000) &&
    oneOf(value.endReason, ['elimination', 'timeout', 'left']) &&
    (value.playerRank === null || integer(value.playerRank, 1, 4)) &&
    Array.isArray(value.bots) &&
    value.bots.length === 3 &&
    value.bots.every((bot) => bot === null || oneOf(bot, ['easy', 'normal'])) &&
    value.bots.some((bot) => bot !== null) &&
    integer(value.humanCommands, 0, 1000000) &&
    integer(value.humanCaptured, 0, 1000000) &&
    typeof value.reducedMotion === 'boolean'
  );
}

export function validateTelemetry(body: string): TelemetryMatch | null {
  if (new TextEncoder().encode(body).byteLength > TELEMETRY_MAX_BYTES) return null;
  try {
    const value: unknown = JSON.parse(body);
    return isTelemetryMatch(value) ? value : null;
  } catch {
    return null;
  }
}
