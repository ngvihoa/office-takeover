import { color, map, primitive, team, type as typeScale } from './tokens';

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** CSS custom properties for the DOM UI. Sizes are emitted in lpx; multiply by --s in CSS via calc(). */
export function tokensCss(): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(primitive)) lines.push(`--c-${kebab(k)}: ${v};`);
  for (const [k, v] of Object.entries(color)) lines.push(`--${kebab(k)}: ${v};`);
  for (const [k, v] of Object.entries(map)) lines.push(`--map-${kebab(k)}: ${v};`);
  for (const [id, t] of Object.entries(team)) {
    lines.push(`--team-${id}: ${t.main};`, `--team-${id}-light: ${t.light};`, `--team-${id}-dark: ${t.dark};`);
    lines.push(`--team-${id}-carpet: ${t.carpet};`);
  }
  for (const [k, v] of Object.entries(typeScale)) lines.push(`--type-${k}: ${v.size};`, `--type-${k}-line: ${v.line};`);
  return `:root {\n  ${lines.join('\n  ')}\n}\n`;
}
