import type { TelemetryMatch } from '@ot/telemetry';
import { Button, Panel } from './components/primitives';
import './benchmark.css';

export function BenchmarkPanel({
  report,
  status = '',
  onCopy,
  onDownload,
}: {
  report: Pick<TelemetryMatch, 'samples' | 'fps' | 'frameP95Ms' | 'cpuP95Ms'> | null;
  status?: string;
  onCopy: () => void;
  onDownload: () => void;
}) {
  return (
    <Panel title="Đo hiệu năng có kiểm soát" class="benchmark-panel" compact>
      <div class="benchmark-stack">
        <p class="t-body">Seed 7 · 4 bot: Thường / Dễ / Thường / Dễ</p>
        <p class="t-body" aria-live="off">
          {report?.samples
            ? `${report.samples} mẫu · ${report.fps} FPS · Frame p95 ${report.frameP95Ms}ms · CPU p95 ${report.cpuP95Ms ?? '—'}ms`
            : 'Đang làm nóng: bỏ 120 frame đầu.'}
        </p>
        <div class="benchmark-actions">
          <Button disabled={!report} onClick={onCopy}>
            Sao chép JSON
          </Button>
          <Button disabled={!report} onClick={onDownload}>
            Tải JSON
          </Button>
        </div>
        <p class="t-body muted" role="status">
          {status || 'Giữ nguyên viewport và focus khi đo.'}
        </p>
      </div>
    </Panel>
  );
}
