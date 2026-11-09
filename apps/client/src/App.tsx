import { corridor, dither, map as mapTokens, type RoomView, room, scaleFor, type TeamId } from '@ot/design';
import { buildWorld, MAPS, type MapDef, type PlayerId, type SeatState } from '@ot/sim';
import type Phaser from 'phaser';
import { useEffect, useRef, useState } from 'preact/hooks';
import { DEFAULT_BOTS, type MatchReport } from './game/session';
import { readSettings, type Settings, saveSettings } from './game/settings';
import { RemoteMatch } from './net/remoteMatch';
import { type ConnectionStatus, RoomClient } from './net/roomClient';
import { PixelCanvas } from './ui/components/PixelCanvas';
import { Button, Panel } from './ui/components/primitives';
import { LobbyScreen } from './ui/LobbyScreen';
import { HomeScreen, OfflineSetup, OnlineDialog, PauseMenu, ResultScreen, SettingsDialog } from './ui/screens';
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
  const [screen, setScreen] = useState<'home' | 'setup' | 'lobby' | 'match'>('home');
  const [bots, setBots] = useState([...DEFAULT_BOTS]);
  const [settings, setSettings] = useState(readSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [onlineOpen, setOnlineOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [report, setReport] = useState<MatchReport | null>(null);
  const [session, setSession] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [scale, setScale] = useState(() => scaleFor(innerWidth, innerHeight));

  // Online multiplayer state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [lobbyData, setLobbyData] = useState<{
    code: string;
    hostId: string;
    seats: SeatState[];
    you: { id: string; seat: PlayerId | null };
  } | null>(null);

  const roomClientRef = useRef<RoomClient | null>(null);
  const remoteMatchRef = useRef<RemoteMatch | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const game = useRef<Phaser.Game | null>(null);
  const matchBots = useRef([...DEFAULT_BOTS]);

  useEffect(() => {
    const resize = () => setScale(scaleFor(innerWidth, innerHeight));
    addEventListener('resize', resize);
    return () => removeEventListener('resize', resize);
  }, []);

  // Check ?room= query param on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && roomParam.length === 4) {
      setOnlineOpen(true);
    }
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
          remoteMatch: remoteMatchRef.current ?? undefined,
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

  const startOffline = () => {
    remoteMatchRef.current = null;
    matchBots.current = [...bots];
    setReport(null);
    setPaused(false);
    setSession((n) => n + 1);
    setScreen('match');
  };

  const home = () => {
    if (roomClientRef.current) {
      roomClientRef.current.disconnect();
      roomClientRef.current = null;
    }
    remoteMatchRef.current = null;
    setLobbyData(null);
    setSettingsOpen(false);
    setOnlineOpen(false);
    setPaused(false);
    setReport(null);
    setScreen('home');
  };

  const resume = () => {
    setPaused(false);
    game.current?.events.emit('resume-match');
  };

  const currentSeatRef = useRef<PlayerId>(0);

  const setupRoomClient = (code: string, playerName: string) => {
    if (roomClientRef.current) {
      roomClientRef.current.disconnect();
    }

    const client = new RoomClient(
      code,
      {
        onStatusChange: (status) => setConnectionStatus(status),
        onLobby: (msg) => {
          if (msg.you.seat !== null) {
            currentSeatRef.current = msg.you.seat;
          }
          setLobbyData({
            code: msg.code,
            hostId: msg.hostId,
            seats: msg.seats,
            you: { id: msg.you.id, seat: msg.you.seat },
          });
          setScreen((cur) => (cur === 'match' ? 'lobby' : cur));
          setReport(null);
        },
        onStart: (msg) => {
          const world = buildWorld(msg.map, msg.config);
          const yourSeat = currentSeatRef.current;
          const remote = new RemoteMatch(world, msg.seed, yourSeat, client);
          remoteMatchRef.current = remote;
          setReport(null);
          setPaused(false);
          setSession((n) => n + 1);
          setScreen('match');
        },
        onTick: (msg) => {
          remoteMatchRef.current?.onServerTick(msg.tick, msg.cmds);
        },
        onSync: (msg) => {
          remoteMatchRef.current?.onServerSync(msg.tick, msg.hash, msg.snapshot);
        },
        onEnd: () => {
          // Handled via simulation event in GameScene
        },
      },
      { playerName },
    );

    roomClientRef.current = client;
    client.connect();
    setScreen('lobby');
    setOnlineOpen(false);
  };

  const handleReplay = () => {
    if (report?.isOnline && roomClientRef.current) {
      roomClientRef.current.requestRematch();
      setReport(null);
      setScreen('lobby');
    } else {
      startOffline();
    }
  };

  const handleCreateOnlineRoom = async (playerName: string) => {
    try {
      const res = await fetch('/api/room/create', { method: 'POST' });
      if (!res.ok) throw new Error('Create room failed');
      const { code } = (await res.json()) as { code: string };
      setupRoomClient(code, playerName);
    } catch {
      // Fallback: connect anyway with a random 4-char code
      setupRoomClient('ABCD', playerName);
    }
  };

  const handleJoinOnlineRoom = (playerName: string, code: string) => {
    setupRoomClient(code.toUpperCase(), playerName);
  };

  return (
    <main class={`ot-root app-shell ${settings.reducedMotion ? 'reduce-motion' : ''}`} data-scale={scale}>
      {screen !== 'match' && <OfficeBackground />}
      {screen === 'home' && (
        <HomeScreen
          onPlay={() => setScreen('setup')}
          onOnline={() => setOnlineOpen(true)}
          onSettings={() => setSettingsOpen(true)}
        />
      )}
      {screen === 'setup' && <OfflineSetup bots={bots} onChange={setBots} onStart={startOffline} onBack={home} />}
      {screen === 'lobby' && lobbyData && roomClientRef.current && (
        <LobbyScreen
          code={lobbyData.code}
          client={roomClientRef.current}
          status={connectionStatus}
          hostId={lobbyData.hostId}
          seats={lobbyData.seats}
          you={lobbyData.you}
          onLeave={home}
        />
      )}
      {screen === 'match' && <div class="game-host" ref={host} />}
      {screen === 'match' && (loading || error) && (
        <div class="app-loading" role="status">
          <Panel title={error ? 'Chưa tải được trận' : 'Đang chuẩn bị trận'}>
            <p class="t-body">{error ? 'Thử tải lại trận hoặc về trang chủ.' : 'Đang tải bản đồ và âm thanh.'}</p>
            {error && <Button onClick={startOffline}>Thử lại</Button>}
            <Button onClick={home}>Trang chủ</Button>
          </Panel>
        </div>
      )}
      {paused && !report && !settingsOpen && (
        <PauseMenu onResume={resume} onSettings={() => setSettingsOpen(true)} onHome={home} />
      )}
      {report && <ResultScreen report={report} onReplay={handleReplay} onHome={home} />}
      {settingsOpen && (
        <SettingsDialog settings={settings} onChange={updateSettings} onClose={() => setSettingsOpen(false)} />
      )}
      {onlineOpen && (
        <OnlineDialog
          isOpen={onlineOpen}
          onClose={() => setOnlineOpen(false)}
          onCreateRoom={handleCreateOnlineRoom}
          onJoinRoom={handleJoinOnlineRoom}
        />
      )}
    </main>
  );
}
