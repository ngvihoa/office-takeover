import {
  color,
  contrast,
  corridor,
  countPlate,
  dither,
  elevation,
  map as mapTokens,
  motion,
  type Painter,
  path,
  person,
  plant,
  playerChip,
  primitive,
  type RoomState,
  room,
  sendMeter,
  skillButton,
  space,
  squad,
  TEAM_IDS,
  TEXT_PAIRS,
  type TeamId,
  team,
  timerChip,
  tooltip,
  type as typeScale,
} from '@ot/design';
import { type BotLevel, buildWorld, MAPS, type MapDef } from '@ot/sim';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { MatchFeedback } from '../game/feedback';
import type { MatchReport } from '../game/session';
import { DEFAULT_SETTINGS } from '../game/settings';
import { BenchmarkPanel } from '../ui/BenchmarkPanel';
import { Modal, SeatCard } from '../ui/components/composite';
import { Checkbox, RoomCodeInput, Segmented, Slider, Toggle } from '../ui/components/controls';
import { PixelCanvas } from '../ui/components/PixelCanvas';
import {
  ALL_ICONS,
  Badge,
  Button,
  Icon,
  Kbd,
  Panel,
  PlayerChip,
  Stamp,
  Toast,
  Tooltip,
} from '../ui/components/primitives';
import { HomeScreen, OfflineSetup, PauseMenu, ResultScreen, SettingsDialog } from '../ui/screens';
import { along, PREVIEW_PLANTS, PREVIEW_ROOMS, PREVIEW_SQUADS } from './previewMap';
import './dev.css';

const VN_TEST = 'ẮẰẲẴẶ ẤẦẨẪẬ Đ ƠƯ ỚỜỞỠỢ ỨỪỬỮỰ';
const feedbackWorld = buildWorld(MAPS['office-01'] as MapDef);
const previewReport: MatchReport = {
  seed: 2026,
  seatOrder: [0, 1, 2, 3],
  startRoom: 0,
  bots: ['easy', 'normal', 'easy'],
  result: { ranking: [0, 2, 1, 3], winner: 0, reason: 'last-standing', endTick: 1250 },
  players: [
    { id: 0, name: 'Bạn', rooms: 12, sent: 824, captured: 18 },
    { id: 1, name: 'Bot An', rooms: 0, sent: 245, captured: 4 },
    { id: 2, name: 'Bot Bình', rooms: 0, sent: 490, captured: 9 },
    { id: 3, name: 'Bot Chi', rooms: 0, sent: 132, captured: 2 },
  ],
};

function drawFeedback(g: Painter, t: number, reducedMotion: boolean) {
  drawMapScene(g, reducedMotion ? 0 : t);
  const feedback = new MatchFeedback(feedbackWorld, () => {});
  feedback.consume(
    [
      { t: 'captured', tower: 1, from: null, to: 0 },
      { t: 'captured', tower: 3, from: 0, to: 1 },
      { t: 'skillUsed', player: 0, skill: 'coffee' },
    ],
    0,
    new Set(),
  );
  feedback.draw(g, reducedMotion ? 100 : t % 640, { ...DEFAULT_SETTINGS, reducedMotion });
}

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: ComponentChildren;
}) {
  return (
    <section id={id} class="dev-section">
      <h2 class="t-title">{title}</h2>
      {note && <p class="t-body muted dev-note">{note}</p>}
      <div class="dev-body">{children}</div>
    </section>
  );
}

function Spec({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <div class="spec">
      <div class="spec-demo">{children}</div>
      <div class="spec-label t-caption muted">{label}</div>
    </div>
  );
}

function Swatch({ name, hex, fg }: { name: string; hex: string; fg?: string }) {
  return (
    <div class="swatch">
      <div class="swatch-chip" style={{ background: hex, color: fg }}>
        {fg ? 'Aa' : ''}
      </div>
      <div class="t-caption">{name}</div>
      <div class="t-caption muted">{hex}</div>
    </div>
  );
}

// ---------- canvas scenes ----------
const blink = (t: number) => Math.floor(t / (motion.pulse / 2)) % 2 === 0;
const ants = (t: number) => Math.floor(t / motion.base) % 4;

