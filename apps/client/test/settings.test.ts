// @vitest-environment happy-dom
import { afterEach, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, readSettings, saveSettings, toggleMute } from '../src/game/settings';

afterEach(() => localStorage.clear());

it('restores the chosen volume after HUD mute, reload and unmute', () => {
  saveSettings({ ...DEFAULT_SETTINGS, volume: 80 });
  const muted = toggleMute(readSettings());
  expect(muted.volume).toBe(0);
  saveSettings(muted);
  expect(toggleMute(readSettings()).volume).toBe(80);
});
