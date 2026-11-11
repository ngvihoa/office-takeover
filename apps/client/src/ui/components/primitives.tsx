import { FLAG_FOR_TEAM, ICONS, type IconName, iconPixels, iconSize, type TeamId, team } from '@ot/design';
import type { ButtonHTMLAttributes, ComponentChildren, CSSProperties } from 'preact';

const lpx = (n: number) => `calc(var(--n) * ${n})`;

export function Icon({
  name,
  tint,
  title,
  scale = 1,
}: {
  name: IconName;
  tint?: string;
  title?: string;
  scale?: number;
}) {
  const { w, h } = iconSize(name);
  return (
    <svg
      class="icon"
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: lpx(w * scale), height: lpx(h * scale) }}
      shape-rendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {iconPixels(name, tint).map((p) => (
        <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width={1} height={1} fill={p.color} />
      ))}
    </svg>
  );
}

export const ALL_ICONS = Object.keys(ICONS) as IconName[];

export function Flag({ t }: { t: TeamId }) {
  if (t === 'neutral') return null;
  return <Icon name={FLAG_FOR_TEAM[t]} tint={team[t].main} />;
}

export function Logo({ scale = 2 }: { scale?: number }) {
  return (
    <div class="game-logo" role="img" aria-label="Office Takeover Logo">
      <div class="logo-emblem">
        <Icon name="logo" scale={scale} />
      </div>
      <div class="logo-text">
        <h1 class="t-hero logo-title">OFFICE TAKEOVER</h1>
        <div class="logo-tagline">
          <span class="logo-badge">V1</span>
          <span class="t-label muted">Thâu tóm văn phòng, từng phòng một</span>
        </div>
      </div>
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
/** Forced visual state, used by /dev/ui to show states that normally need a pointer. */
type ForcedState = 'hover' | 'pressed' | 'focus' | 'disabled';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'icon' | 'size'> {
  variant?: ButtonVariant;
  size?: 'M' | 'L';
  icon?: IconName;
  loading?: boolean;
  block?: boolean;
  forced?: ForcedState;
  disabled?: boolean;
  children?: ComponentChildren;
}

export function Button({
  variant = 'secondary',
  size = 'M',
  icon,
  loading,
  block,
  forced,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const cls = ['btn', variant, size, block && 'block', !children && 'icon-only', forced && `is-${forced}`]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      class={cls}
      disabled={disabled || forced === 'disabled' || loading}
      aria-busy={loading}
      {...rest}
    >
      <span class="face">
        {icon && <Icon name={icon} />}
        {loading ? <span class="dots">Đang tải</span> : children}
      </span>
    </button>
  );
}

export function Panel({
  title,
  icon,
  compact,
  children,
  class: cls = '',
  style,
}: {
  title?: string;
  icon?: IconName;
  compact?: boolean;
  children?: ComponentChildren;
  class?: string;
  style?: CSSProperties;
}) {
  return (
    <div class={`panel ${cls}`} style={style}>
      <div class="panel-face">
        {title && (
          <div class="panel-wall">
            {icon && <Icon name={icon} />}
            {title}
          </div>
        )}
        <div class={`panel-body ${compact ? 'compact' : ''}`}>{children}</div>
      </div>
    </div>
  );
}

export function PlayerChip({
  t,
  name,
  rooms,
  you,
  eliminated,
}: {
  t: TeamId;
  name: string;
  rooms: number;
  you?: boolean;
  eliminated?: boolean;
}) {
  return (
    <span class="elev-1" style={{ display: 'inline-block' }}>
      <span
        class={`chip ${you ? 'is-you' : ''} ${eliminated ? 'is-eliminated' : ''}`}
        style={{ '--team': team[t].main } as CSSProperties}
      >
        <Flag t={t} />
        <span class="name">{name}</span>
        <span class="count">{rooms}</span>
      </span>
    </span>
  );
}

export function Kbd({ children }: { children: ComponentChildren }) {
  return <kbd class="kbd">{children}</kbd>;
}

export function Badge({ ok, children }: { ok?: boolean; children: ComponentChildren }) {
  return <span class={`badge ${ok ? 'ok' : ''}`}>{children}</span>;
}

export function Tooltip({ children }: { children: ComponentChildren }) {
  return (
    <span class="tip elev-1" role="tooltip">
      {children}
    </span>
  );
}

export function Toast({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'success' | 'danger';
  children: ComponentChildren;
}) {
  const stripe = tone === 'success' ? 'var(--success-bg)' : tone === 'danger' ? 'var(--danger)' : 'var(--info)';
  const icon: IconName = tone === 'success' ? 'check' : tone === 'danger' ? 'cross' : 'book';
  return (
    <div class="panel" role="status">
      <div class="panel-face toast" style={{ '--stripe': stripe } as CSSProperties}>
        <Icon name={icon} />
        {children}
      </div>
    </div>
  );
}

export function Stamp({ children, muted }: { children: ComponentChildren; muted?: boolean }) {
  return <span class={`stamp ${muted ? 'muted' : ''}`}>{children}</span>;
}