function drawMapScene(g: Painter, t: number) {
  corridor(g);
  for (const [x, y] of PREVIEW_PLANTS) plant(g, x, y);
  for (const r of PREVIEW_ROOMS) {
    const s: RoomState = r.name === 'TEAM DEV' ? { selected: true, phase: ants(t) } : {};
    if (r.name === 'HR') s.underAttack = true;
    if (r.name === 'PANTRY') s.validTarget = blink(t);
    room(g, r, s);
  }
  for (const q of PREVIEW_SQUADS) {
    if (q.team === 'p1' || q.team === 'p2') path(g, q.path, q.team);
    const [x, y] = along(q.path, q.t);
    squad(g, x, y, q.team, q.n, Math.floor(t / 250) % 2);
  }
  // HUD
  playerChip(g, 6, 3, 62, 'p1', 'Bạn', 4, { you: true });
  playerChip(g, 72, 3, 62, 'p2', 'Minh', 4);
  playerChip(g, 138, 3, 66, 'p3', 'Bot A', 2);
  playerChip(g, 208, 3, 66, 'p4', 'Bot B', 1);
  timerChip(g, 582, 3, 252);
  skillButton(g, 236, 340, 'skillDeadline', 'Q', 'ready');
  skillButton(g, 262, 340, 'skillCoffee', 'W', 'cooldown', { cooldownFrac: 0.6, secs: 18 });
  sendMeter(g, 290, 343, 50);
}

function drawRoomStates(g: Painter, t: number) {
  g.rect(0, 0, 640, 120, mapTokens.corridor);
  const base = { doors: 'b', troops: 14, dept: 'dev' as const };
  const states: [string, TeamId, RoomState][] = [
    ['BÌNH THƯỜNG', 'p1', {}],
    ['HOVER (CỦA MÌNH)', 'p1', { hoverOwn: true }],
    ['ĐANG CHỌN', 'p1', { selected: true, phase: ants(t) }],
    ['ĐÍCH HỢP LỆ', 'p2', { validTarget: blink(t) }],
  ];
  states.forEach(([label, tm, s], i) => {
    room(g, { ...base, name: label, rect: [14 + i * 158, 12, 132, 92], team: tm }, s);
  });
}

function drawRoomStates2(g: Painter, t: number) {
  g.rect(0, 0, 640, 120, mapTokens.corridor);
  const base = { doors: 'b', troops: 14, dept: 'dev' as const };
  const states: [string, TeamId, RoomState][] = [
    ['BỊ TẤN CÔNG', 'p1', { underAttack: true }],
    ['ĐẦY (NHẤP NHÁY)', 'p3', { full: true, blinkOn: blink(t) }],
    ['VỪA MẤT', 'p2', { justLost: blink(t) }],
    ['TRUNG LẬP', 'neutral', {}],
  ];
  states.forEach(([label, tm, s], i) => {
    room(g, { ...base, name: label, rect: [14 + i * 158, 12, 132, 92], team: tm }, s);
  });
}

const DEPTS = ['dev', 'design', 'sales', 'data', 'acc', 'mkt', 'hr', 'qa', 'pantry', 'meet', 'boss', 'server'] as const;

function drawDepts(g: Painter) {
  g.rect(0, 0, 640, 340, mapTokens.corridor);
  const teams = ['p1', 'p2', 'p3', 'p4'] as const;
  DEPTS.forEach((d, i) => {
    const rect = [12 + (i % 4) * 157, 14 + Math.floor(i / 4) * 110, 140, 90] as const;
    room(g, { name: d.toUpperCase(), rect, doors: 'b', team: teams[i % 4] as TeamId, troops: 10 + i, dept: d });
  });
}

