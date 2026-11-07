// Single source of truth for the "Office Pixel" design system (docs/09-design-system.md).
// All sizes are logical pixels (lpx) on the 640x360 screen; multiply by the scale factor S when rendering.

/** ENDESGA 32 palette (art/palette.hex). Every opaque pixel must come from here or `derived`. */
export const PALETTE = [
  '#be4a2f',
  '#d77643',
  '#ead4aa',
  '#e4a672',
  '#b86f50',
  '#733e39',
  '#3e2731',
  '#a22633',
  '#e43b44',
  '#f77622',
  '#feae34',
  '#fee761',
  '#63c74d',
  '#3e8948',
  '#265c42',
  '#193c3e',
  '#124e89',
  '#0099db',
  '#2ce8f5',
  '#ffffff',
  '#c0cbdc',
  '#8b9bb4',
  '#5a6988',
  '#3a4466',
  '#262b44',
  '#181425',
  '#ff0044',
  '#68386c',
  '#b55088',
  '#f6757a',
  '#e8b796',
  '#c28569',
] as const;

/** Team-tinted carpet colors: sand blended with the team color (28%, neutral 15%). The only off-palette colors. */
export const DERIVED = ['#a8c3b8', '#e8a98d', '#c4d090', '#f0c989', '#dccbac'] as const;

export const primitive = {
  ink: '#181425',
  white: '#ffffff',
  gray100: '#c0cbdc',
  gray300: '#8b9bb4',
  gray500: '#5a6988',
  gray700: '#3a4466',
  sand: '#ead4aa',
  tan: '#e4a672',
  wood: '#b86f50',
  woodDark: '#733e39',
  clay: '#c28569',
  skin: '#e8b796',
  hair: '#3e2731',
  plum: '#68386c',
  magenta: '#b55088',
  green900: '#265c42',
  green700: '#3e8948',
  green500: '#63c74d',
  red700: '#a22633',
  red500: '#e43b44',
  orange: '#f77622',
  amber: '#feae34',
  yellow: '#fee761',
  navy: '#124e89',
  blue: '#0099db',
  cyan: '#2ce8f5',
  pink: '#f6757a',
  slate: '#262b44',
} as const;

const p = primitive;

export const color = {
  bgApp: p.gray500,
  surfacePanel: p.white,
  surfaceSunken: p.gray100,
  surfaceWall: p.clay,
  textPrimary: p.ink,
  textMuted: p.gray500,
  textInverse: p.white,
  border: p.ink,
  accent: p.magenta,
  accentPressed: p.plum,
  successText: p.green900,
  successBg: p.green500,
  danger: p.red700,
  warning: p.orange,
  info: p.navy,
} as const;

export type TeamId = 'p1' | 'p2' | 'p3' | 'p4' | 'neutral';

export interface TeamColors {
  main: string;
  light: string;
  dark: string;
  carpet: string;
  symbol: '●' | '▲' | '■' | '◆' | '';
  label: string;
}

export const team: Record<TeamId, TeamColors> = {
  p1: { main: p.blue, light: p.cyan, dark: p.navy, carpet: '#a8c3b8', symbol: '●', label: 'Xanh dương' },
  p2: { main: p.red500, light: p.pink, dark: p.red700, carpet: '#e8a98d', symbol: '▲', label: 'Đỏ' },
  p3: { main: p.green500, light: p.yellow, dark: p.green700, carpet: '#c4d090', symbol: '■', label: 'Xanh lá' },
  p4: { main: p.amber, light: p.yellow, dark: p.orange, carpet: '#f0c989', symbol: '◆', label: 'Vàng' },
  neutral: { main: p.gray300, light: p.gray100, dark: p.gray500, carpet: '#dccbac', symbol: '', label: 'Trung lập' },
};

export const TEAM_IDS: readonly TeamId[] = ['p1', 'p2', 'p3', 'p4', 'neutral'];

export const map = {
  outside: p.gray500,
  corridor: p.gray100,
  corridorLine: p.gray300,
  wall: p.gray700,
  wallFace: p.clay,
  wallFaceLight: p.skin,
  wallFaceBase: p.woodDark,
  carpet: p.sand,
  carpetDot: p.tan,
} as const;

/** Text-on-background pairs used by the UI. Tests assert each meets WCAG AA (4.5:1). */
export const TEXT_PAIRS: readonly { name: string; fg: string; bg: string }[] = [
  { name: 'text.primary / surface.panel', fg: color.textPrimary, bg: color.surfacePanel },
  { name: 'text.muted / surface.panel', fg: color.textMuted, bg: color.surfacePanel },
  { name: 'text.primary / surface.sunken', fg: color.textPrimary, bg: color.surfaceSunken },
  { name: 'text.primary / surface.wall', fg: color.textPrimary, bg: color.surfaceWall },
  { name: 'text.inverse / accent', fg: color.textInverse, bg: color.accent },
  { name: 'text.inverse / accent.pressed', fg: color.textInverse, bg: color.accentPressed },
  { name: 'text.inverse / danger', fg: color.textInverse, bg: color.danger },
  { name: 'text.inverse / info', fg: color.textInverse, bg: color.info },
  { name: 'text.primary / warning', fg: color.textPrimary, bg: color.warning },
  { name: 'success.text / surface.panel', fg: color.successText, bg: color.surfacePanel },
  { name: 'text.primary / success.bg', fg: color.textPrimary, bg: color.successBg },
  { name: 'text.inverse / ink (tooltip, plate)', fg: color.textInverse, bg: p.ink },
];

export const type = {
  caption: { size: 9, line: 10 },
  body: { size: 11, line: 12 },
  label: { size: 13, line: 14 },
  title: { size: 18, line: 18 },
  display: { size: 32, line: 32 },
  hero: { size: 44, line: 44 },
} as const;
export type TypeToken = keyof typeof type;

export const FONT_FAMILY = "'VT323', monospace";

export const space = [0, 2, 4, 6, 8, 12, 16, 24, 32] as const;

export const elevation = { 0: 0, 1: 1, 2: 2, 3: 3 } as const;

export const motion = { instant: 0, fast: 80, base: 160, slow: 320, pulse: 600 } as const;

export const layout = {
  width: 640,
  height: 360,
  hudTop: 20,
  hudBottom: 340,
  building: { x: 6, y: 20, w: 628, h: 320 },
} as const;

/** Integer scale factor that fits the 640x360 logical screen into a viewport. */
export function scaleFor(viewportW: number, viewportH: number): number {
  return Math.max(1, Math.floor(Math.min(viewportW / layout.width, viewportH / layout.height)));
}
