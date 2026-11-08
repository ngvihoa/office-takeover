import type { TeamId } from '@ot/design';
import { type BotLevel, SEND_PCTS } from '@ot/sim';
import type { MatchReport } from '../game/session';
import type { Settings } from '../game/settings';
import { Modal } from './components/composite';
import { Segmented, Slider, Toggle } from './components/controls';
import { Badge, Button, Flag, Panel, Stamp } from './components/primitives';
import './screens.css';

const TEAMS: TeamId[] = ['p1', 'p2', 'p3', 'p4'];
const BOT_NAMES = ['Bot An', 'Bot Bình', 'Bot Chi'];
const LEVELS = [
  { value: 'easy', label: 'Dễ' },
  { value: 'normal', label: 'Thường' },
] as const;

export function HomeScreen({ onPlay, onSettings }: { onPlay: () => void; onSettings: () => void }) {
  return (
    <section class="screen-layer" aria-label="Trang chủ">
      <Panel class="screen-panel home-screen" title="Văn phòng của bạn">
        <div class="screen-stack home-content">
          <h1 class="t-hero">OFFICE TAKEOVER</h1>
          <p class="t-label muted">Thâu tóm văn phòng, từng phòng một</p>
          <div class="screen-stack home-buttons">
            <Button variant="primary" size="L" icon="play" block onClick={onPlay}>
              Chơi với bot
            </Button>
            <Button icon="gear" block onClick={onSettings}>
              Cài đặt
            </Button>
          </div>
          <p class="t-body muted">1–3 bot · Trận chạy trên trình duyệt</p>
        </div>
      </Panel>
    </section>
  );
}

