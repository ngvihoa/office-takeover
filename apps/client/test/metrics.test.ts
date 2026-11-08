import { expect, it } from 'vitest';
import { FrameSamples } from '../src/game/metrics';

it('reports every accepted interval from the first frame, including the slow tail', () => {
  const frames = new FrameSamples();
  for (const interval of [10, 20, 30, 40, 50]) frames.add(interval);
  expect(frames.report()).toEqual({
    samples: 5,
    fps: 33.3,
    frameP50Ms: 30,
    frameP95Ms: 50,
    maxFrameMs: 50,
    framesOver20Ms: 3,
  });
});

it('counts late slow frames beyond 3600 and returns null timings only when empty', () => {
  const frames = new FrameSamples();
  expect(frames.report()).toEqual({
    samples: 0,
    fps: null,
    frameP50Ms: null,
    frameP95Ms: null,
    maxFrameMs: null,
    framesOver20Ms: 0,
  });
  for (let i = 0; i < 3600; i++) frames.add(10);
  for (let i = 0; i < 200; i++) frames.add(1000);
  expect(frames.report()).toEqual({
    samples: 3800,
    fps: 16.1,
    frameP50Ms: 10,
    frameP95Ms: 1000,
    maxFrameMs: 1000,
    framesOver20Ms: 200,
  });
});

it('uses nearest-rank upper-edge quantiles, raw FPS, and an exact >20ms boundary', () => {
  const frames = new FrameSamples();
  for (const ms of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) frames.add(ms);
  for (const ms of [0.2, 1.1, 1.2, 1.3, 1.4, 19.99, 20, 20.01, 100, 100.01]) frames.add(ms);
  expect(frames.report()).toEqual({
    samples: 10,
    fps: 37.7, // 10 intervals across 265.21ms, not the sum of bucket edges.
    frameP50Ms: 2,
    frameP95Ms: 100.01,
    maxFrameMs: 100.01,
    framesOver20Ms: 3,
  });
});

it('caps bucket representatives at the exact max without rounding that max', () => {
  const frames = new FrameSamples();
  frames.add(16.123456);
  expect(frames.report()).toMatchObject({ frameP50Ms: 16.123456, frameP95Ms: 16.123456, maxFrameMs: 16.123456 });
});
