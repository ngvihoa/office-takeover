import { SEND_PCTS, type SendPct } from '@ot/sim';

export interface Settings {
  volume: number;
  lastVolume: number;
  reducedMotion: boolean;
  screenShake: boolean;
  symbols: boolean;
  sendPct: SendPct;
  telemetry: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 40,
  lastVolume: 40,
  reducedMotion: false,
  screenShake: true,
  symbols: true,
  sendPct: 50,
  telemetry: true,
};

export function readSettings(): Settings {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    const saved = JSON.parse(localStorage.getItem('office-settings') ?? '{}');
    return {
      volume:
        typeof saved?.volume === 'number' && Number.isFinite(saved.volume)
          ? Math.max(0, Math.min(100, Math.round(saved.volume / 10) * 10))
          : 40,
      lastVolume:
        typeof saved?.lastVolume === 'number' && Number.isFinite(saved.lastVolume) && saved.lastVolume > 0
          ? Math.max(10, Math.min(100, Math.round(saved.lastVolume / 10) * 10))
          : 40,
      reducedMotion: typeof saved?.reducedMotion === 'boolean' ? saved.reducedMotion : reducedMotion,
      screenShake: typeof saved?.screenShake === 'boolean' ? saved.screenShake : true,
      symbols: typeof saved?.symbols === 'boolean' ? saved.symbols : true,
      sendPct: SEND_PCTS.includes(saved?.sendPct) ? saved.sendPct : 50,
      telemetry: typeof saved?.telemetry === 'boolean' ? saved.telemetry : true,
    };
  } catch {
    return { ...DEFAULT_SETTINGS, reducedMotion };
  }
}

export function toggleMute(settings: Settings): Settings {
  return settings.volume > 0
    ? { ...settings, lastVolume: settings.volume, volume: 0 }
    : { ...settings, volume: settings.lastVolume };
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem('office-settings', JSON.stringify(settings));
  } catch {
    // Private/embedded browsers may deny storage; the current session still works.
  }
}
