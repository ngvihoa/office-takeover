import { scaleFor } from '@ot/design';
import type Phaser from 'phaser';
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { DurationHistogram } from '../game/metrics';
import type { MatchTelemetry } from '../game/telemetry';
import { BenchmarkPanel } from '../ui/BenchmarkPanel';

// Loaded only for ?perf=1 or /dev/perf. CPU work is not GPU presentation time.
export function measureGame(game: Phaser.Game) {
  let cpu = new DurationHistogram();
  let match: MatchTelemetry | undefined;
  let start = 0;
  let active = false;
  const begin = () => {
    const next = game.registry.get('telemetry') as MatchTelemetry | undefined;
    if (next !== match) {
      cpu = new DurationHistogram();
      match = next;
    }
    active = Boolean(game.registry.get('matchActive'));
    if (active) start = performance.now();
  };
  const end = () => {
    if (active && game.registry.get('matchActive')) cpu.add(performance.now() - start);
  };
  game.events.on('prestep', begin);
  game.events.on('postrender', end);
  game.registry.set('cpuP95', () => (game.registry.get('telemetry') === match ? cpu.percentile(0.95) : null));
  const report = () => {
    const telemetry = game.registry.get('telemetry') as MatchTelemetry | undefined;
    return telemetry ? { seed: 7, ...telemetry.report() } : null;
  };
  Object.assign(window, { officeBenchmark: report });
  const host = document.createElement('div');
  host.className = 'ot-root benchmark-overlay';
  document.body.append(host);

  function Controls() {
    const [current, setCurrent] = useState(report);
    const [scale, setScale] = useState(() => scaleFor(innerWidth, innerHeight));
    const [status, setStatus] = useState('');
    useEffect(() => {
      const timer = window.setInterval(() => {
        setCurrent(report());
        setScale(scaleFor(innerWidth, innerHeight));
      }, 1000);
      return () => clearInterval(timer);
    }, []);
    const json = () => JSON.stringify(report(), null, 2);
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(json());
        setStatus('Đã sao chép JSON.');
      } catch {
        setStatus('Không sao chép được. Hãy tải JSON.');
      }
    };
    const download = () => {
      const url = URL.createObjectURL(new Blob([json()], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'office-benchmark.json';
      link.click();
      URL.revokeObjectURL(url);
      setStatus('Đã tải JSON.');
    };
    return (
      <div data-scale={scale}>
        <BenchmarkPanel report={current} status={status} onCopy={copy} onDownload={download} />
      </div>
    );
  }
  render(<Controls />, host);
  game.events.once('destroy', () => {
    game.events.off('prestep', begin);
    game.events.off('postrender', end);
    game.registry.remove('cpuP95');
    Reflect.deleteProperty(window, 'officeBenchmark');
    render(null, host);
    host.remove();
  });
}
