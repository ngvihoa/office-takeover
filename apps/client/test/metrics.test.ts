import { expect, it } from 'vitest';
import { FrameSamples } from '../src/game/metrics';

it('reports real frame intervals after warm-up, including the slow tail', () => {
  const frames = new FrameSamples();
  for (let i = 0; i < 120; i++) frames.add(1);
  for (const interval of [10, 20, 30, 40, 50]) frames.add(interval);
  expect(frames.report()).toEqual({
    samples: 5,
    fps: 33.3,
    frameP50Ms: 30,
    frameP95Ms: 50,
    framesOver20Ms: 3,
  });
});

it('keeps at most 3600 intervals and returns null timings before warm-up completes', () => {
  const frames = new FrameSamples();
  expect(frames.report()).toEqual({
    samples: 0,
    fps: null,
    frameP50Ms: null,
    frameP95Ms: null,
    framesOver20Ms: 0,
  });
  for (let i = 0; i < 3600; i++) frames.add(10);
  for (let i = 0; i < 200; i++) frames.add(1000);
  expect(frames.report()).toEqual({
    samples: 3480,
    fps: 100,
    frameP50Ms: 10,
    frameP95Ms: 10,
    framesOver20Ms: 0,
  });
});
