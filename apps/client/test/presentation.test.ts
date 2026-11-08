// @vitest-environment happy-dom
import { h, render } from 'preact';
import { afterEach, describe, expect, it } from 'vitest';
import type { MatchReport } from '../src/game/session';
import { ResultScreen } from '../src/ui/screens';

afterEach(() => {
  render(null, document.body);
});

describe('match results without a unique winner', () => {
  it.each([
    { ranking: [1, 2, 0, 3], rank: 3 },
    { ranking: [1, 2, 3, 0], rank: 4 },
    { ranking: [0, 1, 2, 3], rank: 1 },
  ] as const)('keeps the personal rank $rank separate from the match outcome', ({ ranking, rank }) => {
    const report: MatchReport = {
      seed: 7,
      bots: ['easy', 'normal', 'easy'],
      result: { ranking: [...ranking], winner: null, reason: 'time-limit', endTick: 3600 },
      players: ranking.map((id, index) => ({
        id,
        name: id === 0 ? 'Bạn' : `Bot ${id}`,
        rooms: index < 2 ? 6 : 0,
        sent: 100 - index,
        captured: 6 - index,
      })),
    };
    render(h(ResultScreen, { report, onReplay: () => {}, onHome: () => {} }), document.body);
    expect(document.querySelector('h1')?.textContent).toBe(`Hạng ${rank}`);
    expect(document.body.textContent).toContain('Không có phe thắng chung cuộc.');
    expect(document.body.textContent).not.toContain('Thâu tóm thành công');
  });
});
