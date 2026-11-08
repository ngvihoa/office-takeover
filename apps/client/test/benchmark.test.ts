// @vitest-environment happy-dom
import { EventEmitter } from 'node:events';
import type Phaser from 'phaser';
import { afterEach, expect, it, vi } from 'vitest';
import { measureGame } from '../src/dev/benchmark';
import { DEFAULT_SETTINGS } from '../src/game/settings';
import { MatchTelemetry } from '../src/game/telemetry';

afterEach(() => vi.restoreAllMocks());

it('starts controlled replay with its own CPU warm-up rather than the previous match samples', () => {
  let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  const events = new EventEmitter();
  const registry = new Map<string, unknown>();
  const game = {
    events,
    registry: {
      get: (key: string) => registry.get(key),
      set: (key: string, value: unknown) => registry.set(key, value),
      remove: (key: string) => registry.delete(key),
    },
  } as unknown as Phaser.Game;
  const newMatch = () => {
    const telemetry = new MatchTelemetry({
      bots: ['easy', 'normal', 'easy'],
      controlled: true,
      settings: () => ({ ...DEFAULT_SETTINGS, telemetry: false }),
      state: () => ({ matchTicks: 0, humanCommands: 0, humanCaptured: 0 }),
      cpuP95: () => (registry.get('cpuP95') as () => number | null)(),
    });
    registry.set('telemetry', telemetry);
    registry.set('matchActive', true);
    return telemetry;
  };
  const frames = (telemetry: MatchTelemetry, count: number, cpuMs: number) => {
    for (let i = 0; i < count; i++) {
      events.emit('prestep');
      telemetry.frame(now, true, 3);
      now += cpuMs;
      events.emit('postrender');
      now += 20;
    }
  };
  measureGame(game);
  const report = () => Reflect.get(window, 'officeBenchmark')();
  let first: MatchTelemetry | undefined;
  let second: MatchTelemetry | undefined;
  try {
    first = newMatch();
    frames(first, 125, 2);
    expect(report().cpuP95Ms).toBe(2);
    first.finish('elimination');
    second = newMatch();
    expect(report().cpuP95Ms).toBeNull();
    frames(second, 120, 18);
    expect(report().cpuP95Ms).toBeNull();
    frames(second, 1, 18);
    expect(report().cpuP95Ms).toBe(18);
  } finally {
    first?.finish('left');
    second?.finish('left');
    events.emit('destroy');
  }
});
