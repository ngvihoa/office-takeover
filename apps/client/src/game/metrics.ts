// Fixed memory for the entire match: bucket 0 is zero, 1..100 are (n-1, n] ms,
// and 101 is overflow (>100ms). No warm-up discard or sample budget.
export class DurationHistogram {
  private buckets = new Float64Array(102);
  count = 0;
  totalMs = 0;
  maxMs: number | null = null;

  add(ms: number) {
    if (!Number.isFinite(ms) || ms < 0) return;
    const bucket = Math.min(101, Math.ceil(ms));
    this.buckets[bucket] = (this.buckets[bucket] ?? 0) + 1;
    this.count++;
    this.totalMs += ms;
    this.maxMs = Math.max(this.maxMs ?? 0, ms);
  }

  percentile(p: number): number | null {
    if (!this.count) return null;
    // Nearest-rank: the first bucket reaching ceil(count*p). Use its upper edge,
    // capped at the exact max; overflow uses the exact max (not a false 100ms).
    const rank = Math.ceil(this.count * p);
    let cumulative = 0;
    for (let bucket = 0; bucket < this.buckets.length; bucket++) {
      cumulative += this.buckets[bucket] ?? 0;
      if (cumulative >= rank) return Math.min(bucket === 101 ? Number.POSITIVE_INFINITY : bucket, this.maxMs ?? 0);
    }
    return this.maxMs;
  }
}

// No individual frame events are retained. FPS and the >20ms count use raw durations,
// not quantized buckets; in particular exactly 20ms is not counted as slow.
export class FrameSamples {
  private durations = new DurationHistogram();
  private over20 = 0;

  add(interval: number) {
    if (!Number.isFinite(interval) || interval <= 0) return;
    this.durations.add(interval);
    if (interval > 20) this.over20++;
  }

  report() {
    return {
      samples: this.durations.count,
      fps: this.durations.count ? Number(((1000 * this.durations.count) / this.durations.totalMs).toFixed(1)) : null,
      frameP50Ms: this.durations.percentile(0.5),
      frameP95Ms: this.durations.percentile(0.95),
      maxFrameMs: this.durations.maxMs,
      framesOver20Ms: this.over20,
    };
  }
}
