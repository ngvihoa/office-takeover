import { FLAG_FOR_TEAM } from '../icons';
import { color, primitive as p, type TeamId, team } from '../tokens';
import { digits, digitsWidth, dither, icon, notchedBox, outline, type Painter } from './painter';

/** Hard drop shadow under a notched box (elevation 1–3). */
export function shadow(g: Painter, x: number, y: number, w: number, h: number, elev: number): void {
  if (elev > 0) g.rect(x + 1, y + h, w - 2, elev, p.ink);
}

export function flag(g: Painter, t: TeamId, x: number, y: number): void {
  if (t === 'neutral') return;
  icon(g, FLAG_FOR_TEAM[t], x, y, team[t].main);
}

export interface PlateState {
  /** Room is at capacity: frame blinks (pass the current blink phase). */
  full?: boolean;
  blinkOn?: boolean;
  underAttack?: boolean;
  locked?: boolean;
  hidden?: boolean;
}

/** Door-sign count plate. Anchored by its top-right corner. Returns the plate width. */
export function countPlate(g: Painter, right: number, top: number, n: number, t: TeamId, s: PlateState = {}): number {
  const label = s.hidden ? '?' : String(n);
  const w = label.length >= 3 ? 32 : label.length === 2 ? 26 : 20;
  const x = right - w;
  const frame = s.full && s.blinkOn ? p.white : team[t].main;
  notchedBox(g, x, top, w, 15, frame);
  g.rect(x + 2, top + 2, w - 4, 11, p.ink);
  digits(g, x + Math.floor(w / 2), top + 4, label, p.white, 'center');
  shadow(g, x, top, w, 15, 1);
  if (s.locked) icon(g, 'lock', x - 13, top + 1);
  else if (s.underAttack) {
    notchedBox(g, x - 9, top + 4, 7, 7, color.danger);
    g.rect(x - 6, top + 5, 1, 3, p.white);
    g.rect(x - 6, top + 9, 1, 1, p.white);
  }
  return w;
}

export interface ChipState {
  you?: boolean;
  eliminated?: boolean;
  disconnected?: boolean;
}

/** Player chip for the HUD top bar. Width is fixed by the caller (names are pre-measured). */
export function playerChip(
  g: Painter,
  x: number,
  y: number,
  w: number,
  t: TeamId,
  name: string,
  rooms: number,
  s: ChipState = {},
): void {
  const fill = s.eliminated ? color.surfaceSunken : color.surfacePanel;
  notchedBox(g, x, y, w, 14, fill);
  shadow(g, x, y, w, 14, 1);
  flag(g, t, x + 3, y + 3);
  const textColor = s.eliminated ? color.textMuted : color.textPrimary;
  g.text(x + 13, y + 11, name, { size: 11, color: textColor });
  if (s.you) g.rect(x + 13, y + 12, Math.min(w - 30, name.length * 5), 1, team[t].main);
  if (s.eliminated) g.rect(x + 12, y + 7, w - 16, 1, color.textMuted);
  if (s.disconnected) icon(g, 'bot', x + w - 26, y + 1);
  else digits(g, x + w - 4, y + 4, String(rooms), textColor, 'right');
}

export type SkillState = 'ready' | 'cooldown' | 'aiming' | 'disabled';

export function skillButton(
  g: Painter,
  x: number,
  y: number,
  iconName: 'skillDeadline' | 'skillCoffee',
  key: string,
  state: SkillState,
  opts: { cooldownFrac?: number; secs?: number; flash?: boolean } = {},
): void {
  const fill = state === 'aiming' ? color.accent : state === 'disabled' ? color.surfaceSunken : color.surfacePanel;
  notchedBox(g, x, y, 20, 20, fill);
  shadow(g, x, y, 20, 20, 1);
  icon(g, iconName, x + 2, y + 2);
  if (state === 'cooldown') {
    const h = Math.round(18 * (opts.cooldownFrac ?? 0.5));
    dither(g, x + 1, y + 1, 18, h, p.ink);
    const label = String(opts.secs ?? 0);
    const lw = digitsWidth(label);
    g.rect(x + 10 - Math.ceil(lw / 2) - 1, y + 6, lw + 2, 9, p.ink);
    digits(g, x + 10, y + 7, label, p.white, 'center');
  }
  if (state === 'disabled') dither(g, x + 1, y + 1, 18, 18, p.gray100);
  if (opts.flash && state === 'ready') outline(g, x - 1, y - 1, 22, 22, color.accent);
  // key tab
  g.rect(x - 2, y - 3, 7, 8, p.ink);
  g.text(x + 1, y + 4, key, { size: 9, color: p.white, align: 'center' });
}

/** 4-step send ratio meter (25/50/75/100%). */
export function sendMeter(g: Painter, x: number, y: number, pct: 25 | 50 | 75 | 100): void {
  const w = 84;
  notchedBox(g, x, y, w, 14, color.surfacePanel);
  shadow(g, x, y, w, 14, 1);
  g.text(x + 4, y + 11, 'Gửi', { size: 11, color: color.textPrimary });
  const on = pct / 25;
  for (let i = 0; i < 4; i++) {
    g.rect(x + 22 + i * 10, y + 3, 8, 8, p.ink);
    g.rect(x + 23 + i * 10, y + 4, 6, 6, i < on ? color.accent : p.white);
  }
  digits(g, x + w - 4, y + 4, `${pct}%`, color.textPrimary, 'right');
}

export function timerChip(g: Painter, x: number, y: number, secs: number, blinkOn = true): void {
  const w = 52;
  const warn = secs < 60;
  const blink = secs < 10 && !blinkOn;
  notchedBox(g, x, y, w, 14, warn ? color.warning : color.surfacePanel);
  shadow(g, x, y, w, 14, 1);
  icon(g, 'clock', x + 2, y + 1);
  const mm = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, '0');
  if (!blink) digits(g, x + w - 4, y + 4, `${mm}:${ss}`, color.textPrimary, 'right');
}

/** Small ink tooltip anchored by its bottom-centre arrow tip. Lines are drawn as static text. */
export function tooltip(g: Painter, cx: number, tipY: number, lines: string[], w = 110): void {
  const h = lines.length * 12 + 6;
  const x = cx - Math.floor(w / 2);
  const y = tipY - 3 - h;
  notchedBox(g, x, y, w, h, p.ink, p.ink);
  shadow(g, x, y, w, h, 1);
  for (let i = 0; i < 3; i++) g.rect(cx - 2 + i, y + h + i, 5 - 2 * i, 1, p.ink);
  lines.forEach((line, i) => {
    g.text(x + 4, y + 13 + i * 12, line, { size: 11, color: p.white });
  });
}
