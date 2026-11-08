import type Phaser from 'phaser';

// Dev-only, bounded samples. CPU work ends at postrender; GPU presentation is not measured.
const frames: { interval: number; cpu: number; squads: number }[] = [];

export function measureGame(game: Phaser.Game) {
  Object.assign(window, { officeBenchmark: benchmarkReport });
  frames.length = 0;
  let start = 0;
  let previous = 0;
  let interval = 0;
  game.events.on('prestep', () => {
    start = performance.now();
    interval = previous ? start - previous : 0;
    previous = start;
  });
  game.events.on('postrender', () => {
    if (frames.length >= 3600 || !game.registry.get('matchActive') || !interval) return;
    frames.push({ interval, cpu: performance.now() - start, squads: game.registry.get('squads') ?? 0 });
  });
}

export function benchmarkReport() {
  const samples = frames.slice(120); // Discard startup/font/shader warm-up.
  const percentile = (values: number[], p: number) => {
    values.sort((a, b) => a - b);
    return Number((values[Math.floor((values.length - 1) * p)] ?? 0).toFixed(2));
  };
  return {
    samples: samples.length,
    durationSeconds: Number((samples.reduce((sum, f) => sum + f.interval, 0) / 1000).toFixed(1)),
    fps: Number((1000 / (samples.reduce((sum, f) => sum + f.interval, 0) / samples.length)).toFixed(1)),
    frameP50Ms: percentile(
      samples.map((f) => f.interval),
      0.5,
    ),
    frameP95Ms: percentile(
      samples.map((f) => f.interval),
      0.95,
    ),
    cpuP95Ms: percentile(
      samples.map((f) => f.cpu),
      0.95,
    ),
    framesOver20Ms: samples.filter((f) => f.interval > 20).length,
    maxSquads: Math.max(0, ...samples.map((f) => f.squads)),
    viewport: [innerWidth, innerHeight],
    devicePixelRatio,
    userAgent: navigator.userAgent,
  };
}
