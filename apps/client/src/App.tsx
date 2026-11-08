import { corridor, dither, map as mapTokens, type RoomView, room, scaleFor, type TeamId } from '@ot/design';
import { MAPS, type MapDef } from '@ot/sim';
import type Phaser from 'phaser';
import { useEffect, useRef, useState } from 'preact/hooks';
import { DEFAULT_BOTS, type MatchReport } from './game/session';
import { readSettings, type Settings, saveSettings } from './game/settings';
import { PixelCanvas } from './ui/components/PixelCanvas';
import { Button, Panel } from './ui/components/primitives';
import { HomeScreen, OfflineSetup, PauseMenu, ResultScreen, SettingsDialog } from './ui/screens';
import './styles/app.css';

const map = MAPS['office-01'] as MapDef;
function OfficeBackground() {
  return (
    <PixelCanvas
      w={640}
      h={360}
      label="Mặt bằng văn phòng"
      draw={(g) => {
        corridor(g, map.building);
        for (const tower of map.towers)
          room(g, {
            name: tower.name,
            rect: tower.rect,
            doors: tower.doors.map((d) => d.side).join(''),
            team: tower.seat === null ? 'neutral' : (`p${tower.seat + 1}` as TeamId),
            troops: tower.troops,
            dept: tower.dept as RoomView['dept'],
            level: tower.level,
          });
        dither(g, 0, 0, 640, 360, mapTokens.outside);
      }}
    />
  );
}

export function App() {
  const [screen, setScreen] = useState<'home' | 'setup' | 'match'>('home');
  const [bots, setBots] = useState([...DEFAULT_BOTS]);
  const [settings, setSettings] = useState(readSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [report, setReport] = useState<MatchReport | null>(null);
  const [session, setSession] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [scale, setScale] = useState(() => scaleFor(innerWidth, innerHeight));
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Phaser.Game | null>(null);
  const matchBots = useRef([...DEFAULT_BOTS]);

  useEffect(() => {
    const resize = () => setScale(scaleFor(innerWidth, innerHeight));
    addEventListener('resize', resize);
    return () => removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    if (!paused || settingsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== 'Escape' || event.repeat) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setPaused(false);
      game.current?.events.emit('resume-match');
    };
    addEventListener('keydown', onKey, true);
    return () => removeEventListener('keydown', onKey, true);
  }, [paused, settingsOpen]);

  useEffect(() => {
    if (screen !== 'match' || !host.current) return;
    let cancelled = false;
    const parent = host.current;
    setLoading(true);
    setError(false);
    void import('./game/start')
      .then(async ({ startGame }) => {
        if (cancelled) return;
        const instance = await startGame(parent, {
          bots: matchBots.current,
          onReady: () => {
            if (!cancelled) setLoading(false);
          },
          onLoadError: () => {
            if (!cancelled) {
              setError(true);
              setLoading(false);
            }
          },
          onPause: () => {
            if (!cancelled) setPaused(true);
          },
          onEnd: (result) => {
            if (!cancelled) {
              setReport(result);
              setPaused(false);
            }
          },
          onSettings: (next) => {
            if (!cancelled) setSettings(next);
          },
        });
        if (cancelled) {
          instance.destroy(true);
          return;
        }
        game.current = instance;
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setError(true);
        }
      });
    return () => {
      cancelled = true;
      game.current?.destroy(true);
      game.current = null;
    };
  }, [screen, session]);

  const updateSettings = (next: Settings) => {
    setSettings(next);
    saveSettings(next);
    game.current?.events.emit('settings-change', next);
  };
  const start = () => {
    matchBots.current = [...bots];
    setReport(null);
    setPaused(false);
    setSession((n) => n + 1);
    setScreen('match');
  };
  const home = () => {
    setSettingsOpen(false);
    setPaused(false);
    setReport(null);
    setScreen('home');
  };
  const resume = () => {
    setPaused(false);
    game.current?.events.emit('resume-match');
  };

  return (
    <main class={`ot-root app-shell ${settings.reducedMotion ? 'reduce-motion' : ''}`} data-scale={scale}>
      {screen !== 'match' && <OfficeBackground />}
      {screen === 'home' && <HomeScreen onPlay={() => setScreen('setup')} onSettings={() => setSettingsOpen(true)} />}
      {screen === 'setup' && <OfflineSetup bots={bots} onChange={setBots} onStart={start} onBack={home} />}
      {screen === 'match' && <div class="game-host" ref={host} />}
      {screen === 'match' && (loading || error) && (
        <div class="app-loading" role="status">
          <Panel title={error ? 'Chưa tải được trận' : 'Đang chuẩn bị trận'}>
            <p class="t-body">{error ? 'Thử tải lại trận hoặc về trang chủ.' : 'Đang tải bản đồ và âm thanh.'}</p>
            {error && <Button onClick={start}>Thử lại</Button>}
            <Button onClick={home}>Trang chủ</Button>
          </Panel>
        </div>
      )}
      {paused && !report && !settingsOpen && (
        <PauseMenu onResume={resume} onSettings={() => setSettingsOpen(true)} onHome={home} />
      )}
      {report && <ResultScreen report={report} onReplay={start} onHome={home} />}
      {settingsOpen && (
        <SettingsDialog settings={settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)} />
      )}
    </main>
  );
}
