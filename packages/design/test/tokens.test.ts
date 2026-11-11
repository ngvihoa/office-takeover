import { describe, expect, it } from 'vitest';
import { contrast } from '../src/contrast';
import { EMOTE_ICONS, ICONS, INK_MAP } from '../src/icons';
import { color, DERIVED, map, PALETTE, primitive, scaleFor, TEAM_IDS, TEXT_PAIRS, team } from '../src/tokens';

const allowed = new Set<string>([...PALETTE, ...DERIVED]);

describe('palette discipline', () => {
  it('every primitive, semantic and map token is a palette color', () => {
    for (const v of [...Object.values(primitive), ...Object.values(color), ...Object.values(map)]) {
      expect(PALETTE as readonly string[]).toContain(v);
    }
  });

  it('team colors use the palette, carpets use the derived set', () => {
    for (const id of TEAM_IDS) {
      const t = team[id];
      for (const v of [t.main, t.light, t.dark]) expect(PALETTE as readonly string[]).toContain(v);
      expect(DERIVED as readonly string[]).toContain(t.carpet);
    }
  });

  it('icon ink map only uses palette colors', () => {
    for (const v of Object.values(INK_MAP)) expect(allowed.has(v)).toBe(true);
  });

  it('accent is never a team color', () => {
    const teamColors = TEAM_IDS.flatMap((id) => [team[id].main, team[id].light, team[id].dark]);
    expect(teamColors).not.toContain(color.accent);
  });
});

describe('contrast', () => {
  it.each(TEXT_PAIRS)('$name meets 4.5:1', ({ fg, bg }) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('icons', () => {
  it('every icon row has the same width and only known characters', () => {
    for (const [name, rows] of Object.entries(ICONS)) {
      const w = rows[0]?.length;
      for (const row of rows) {
        expect(row.length, name).toBe(w);
        for (const ch of row) expect(ch === '.' || ch === 'o' || ch in INK_MAP, `${name}: ${ch}`).toBe(true);
      }
    }
  });

  it('defines 6 pixel emote icons with 12x12 dimensions', () => {
    expect(EMOTE_ICONS.length).toBe(6);
    for (const name of EMOTE_ICONS) {
      expect(ICONS[name]?.length).toBe(12);
      expect(ICONS[name]?.[0]?.length).toBe(12);
    }
  });
});

describe('scaleFor', () => {
  it('uses the largest integer scale that fits', () => {
    expect(scaleFor(1280, 720)).toBe(2);
    expect(scaleFor(1920, 1080)).toBe(3);
    expect(scaleFor(1366, 768)).toBe(2);
    expect(scaleFor(600, 300)).toBe(1);
  });
});