function drawHudParts(g: Painter, t: number) {
  g.rect(0, 0, 640, 110, mapTokens.corridor);
  countPlate(g, 30, 10, 7, 'p1');
  countPlate(g, 70, 10, 22, 'p2');
  countPlate(g, 116, 10, 140, 'p3');
  countPlate(g, 160, 10, 30, 'p4', { full: true, blinkOn: blink(t) });
  countPlate(g, 210, 10, 12, 'p1', { underAttack: true });
  countPlate(g, 260, 10, 9, 'p2', { locked: true });
  countPlate(g, 300, 10, 0, 'p3', { hidden: true });
  countPlate(g, 340, 10, 40, 'neutral');
  skillButton(g, 20, 44, 'skillDeadline', 'Q', 'ready', { flash: blink(t) });
  skillButton(g, 50, 44, 'skillCoffee', 'W', 'cooldown', {
    cooldownFrac: 1 - ((t / 6000) % 1),
    secs: 18 - Math.floor((t / 1000) % 18),
  });
  skillButton(g, 80, 44, 'skillDeadline', 'Q', 'aiming');
  skillButton(g, 110, 44, 'skillCoffee', 'W', 'disabled');
  sendMeter(g, 150, 47, 25);
  sendMeter(g, 240, 47, 75);
  timerChip(g, 334, 47, 252);
  timerChip(g, 392, 47, 45);
  timerChip(g, 450, 47, 8, blink(t));
  playerChip(g, 20, 80, 62, 'p1', 'Bạn', 4, { you: true });
  playerChip(g, 88, 80, 62, 'p2', 'Minh', 3);
  playerChip(g, 156, 80, 70, 'p3', 'Bot A', 0, { eliminated: true });
  playerChip(g, 232, 80, 70, 'p4', 'Lan', 2, { disconnected: true });
  tooltip(g, 420, 106, ['TEAM DEV · Bạn', '22 / 50 nhân viên', 'Tuyển +1 mỗi 0.8s · Cấp 2'], 130);
  for (const [i, tm] of (['p1', 'p2', 'p3', 'p4'] as const).entries())
    squad(g, 560 + (i % 2) * 40, 40 + Math.floor(i / 2) * 40, tm, [5, 12, 3, 27][i] ?? 5, Math.floor(t / 250) % 2);
}

