// @vitest-environment happy-dom
import { validateTelemetry } from '@ot/telemetry';
import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/game/settings';
import { MatchTelemetry } from '../src/game/telemetry';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

it('does not send or create a session identifier when anonymous telemetry is disabled', () => {
  const sendBeacon = vi.fn();
  vi.stubGlobal('navigator', { sendBeacon });
  const telemetry = new MatchTelemetry({
    bots: ['easy', null, null],
    controlled: false,
    settings: () => ({ ...DEFAULT_SETTINGS, telemetry: false }),
    state: () => ({ matchTicks: 25, humanCommands: 3, humanCaptured: 1 }),
  });
  telemetry.finish('left');
  window.dispatchEvent(new Event('pagehide'));
  expect(sendBeacon).not.toHaveBeenCalled();
  expect(localStorage.getItem('office-telemetry-session')).toBeNull();
});

it('sends one bounded summary at match end, excludes pauses, and freezes its end time', async () => {
  let clock = 100;
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  const sendBeacon = vi.fn((_url: string, _body: Blob) => false);
  vi.stubGlobal('navigator', {
    sendBeacon,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/123.0.0.0 PRIVATE-UA-DETAIL',
    hardwareConcurrency: 8,
  });
  const telemetry = new MatchTelemetry({
    bots: ['easy', 'normal', null],
    controlled: false,
    settings: () => DEFAULT_SETTINGS,
    state: () => ({ matchTicks: 340, humanCommands: 7, humanCaptured: 3 }),
  });
  let frame = 0;
  telemetry.frame(frame, true, 2);
  for (let i = 0; i < 120; i++) {
    frame += 16;
    telemetry.frame(frame, true, 4);
  }
  frame += 1000;
  telemetry.frame(frame, false, 100);
  frame += 1000;
  telemetry.frame(frame, true, 5);
  for (const ms of [10, 20, 30, 40, 50]) {
    frame += ms;
    telemetry.frame(frame, true, 7);
  }
  clock = 2100;
  telemetry.finish('timeout', 2);
  window.dispatchEvent(new Event('pagehide'));
  telemetry.finish('left');
  expect(sendBeacon).toHaveBeenCalledTimes(1);
  expect(sendBeacon.mock.calls[0]?.[0]).toBe('/api/telemetry');
  const body = sendBeacon.mock.calls[0]?.[1] as Blob;
  const text = await body.text();
  const summary = JSON.parse(text);
  expect(validateTelemetry(text)).toEqual(summary);
  expect(summary).toMatchObject({
    schemaVersion: 1,
    mode: 'offline',
    samples: 5,
    fps: 33.3,
    frameP50Ms: 30,
    frameP95Ms: 50,
    cpuP95Ms: null,
    framesOver20Ms: 3,
    maxSquads: 7,
    hardwareConcurrency: 8,
    browser: 'chrome',
    os: 'windows',
    matchTicks: 340,
    wallSeconds: 2,
    endReason: 'timeout',
    playerRank: 2,
    bots: ['easy', 'normal', null],
    humanCommands: 7,
    humanCaptured: 3,
    reducedMotion: false,
  });
  expect(summary.sessionId).toBe(localStorage.getItem('office-telemetry-session'));
  expect(new TextEncoder().encode(text).length).toBeLessThanOrEqual(2048);
  expect(text).not.toContain('PRIVATE-UA-DETAIL');
  clock = 9000;
  expect(telemetry.report().wallSeconds).toBe(2);
});

it('checks the current opt-out when leaving a match, not only the initial setting', () => {
  let settings = { ...DEFAULT_SETTINGS };
  const sendBeacon = vi.fn();
  vi.stubGlobal('navigator', { sendBeacon });
  const telemetry = new MatchTelemetry({
    bots: ['normal', null, 'easy'],
    controlled: false,
    settings: () => settings,
    state: () => ({ matchTicks: 10, humanCommands: 1, humanCaptured: 0 }),
  });
  settings = { ...settings, telemetry: false };
  window.dispatchEvent(new Event('pagehide'));
  telemetry.finish('left');
  expect(sendBeacon).not.toHaveBeenCalled();
});

it('leaves once on pagehide and swallows beacon errors without retrying', async () => {
  const sendBeacon = vi.fn((_url: string, _body: Blob) => {
    throw new Error('Beacon blocked');
  });
  vi.stubGlobal('navigator', { sendBeacon });
  const telemetry = new MatchTelemetry({
    bots: ['normal', null, null],
    controlled: false,
    settings: () => DEFAULT_SETTINGS,
    state: () => ({ matchTicks: 75, humanCommands: 2, humanCaptured: 1 }),
  });
  expect(() => window.dispatchEvent(new Event('pagehide'))).not.toThrow();
  telemetry.finish('timeout', 1);
  expect(sendBeacon).toHaveBeenCalledTimes(1);
  const body = sendBeacon.mock.calls[0]?.[1] as Blob;
  const summary = JSON.parse(await body.text());
  expect(summary).toMatchObject({ endReason: 'left', playerRank: null, matchTicks: 75 });
});