export function OfflineSetup({
  bots,
  onChange,
  onStart,
  onBack,
}: {
  bots: (BotLevel | null)[];
  onChange: (bots: (BotLevel | null)[]) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  const active = bots.filter((bot) => bot !== null).length;
  const update = (index: number, value: BotLevel | null) => {
    if (value === null && active <= 1) return;
    onChange(bots.map((bot, i) => (i === index ? value : bot)));
  };
  return (
    <section class="screen-layer" aria-label="Thiết lập trận offline">
      <Panel class="screen-panel setup-screen" title="Phòng tập" icon="bot">
        <div class="screen-stack">
          <div class="screen-row">
            <h1 class="t-title">Thiết lập trận</h1>
            <Badge>{active} / 3 bot</Badge>
          </div>
          <p class="t-body muted">Bạn đấu với 1–3 bot. Chọn độ khó từng đối thủ.</p>
          <div class="screen-stack bot-list">
            {bots.map((level, index) => (
              <div class="screen-row bot-row" key={BOT_NAMES[index]}>
                <span class="screen-player">
                  <Flag t={TEAMS[index + 1] ?? 'neutral'} />
                  {BOT_NAMES[index]}
                </span>
                {level === null ? (
                  <>
                    <span class="muted">Ghế trống</span>
                    <Button icon="plus" aria-label={`Thêm ${BOT_NAMES[index]}`} onClick={() => update(index, 'easy')}>
                      Thêm bot
                    </Button>
                  </>
                ) : (
                  <>
                    <Segmented
                      label={`Độ khó ${BOT_NAMES[index]}`}
                      value={level}
                      options={LEVELS}
                      onChange={(value) => update(index, value)}
                    />
                    <Button
                      disabled={active <= 1}
                      title={active <= 1 ? 'Cần ít nhất 1 bot' : undefined}
                      aria-label={`Bỏ ${BOT_NAMES[index]}`}
                      onClick={() => update(index, null)}
                    >
                      Bỏ bot
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
          {active <= 1 && <p class="t-body muted">Cần ít nhất 1 bot để bắt đầu.</p>}
          <div class="screen-map t-body">
            <span class="upper">Bản đồ: Tầng 1</span>
            <span class="muted">office-01 · Bản đồ duy nhất hiện có</span>
          </div>
          <div class="screen-actions">
            <Button icon="back" onClick={onBack}>
              Quay lại
            </Button>
            <Button variant="primary" size="L" icon="play" disabled={active < 1} onClick={onStart}>
              Bắt đầu
            </Button>
          </div>
        </div>
      </Panel>
    </section>
  );
}

export function SettingsDialog({
  settings,
  onChange,
  onClose,
  inline,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onClose: () => void;
  inline?: boolean;
}) {
  return (
    <Modal
      inline={inline}
      title="Cài đặt"
      onClose={onClose}
      actions={
        <Button variant="primary" onClick={onClose}>
          Xong
        </Button>
      }
    >
      <div class="screen-stack settings-content">
        <Slider label="Âm lượng" value={settings.volume} onChange={(volume) => onChange({ ...settings, volume })} />
        <Toggle
          label="Giảm chuyển động"
          checked={settings.reducedMotion}
          onChange={(reducedMotion) => onChange({ ...settings, reducedMotion })}
        />
        <Toggle
          label="Rung màn hình"
          checked={settings.screenShake}
          onChange={(screenShake) => onChange({ ...settings, screenShake })}
        />
        {settings.reducedMotion && <p class="t-body muted">Giảm chuyển động cũng tắt rung màn hình.</p>}
        <Toggle
          label="Ký hiệu phe trên bản đồ"
          checked={settings.symbols}
          onChange={(symbols) => onChange({ ...settings, symbols })}
        />
        <div class="screen-stack">
          <Toggle
            label="Gửi số liệu ẩn danh"
            checked={settings.telemetry}
            onChange={(telemetry) => onChange({ ...settings, telemetry })}
          />
          <p class="t-body muted">
            Gửi hiệu năng, thiết lập và kết quả trận cùng mã trình duyệt ngẫu nhiên; không gửi tên, email hay IP.
          </p>
        </div>
        <div class="screen-stack">
          <span class="t-body">Tỉ lệ điều nhân viên mặc định</span>
          <Segmented
            label="Tỉ lệ điều nhân viên mặc định"
            value={String(settings.sendPct)}
            options={SEND_PCTS.map((pct) => ({ value: String(pct), label: `${pct}%` }))}
            onChange={(value) => {
              const sendPct = SEND_PCTS.find((pct) => String(pct) === value);
              if (sendPct !== undefined) onChange({ ...settings, sendPct });
            }}
          />
        </div>
      </div>
    </Modal>
  );
}

function downloadReport(report: MatchReport) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `office-takeover-${report.seed}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function ResultScreen({
  report,
  onReplay,
  onHome,
}: {
  report: MatchReport;
  onReplay: () => void;
  onHome: () => void;
}) {
  const rank = report.result.ranking.indexOf(0) + 1;
  return (
    <section class="screen-layer" aria-label="Kết quả trận">
      <Panel class="screen-panel result-screen" title="Báo cáo cuối trận">
        <div class="screen-stack">
          <h1 class="result-heading">
            <Stamp muted={report.result.winner !== 0}>
              {`Hạng ${rank}`}
              {report.result.winner === 0 ? ' · Thâu tóm thành công' : ''}
            </Stamp>
          </h1>
          <p class="t-body muted">
            {report.result.winner === null && 'Không có phe thắng chung cuộc. '}
            {report.result.reason === 'time-limit' ? 'Hết giờ làm việc' : 'Chỉ còn một phe trụ lại'} · Thời gian:{' '}
            {report.result.endTick / 10} giây
          </p>
          <table class="result-table t-body">
            <caption class="t-body">Thứ hạng và thống kê từng phe</caption>
            <thead>
              <tr>
                <th scope="col">Hạng / Phe</th>
                <th scope="col">Phòng cuối</th>
                <th scope="col">Đã điều</th>
                <th scope="col">Đã chiếm</th>
              </tr>
            </thead>
            <tbody>
              {report.result.ranking.map((id, index) => {
                const player = report.players.find((entry) => entry.id === id);
                if (!player) return null;
                return (
                  <tr key={id}>
                    <th scope="row">
                      <span class="screen-player">
                        {index + 1}. <Flag t={TEAMS[id] ?? 'neutral'} />
                        {player.name}
                      </span>
                    </th>
                    <td>{player.rooms}</td>
                    <td>{player.sent}</td>
                    <td>{player.captured}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div class="screen-row t-body">
            <span class="muted">Seed thử nghiệm: {report.seed}</span>
            <Button variant="ghost" onClick={() => downloadReport(report)}>
              Tải báo cáo JSON
            </Button>
          </div>
          <div class="screen-actions">
            <Button onClick={onHome}>Trang chủ</Button>
            <Button variant="primary" size="L" icon="play" onClick={onReplay}>
              Chơi lại
            </Button>
          </div>
        </div>
      </Panel>
    </section>
  );
}

export function PauseMenu({
  onResume,
  onSettings,
  onHome,
}: {
  onResume: () => void;
  onSettings: () => void;
  onHome: () => void;
}) {
  return (
    <section class="screen-layer pause-layer" aria-label="Trận đang tạm dừng">
      <Panel class="screen-panel pause-screen" title="Tạm dừng">
        <div class="screen-stack">
          <h1 class="t-title">Nghỉ tay một chút</h1>
          <p class="t-body muted">Trận offline đã tạm dừng.</p>
          <Button variant="primary" size="L" icon="play" block onClick={onResume}>
            Tiếp tục
          </Button>
          <Button icon="gear" block onClick={onSettings}>
            Cài đặt
          </Button>
          <Button variant="danger" block onClick={onHome}>
            Về trang chủ
          </Button>
        </div>
      </Panel>
    </section>
  );
}