// ---------- page ----------
export function DevUI() {
  // Default to the largest scale whose 660-lpx column fits the window.
  const [scale, setScale] = useState<'1' | '2' | '3'>(
    () => String(Math.min(3, Math.max(1, Math.floor((innerWidth - 40) / 660)))) as '1' | '2' | '3',
  );
  const [reduce, setReduce] = useState(false);
  const [seg, setSeg] = useState<'easy' | 'normal'>('normal');
  const [pct, setPct] = useState<'25' | '50' | '75' | '100'>('50');
  const [tog, setTog] = useState(true);
  const [tog2, setTog2] = useState(false);
  const [chk, setChk] = useState(true);
  const [vol, setVol] = useState(40);
  const [modal, setModal] = useState(false);
  const [motionKey, setMotionKey] = useState(0);
  const [setupBots, setSetupBots] = useState<(BotLevel | null)[]>(['easy', 'normal', 'easy']);
  const [oneBot, setOneBot] = useState<(BotLevel | null)[]>(['easy', null, null]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [quietSettings, setQuietSettings] = useState({
    ...DEFAULT_SETTINGS,
    volume: 0,
    reducedMotion: true,
    telemetry: false,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div class={`ot-root dev ${reduce ? 'reduce-motion' : ''}`} data-scale={scale}>
      <header class="dev-header">
        <div>
          <div class="t-display">Office Pixel</div>
          <div class="t-body muted">Design system · /dev/ui · chỉ có trong bản dev</div>
        </div>
        <div class="dev-controls">
          <span class="t-body">Tỉ lệ S</span>
          <Segmented
            label="Tỉ lệ"
            value={scale}
            onChange={setScale}
            options={[
              { value: '1', label: '1×' },
              { value: '2', label: '2×' },
              { value: '3', label: '3×' },
            ]}
          />
          <Toggle label="Giảm chuyển động" checked={reduce} onChange={setReduce} />
        </div>
      </header>
      <nav class="dev-nav t-body">
        {[
          ['screen', 'Màn hình mẫu'],
          ['app-screens', 'Menu offline'],
          ['benchmark', 'Đo hiệu năng'],
          ['color', 'Màu'],
          ['type', 'Chữ'],
          ['shape', 'Spacing & nổi'],
          ['icons', 'Icon'],
          ['motion', 'Chuyển động'],
          ['buttons', 'Nút'],
          ['panel', 'Panel'],
          ['forms', 'Điều khiển'],
          ['feedback', 'Phản hồi'],
          ['seats', 'Thẻ ghế'],
          ['hud', 'HUD (canvas)'],
          ['rooms', 'Phòng (canvas)'],
          ['depts', 'Phòng ban'],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`}>
            {label}
          </a>
        ))}
      </nav>

      <Section
        id="screen"
        title="Màn hình mẫu"
        note="Trận đấu 640×360 vẽ hoàn toàn bằng hàm paint dùng chung (sau này Phaser gọi lại đúng các hàm này). Team Dev đang được chọn, Pantry là đích hợp lệ, HR đang bị tấn công."
      >
        <div class="frame">
          <PixelCanvas w={640} h={360} draw={drawMapScene} animate label="Màn hình trận mẫu" />
        </div>
        <div class="frame home" style={{ marginTop: 'calc(var(--n) * 16)' }}>
          <PixelCanvas
            w={640}
            h={360}
            draw={(g) => {
              corridor(g);
              for (const r of PREVIEW_ROOMS) room(g, r);
              dither(g, 0, 0, 640, 360, mapTokens.outside);
            }}
            label="Nền trang chủ"
          />
          <HomeScreen
            onPlay={() => document.getElementById('app-screens')?.scrollIntoView()}
            onSettings={() => setSettingsOpen(true)}
          />
        </div>
      </Section>

      <Section
        id="app-screens"
        title="Menu offline"
        note="Màn hình thật ở tỉ lệ S đang chọn. Các thiết lập bên dưới có thể tương tác."
      >
        <h3 class="t-label">Phòng tập · 3 bot</h3>
        <div class="screen-preview">
          <OfflineSetup bots={setupBots} onChange={setSetupBots} onStart={() => {}} onBack={() => {}} />
        </div>
        <h3 class="t-label">Phòng tập · 1 bot (không thể bỏ bot cuối)</h3>
        <div class="screen-preview">
          <OfflineSetup bots={oneBot} onChange={setOneBot} onStart={() => {}} onBack={() => {}} />
        </div>
        <h3 class="t-label">Cài đặt · Mặc định</h3>
        <div class="screen-preview">
          <SettingsDialog inline settings={settings} onChange={setSettings} onClose={() => {}} />
        </div>
        <Button onClick={() => setSettingsOpen(true)}>Mở cài đặt thật (thử Tab / Escape)</Button>
        {settingsOpen && (
          <SettingsDialog settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} />
        )}
        <h3 class="t-label">Cài đặt · Tắt tiếng, giảm chuyển động, không gửi số liệu</h3>
        <div class="screen-preview reduce-motion">
          <SettingsDialog inline settings={quietSettings} onChange={setQuietSettings} onClose={() => {}} />
        </div>
        <h3 class="t-label">Kết quả · Hạng 1</h3>
        <div class="screen-preview">
          <ResultScreen report={previewReport} onReplay={() => {}} onHome={() => {}} />
        </div>
        <h3 class="t-label">Kết quả · Hạng 3, hết giờ</h3>
        <div class="screen-preview">
          <ResultScreen
            report={{
              ...previewReport,
              result: { ranking: [2, 1, 0, 3], winner: 2, reason: 'time-limit', endTick: 6000 },
            }}
            onReplay={() => {}}
            onHome={() => {}}
          />
        </div>
        <h3 class="t-label">Kết quả · Hòa (thứ tự thống kê không phải chiến thắng)</h3>
        <div class="screen-preview">
          <ResultScreen
            report={{
              ...previewReport,
              result: { ranking: [0, 2, 1, 3], winner: null, reason: 'time-limit', endTick: 3600 },
              players: previewReport.players.map((player) => ({
                ...player,
                rooms: player.id === 0 || player.id === 2 ? 6 : 0,
              })),
            }}
            onReplay={() => {}}
            onHome={() => {}}
          />
        </div>
        <h3 class="t-label">Kết quả · Bạn hạng 4, hai bot dẫn đầu hòa</h3>
        <div class="screen-preview">
          <ResultScreen
            report={{
              ...previewReport,
              result: { ranking: [1, 2, 3, 0], winner: null, reason: 'time-limit', endTick: 3600 },
              players: previewReport.players.map((player) => ({
                ...player,
                rooms: player.id === 1 || player.id === 2 ? 6 : 0,
              })),
            }}
            onReplay={() => {}}
            onHome={() => {}}
          />
        </div>
        <h3 class="t-label">Tạm dừng</h3>
        <div class="screen-preview">
          <PauseMenu onResume={() => {}} onSettings={() => setSettingsOpen(true)} onHome={() => {}} />
        </div>
      </Section>

      <Section id="benchmark" title="Đo hiệu năng có kiểm soát" note="Panel chỉ tải khi mở ?perf=1 hoặc /dev/perf.">
        <div class="row">
          <BenchmarkPanel report={null} onCopy={() => {}} onDownload={() => {}} />
          <BenchmarkPanel
            report={{ samples: 0, fps: null, frameP95Ms: null, cpuP95Ms: null }}
            onCopy={() => {}}
            onDownload={() => {}}
          />
          {['', 'Đã sao chép JSON.', 'Đã tải JSON.', 'Không sao chép được. Hãy tải JSON.'].map((status) => (
            <BenchmarkPanel
              key={status}
              report={{ samples: 1800, fps: 59.8, frameP95Ms: 18.2, cpuP95Ms: 6.4 }}
              status={status}
              onCopy={() => {}}
              onDownload={() => {}}
            />
          ))}
        </div>
      </Section>

      <Section
        id="employees"
        title="Nhân viên: 4 hướng × 2 frame"
        note="Cùng painter với nguồn atlas; đủ 5 phe. Từ trái: lên, xuống, trái, phải; mỗi hướng có 2 bước."
      >
        <PixelCanvas
          w={320}
          h={100}
          label="Nhân viên ở mọi hướng và bước chân"
          draw={(g) => {
            TEAM_IDS.forEach((t, row) => {
              g.text(4, row * 20 + 13, team[t].label, { size: 11, color: primitive.ink });
              ['up', 'down', 'left', 'right'].forEach((direction, column) => {
                for (const frame of [0, 1])
                  person(g, 100 + column * 48 + frame * 16, row * 20 + 5, t, frame, direction);
              });
            });
          }}
        />
      </Section>

      <Section
        id="match-feedback"
        title="Phản hồi trận"
        note="Thâu tóm, mất phòng và kỹ năng; không rung màn hình. Bản giảm chuyển động dùng viền tĩnh, không hạt/nảy."
      >
        <PixelCanvas
          w={640}
          h={360}
          label="Hiệu ứng thâu tóm và kỹ năng"
          animate
          draw={(g, t) => drawFeedback(g, t, false)}
        />
        <PixelCanvas w={640} h={360} label="Phản hồi giảm chuyển động" draw={(g) => drawFeedback(g, 100, true)} />
      </Section>

      <Section
        id="color"
        title="Màu"
        note="Primitive (ENDESGA 32) → semantic → team. Màu accent không bao giờ trùng màu đội."
      >
        <h3 class="t-label">Primitive</h3>
        <div class="swatches">
          {Object.entries(primitive).map(([k, v]) => (
            <Swatch key={k} name={k} hex={v} />
          ))}
        </div>
        <h3 class="t-label">Semantic</h3>
        <div class="swatches">
          {Object.entries(color).map(([k, v]) => (
            <Swatch key={k} name={k} hex={v} />
          ))}
        </div>
        <h3 class="t-label">Team</h3>
        <table class="dev-table t-body">
          <thead>
            <tr>
              <th>Phe</th>
              <th>main</th>
              <th>light</th>
              <th>dark</th>
              <th>thảm sàn</th>
              <th>ký hiệu</th>
            </tr>
          </thead>
          <tbody>
            {TEAM_IDS.map((id) => (
              <tr key={id}>
                <td>{team[id].label}</td>
                {(['main', 'light', 'dark', 'carpet'] as const).map((k) => (
                  <td key={k}>
                    <span class="mini" style={{ background: team[id][k] }} /> {team[id][k]}
                  </td>
                ))}
                <td>
                  {id !== 'neutral' ? (
                    <>
                      <span class="flag-wrap">
                        <Icon
                          name={
                            (['flagCircle', 'flagTriangle', 'flagSquare', 'flagDiamond'] as const)[
                              TEAM_IDS.indexOf(id)
                            ] ?? 'flagCircle'
                          }
                          tint={team[id].main}
                        />
                      </span>{' '}
                      {team[id].symbol}
                    </>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 class="t-label">Tương phản chữ (WCAG ≥ 4.5)</h3>
        <div class="pairs">
          {TEXT_PAIRS.map((p) => {
            const r = contrast(p.fg, p.bg);
            return (
              <div key={p.name} class="pair" style={{ background: p.bg, color: p.fg }}>
                <span class="t-body">{p.name}</span>
                <span class="t-label">
                  {r.toFixed(1)}:1 {r >= 4.5 ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section id="type" title="Chữ" note={`VT323 cho mọi chữ. Kiểm tra dấu: ${VN_TEST}`}>
        {Object.entries(typeScale).map(([k, v]) => (
          <div key={k} class="type-row">
            <span class="t-caption muted type-meta">
              type.{k} · {v.size}/{v.line}
            </span>
            <span class={`t-${k}`}>Thâu tóm phòng Kế toán</span>
          </div>
        ))}
        <div class="type-row">
          <span class="t-caption muted type-meta">dấu (label)</span>
          <span class="t-label">{VN_TEST}</span>
        </div>
        <div class="type-row">
          <span class="t-caption muted type-meta">digits 5×7 (canvas)</span>
          <PixelCanvas w={120} h={12} draw={(g) => countPlate(g, 30, 0, 1234567890 % 1000, 'p1')} />
        </div>
      </Section>

      <Section id="shape" title="Spacing, viền, góc vát, độ nổi">
        <div class="row">
          {space.map((s) => (
            <Spec key={s} label={`${s}`}>
              <span class="space-bar" style={{ width: `calc(var(--n) * ${s})` }} />
            </Spec>
          ))}
        </div>
        <div class="row" style={{ marginTop: 'calc(var(--n) * 12)' }}>
          {Object.keys(elevation).map((e) => (
            <Spec key={e} label={`elev.${e}`}>
              <div class={`elev-${e}`}>
                <div class="elev-box notched" />
              </div>
            </Spec>
          ))}
          <Spec label="góc vát 1lpx (phóng to)">
            <div style={{ transform: 'scale(3)', transformOrigin: 'left top', height: 'calc(var(--n) * 30)' }}>
              <div class="elev-box notched" style={{ width: 'calc(var(--n) * 12)', height: 'calc(var(--n) * 8)' }} />
            </div>
          </Spec>
        </div>
      </Section>

      <Section
        id="icons"
        title="Icon"
        note="Bitmap dạng chữ trong packages/design/src/icons.ts. Viền ink 1px, không emoji."
      >
        <div class="row">
          {ALL_ICONS.map((n) => (
            <Spec key={n} label={n}>
              <span class="icon-tile">
                <Icon name={n} tint={team.p1.main} />
              </span>
            </Spec>
          ))}
        </div>
      </Section>

      <Section
        id="motion"
        title="Chuyển động"
        note="Bấm để chạy lại. Tween dùng steps() để giữ cảm giác pixel. Bật 'Giảm chuyển động' để xem bản tĩnh."
      >
        <div class="row" key={motionKey}>
          {(['fast', 'base', 'slow'] as const).map((k) => (
            <Spec key={k} label={`motion.${k} · ${motion[k]}ms`}>
              <div class="motion-track">
                <span class="motion-dot" style={{ animationDuration: `${motion[k]}ms` }} />
              </div>
            </Spec>
          ))}
          <Spec label={`motion.pulse · ${motion.pulse}ms`}>
            <span class="pulse-box" />
          </Spec>
          <Spec label="Đóng dấu kết quả">
            <Stamp>Hạng 1</Stamp>
          </Spec>
        </div>
        <Button icon="play" onClick={() => setMotionKey((k) => k + 1)}>
          Chạy lại
        </Button>
      </Section>

      <Section id="buttons" title="Nút" note="Nhấn = dịch xuống đúng bằng bóng. Disabled luôn kèm lý do.">
        <table class="dev-table t-body state-table">
          <thead>
            <tr>
              <th />
              <th>default</th>
              <th>hover</th>
              <th>pressed</th>
              <th>focus</th>
              <th>disabled</th>
              <th>loading</th>
            </tr>
          </thead>
          <tbody>
            {(['primary', 'secondary', 'danger', 'ghost'] as const).map((v) => (
              <tr key={v}>
                <td>{v}</td>
                <td>
                  <Button variant={v}>Bắt đầu</Button>
                </td>
                <td>
                  <Button variant={v} forced="hover">
                    Bắt đầu
                  </Button>
                </td>
                <td>
                  <Button variant={v} forced="pressed">
                    Bắt đầu
                  </Button>
                </td>
                <td>
                  <Button variant={v} forced="focus">
                    Bắt đầu
                  </Button>
                </td>
                <td>
                  <Button variant={v} forced="disabled">
                    Bắt đầu
                  </Button>
                </td>
                <td>
                  <Button variant={v} loading>
                    Bắt đầu
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div class="row" style={{ marginTop: 'calc(var(--n) * 12)' }}>
          <Spec label="L + icon">
            <Button variant="primary" size="L" icon="play">
              Chơi với bot
            </Button>
          </Spec>
          <Spec label="L secondary">
            <Button size="L" icon="plus">
              Tạo phòng
            </Button>
          </Spec>
          <Spec label="M + icon">
            <Button icon="copy">Copy link</Button>
          </Spec>
          <Spec label="Icon button M (có tooltip)">
            <Button icon="gear" title="Cài đặt" aria-label="Cài đặt" />
          </Spec>
          <Spec label="Icon button L">
            <Button size="L" icon="soundOn" title="Tắt tiếng" aria-label="Tắt tiếng" />
          </Spec>
          <Spec label="disabled + lý do">
            <div>
              <Button variant="primary" size="L" disabled>
                Bắt đầu
              </Button>
              <div class="t-caption muted" style={{ marginTop: 'calc(var(--n) * 4)' }}>
                Chờ Minh sẵn sàng
              </div>
            </div>
          </Spec>
        </div>
      </Section>

      <Section id="panel" title="Panel" note="Header kiểu mặt tường: panel trông như một căn phòng.">
        <div class="row">
          <Panel title="Phòng tập" icon="bot" style={{ width: 'calc(var(--n) * 220)' }}>
            <p class="t-body" style={{ margin: 0 }}>
              Chơi với 1–3 bot. Không cần mạng.
            </p>
          </Panel>
          <Panel style={{ width: 'calc(var(--n) * 180)' }}>
            <p class="t-body" style={{ margin: 0 }}>
              Panel không có header, padding 12.
            </p>
          </Panel>
          <Panel title="Gọn" compact style={{ width: 'calc(var(--n) * 140)' }}>
            <p class="t-body" style={{ margin: 0 }}>
              padding 8
            </p>
          </Panel>
        </div>
      </Section>

      <Section id="forms" title="Điều khiển">
        <div class="row">
          <Spec label="Segmented: độ khó bot">
            <Segmented
              label="Độ khó"
              value={seg}
              onChange={setSeg}
              options={[
                { value: 'easy', label: 'Dễ' },
                { value: 'normal', label: 'Thường' },
              ]}
            />
          </Spec>
          <Spec label="Segmented: tỉ lệ gửi mặc định">
            <Segmented
              label="Tỉ lệ gửi"
              value={pct}
              onChange={setPct}
              options={[
                { value: '25', label: '25%' },
                { value: '50', label: '50%' },
                { value: '75', label: '75%' },
                { value: '100', label: '100%' },
              ]}
            />
          </Spec>
          <Spec label="Toggle">
            <div style={{ width: 'calc(var(--n) * 150)' }}>
              <Toggle label="Rung màn hình" checked={tog} onChange={setTog} />
              <Toggle label="Giảm chuyển động" checked={tog2} onChange={setTog2} />
            </div>
          </Spec>
          <Spec label="Checkbox">
            <Checkbox label="Hiện ký hiệu phe" checked={chk} onChange={setChk} />
          </Spec>
          <Spec label="Slider (bước 10%)">
            <div style={{ width: 'calc(var(--n) * 180)' }}>
              <Slider label="Âm lượng" value={vol} onChange={setVol} />
            </div>
          </Spec>
          <Spec label="Mã phòng (thử K7QM = đúng, mã khác = sai)">
            <RoomCodeInput onSubmit={(c) => c === 'K7QM'} />
          </Spec>
        </div>
      </Section>

      <Section id="feedback" title="Phản hồi">
        <div class="row">
          <Spec label="Player chip (DOM)">
            <div class="row tight">
              <PlayerChip t="p1" name="Bạn" rooms={4} you />
              <PlayerChip t="p2" name="Minh" rooms={3} />
              <PlayerChip t="p3" name="Bot A" rooms={0} eliminated />
            </div>
          </Spec>
          <Spec label="Keycap">
            <span class="row tight">
              <Kbd>Q</Kbd>
              <Kbd>W</Kbd>
              <Kbd>1</Kbd>
              <Kbd>Space</Kbd>
              <Kbd>Esc</Kbd>
            </span>
          </Spec>
          <Spec label="Badge">
            <span class="row tight">
              <Badge>Người</Badge>
              <Badge>Bot · Dễ</Badge>
              <Badge ok>
                <Icon name="check" /> Sẵn sàng
              </Badge>
            </span>
          </Spec>
          <Spec label="Tooltip">
            <Tooltip>
              TEAM DEV · Bạn
              <br />
              22 / 50 nhân viên
            </Tooltip>
          </Spec>
        </div>
        <div class="row" style={{ marginTop: 'calc(var(--n) * 12)' }}>
          <Toast tone="info">Minh đã vào phòng.</Toast>
          <Toast tone="success">Đã copy link mời.</Toast>
          <Toast tone="danger">Mất kết nối. Đang thử lại...</Toast>
        </div>
        <div class="row" style={{ marginTop: 'calc(var(--n) * 12)' }}>
          <Spec label="Stamp: thắng">
            <Stamp>Hạng 1 · Thâu tóm thành công</Stamp>
          </Spec>
          <Spec label="Stamp: hạng khác">
            <Stamp muted>Hạng 3</Stamp>
          </Spec>
        </div>
        <div style={{ marginTop: 'calc(var(--n) * 12)' }}>
          <Modal
            inline
            title="Rời trận?"
            onClose={() => {}}
            actions={
              <>
                <Button variant="ghost">Ở lại</Button>
                <Button variant="danger">Rời trận</Button>
              </>
            }
          >
            <p class="t-body" style={{ margin: 0 }}>
              Bot sẽ thay bạn đến hết trận.
            </p>
          </Modal>
          <div style={{ marginTop: 'calc(var(--n) * 8)' }}>
            <Button onClick={() => setModal(true)}>Mở modal thật (Esc để đóng)</Button>
          </div>
          {modal && (
            <Modal
              title="Rời trận?"
              onClose={() => setModal(false)}
              actions={
                <>
                  <Button variant="ghost" onClick={() => setModal(false)}>
                    Ở lại
                  </Button>
                  <Button variant="danger" onClick={() => setModal(false)}>
                    Rời trận
                  </Button>
                </>
              }
            >
              <p class="t-body" style={{ margin: 0 }}>
                Bot sẽ thay bạn đến hết trận.
              </p>
            </Modal>
          )}
        </div>
      </Section>

      <Section id="seats" title="Thẻ ghế (lobby, V1)">
        <div class="row">
          <SeatCard t="p1" seat={{ kind: 'human', name: 'Hoà', ready: true, host: true, you: true }} />
          <SeatCard t="p2" seat={{ kind: 'human', name: 'Minh', ready: false }} />
          <SeatCard t="p3" seat={{ kind: 'bot', level: 'normal' }} isHost />
          <SeatCard t="p4" seat={{ kind: 'empty' }} />
          <SeatCard t="p2" seat={{ kind: 'human', name: 'Lan', ready: true, away: 12 }} />
        </div>
      </Section>

      <Section
        id="hud"
        title="HUD (canvas)"
        note="Biển số: thường · 2 và 3 chữ số · đầy (nhấp nháy) · bị tấn công · bị khoá · ẩn · trung lập. Kỹ năng: sẵn sàng · hồi chiêu · đang ngắm · không dùng được."
      >
        <div class="frame">
          <PixelCanvas w={640} h={110} draw={drawHudParts} animate label="Các phần HUD" />
        </div>
      </Section>

      <Section id="rooms" title="Trạng thái phòng (canvas)">
        <div class="frame">
          <PixelCanvas w={640} h={116} draw={drawRoomStates} animate label="Trạng thái phòng 1" />
        </div>
        <div class="frame" style={{ marginTop: 'calc(var(--n) * 8)' }}>
          <PixelCanvas w={640} h={116} draw={drawRoomStates2} animate label="Trạng thái phòng 2" />
        </div>
      </Section>

      <Section
        id="depts"
        title="Nội thất theo phòng ban"
        note="Nội thất tự bố trí theo dept + kích thước phòng. Màu ghế theo phe."
      >
        <div class="frame">
          <PixelCanvas w={640} h={340} draw={drawDepts} label="Các phòng ban" />
        </div>
      </Section>
    </div>
  );
}
