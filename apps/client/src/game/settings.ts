import { SEND_PCTS, type SendPct } from '@ot/sim';

export interface Settings {
  volume: number;
  reducedMotion: boolean;
  screenShake: boolean;
  symbols: boolean;
  sendPct: SendPct;
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 40,
  reducedMotion: false,
  screenShake: true,
  symbols: true,
  sendPct: 50,
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
      reducedMotion: typeof saved?.reducedMotion === 'boolean' ? saved.reducedMotion : reducedMotion,
      screenShake: typeof saved?.screenShake === 'boolean' ? saved.screenShake : true,
      symbols: typeof saved?.symbols === 'boolean' ? saved.symbols : true,
      sendPct: SEND_PCTS.includes(saved?.sendPct) ? saved.sendPct : 50,
    };
  } catch {
    return { ...DEFAULT_SETTINGS, reducedMotion };
  }
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem('office-settings', JSON.stringify(settings));
  } catch {
    // Private/embedded browsers may deny storage; the current session still works.
  }
}
