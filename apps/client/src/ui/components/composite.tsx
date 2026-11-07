import { type TeamId, team } from '@ot/design';
import type { ComponentChildren, CSSProperties } from 'preact';
import { useEffect } from 'preact/hooks';
import { Badge, Button, Flag, Icon, Panel } from './primitives';

export function Modal({
  title,
  children,
  onClose,
  actions,
  inline,
}: {
  title: string;
  children: ComponentChildren;
  onClose: () => void;
  actions: ComponentChildren;
  inline?: boolean;
}) {
  useEffect(() => {
    if (inline) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [inline, onClose]);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click is a mouse shortcut; Esc closes for keyboard users
    // biome-ignore lint/a11y/useKeyWithClickEvents: Esc is handled on window above
    <div class={`scrim ${inline ? 'inline' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="modal elev-3" role="dialog" aria-modal="true" aria-label={title}>
        <Panel title={title}>
          {children}
          <div class="modal-actions">{actions}</div>
        </Panel>
      </div>
    </div>
  );
}

export type SeatKind =
  | { kind: 'human'; name: string; ready: boolean; host?: boolean; you?: boolean; away?: number }
  | { kind: 'bot'; level: 'easy' | 'normal' }
  | { kind: 'empty' };

export function SeatCard({ t, seat, isHost }: { t: Exclude<TeamId, 'neutral'>; seat: SeatKind; isHost?: boolean }) {
  const cls = `seat panel ${seat.kind === 'empty' ? 'is-empty' : ''} ${seat.kind === 'human' && seat.away ? 'is-away' : ''}`;
  return (
    <div class={cls} style={{ '--team': team[t].main } as CSSProperties}>
      <div class="panel-face">
        <div class="panel-wall">
          <span style={{ display: 'inline-flex', gap: 'calc(var(--n) * 3)', alignItems: 'center' }}>
            <Flag t={t} /> Ghế {t.slice(1)}
          </span>
          {seat.kind === 'human' && seat.you && <span class="badge">Bạn</span>}
        </div>
        <div class="seat-body">
          {seat.kind === 'human' && (
            <>
              <div class="avatar">
                <Icon name="person" tint={team[t].main} scale={3} />
              </div>
              <div class="t-label">{seat.name}</div>
              <Badge>{seat.host ? 'Chủ phòng' : 'Người'}</Badge>
              {seat.away ? (
                <span class="muted">Đang chờ... {seat.away}s</span>
              ) : seat.ready ? (
                <Badge ok>
                  <Icon name="check" /> Sẵn sàng
                </Badge>
              ) : (
                <span class="muted">chưa sẵn sàng</span>
              )}
            </>
          )}
          {seat.kind === 'bot' && (
            <>
              <div class="avatar">
                <Icon name="bot" scale={3} />
              </div>
              <div class="t-label">Bot</div>
              <Badge>{seat.level === 'easy' ? 'Dễ' : 'Thường'}</Badge>
              {isHost && <span class="muted">Đổi độ khó</span>}
            </>
          )}
          {seat.kind === 'empty' && (
            <>
              <div class="t-label muted" style={{ marginTop: 'calc(var(--n) * 12)' }}>
                Ghế trống
              </div>
              <Button icon="plus">Thêm bot</Button>
              <Button icon="copy">Mời</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
