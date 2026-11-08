export const MAX_FRAME_SAMPLES = 3600;
export const WARMUP_FRAMES = 120;

export function percentile(values: readonly number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Number(sorted[Math.ceil(sorted.length * p) - 1]?.toFixed(2));
}

// The ordinary match sampler retains only intervals, never individual frame events.
export class FrameSamples {
  private intervals: number[] = [];

  add(interval: number) {
    if (this.intervals.length < MAX_FRAME_SAMPLES && Number.isFinite(interval) && interval > 0)
      this.intervals.push(interval);
  }

  report() {
    const values = this.intervals.slice(WARMUP_FRAMES);
    return {
      samples: values.length,
      fps: values.length ? Number(((1000 * values.length) / values.reduce((a, b) => a + b, 0)).toFixed(1)) : null,
      frameP50Ms: percentile(values, 0.5),
      frameP95Ms: percentile(values, 0.95),
      framesOver20Ms: values.filter((ms) => ms > 20).length,
    };
  }
}
