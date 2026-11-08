import { scaleFor } from '@ot/design';
import type { BotLevel } from '@ot/sim';
import type { TelemetryMatch } from '@ot/telemetry';
import { FrameSamples } from './metrics';
import type { Settings } from './settings';

declare const __BUILD_VERSION__: string;

function sessionId() {
  let id: string | null = null;
  try {
    id = localStorage.getItem('office-telemetry-session');
  } catch {
    // Storage may be unavailable; the identifier then lasts for this match only.
  }
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return id;
  id = crypto.randomUUID();
  try {
    localStorage.setItem('office-telemetry-session', id);
  } catch {
    // Sending remains optional when storage is blocked.
  }
  return id;
}

function platform(): Pick<TelemetryMatch, 'browser' | 'os'> {
  // Only these coarse categories leave the browser, never the source UA string.
  const ua = navigator.userAgent;
  const browser = /Edg/i.test(ua)
    ? 'edge'
    : /Firefox|FxiOS/i.test(ua)
      ? 'firefox'
      : /Chrome|CriOS/i.test(ua)
        ? 'chrome'
        : /Safari/i.test(ua)
          ? 'safari'
          : 'other';
  const os = /Android/i.test(ua)
    ? 'android'
    : /iPhone|iPad|iPod/i.test(ua)
      ? 'ios'
      : /Windows/i.test(ua)
        ? 'windows'
        : /Macintosh|Mac OS/i.test(ua)
          ? 'macos'
          : /Linux/i.test(ua)
            ? 'linux'
            : 'other';
  return { browser, os };
}

export class MatchTelemetry {
  private frames = new FrameSamples();
  private started = performance.now();
  private previous: number | null = null;
  private maxSquads = 0;
  private finished = false;
  private finalReport?: Omit<TelemetryMatch, 'sessionId' | 'endReason' | 'playerRank'>;
  private leave = () => this.finish('left');

  constructor(
    private options: {
      bots: readonly (BotLevel | null)[];
      controlled: boolean;
      settings: () => Settings;
      state: () => { matchTicks: number; humanCommands: number; humanCaptured: number };
      cpuP95?: () => number | null;
    },
  ) {
    window.addEventListener('pagehide', this.leave);
  }

  frame(now: number, active: boolean, squads: number) {
    if (this.finished) return;
    if (!active) {
      this.previous = null;
      return;
    }
    this.maxSquads = Math.max(this.maxSquads, squads);
    if (this.previous !== null) this.frames.add(now - this.previous);
    this.previous = now;
  }

  report(): Omit<TelemetryMatch, 'sessionId' | 'endReason' | 'playerRank'> {
    if (this.finalReport) return this.finalReport;
    const settings = this.options.settings();
    return {
      schemaVersion: 1,
      buildVersion: typeof __BUILD_VERSION__ === 'string' ? __BUILD_VERSION__ : 'dev',
      mode: this.options.controlled ? 'controlled' : 'offline',
      ...this.frames.report(),
      cpuP95Ms: this.options.cpuP95?.() ?? null,
      maxSquads: this.maxSquads,
      scale: scaleFor(innerWidth, innerHeight),
      viewport: [innerWidth, innerHeight],
      dpr: devicePixelRatio,
      hardwareConcurrency: navigator.hardwareConcurrency || null,
      ...platform(),
      ...this.options.state(),
      wallSeconds: Number(((performance.now() - this.started) / 1000).toFixed(2)),
      bots: [this.options.bots[0] ?? null, this.options.bots[1] ?? null, this.options.bots[2] ?? null],
      reducedMotion: settings.reducedMotion,
    };
  }

  finish(endReason: TelemetryMatch['endReason'], playerRank: number | null = null) {
    if (this.finished) return;
    this.finished = true;
    window.removeEventListener('pagehide', this.leave);
    try {
      this.finalReport = this.report();
      if (!this.options.settings().telemetry) return;
      const summary: TelemetryMatch = { ...this.report(), sessionId: sessionId(), endReason, playerRank };
      navigator.sendBeacon('/api/telemetry', new Blob([JSON.stringify(summary)], { type: 'application/json' }));
    } catch {
      // Best effort only: no retry, fallback fetch, queue, or gameplay dependency.
    }
  }
}
