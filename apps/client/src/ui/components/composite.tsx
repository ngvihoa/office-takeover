import { type TeamId, team } from '@ot/design';
import type { ComponentChildren, CSSProperties } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';
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
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useLayoutEffect(() => {
    if (inline) return;
    const node = dialog.current;
    if (!node) return;
    const previous = document.activeElement;
    const controls = () =>
      [...node.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]')].filter(
        (el) => !el.matches(':disabled, [tabindex="-1"]') && el.getClientRects().length > 0,
      );
    const focusFirst = () => (controls()[0] ?? node).focus();
    const isolated: { node: HTMLElement; inert: boolean }[] = [];
    let branch: HTMLElement = node.parentElement ?? node;
    while (branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          isolated.push({ node: sibling, inert: sibling.inert });
          sibling.inert = true;
        }
      }
      branch = branch.parentElement;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        close.current();
      } else if (e.key === 'Tab') {
        const list = controls();
        const first = list[0] ?? node;
        const last = list[list.length - 1] ?? node;
        if (e.shiftKey && (document.activeElement === first || document.activeElement === node)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === node)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const onFocus = (e: FocusEvent) => {
      if (e.target instanceof Node && !node.contains(e.target)) focusFirst();
    };
    focusFirst();
    addEventListener('keydown', onKey, true);
    document.addEventListener('focusin', onFocus);
    return () => {
      removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocus);
      for (const item of isolated) item.node.inert = item.inert;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [inline]);
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click is a mouse shortcut; Esc closes for keyboard users
    // biome-ignore lint/a11y/useKeyWithClickEvents: Esc is handled on window above
    <div class={`scrim ${inline ? 'inline' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialog}
        class="modal elev-3"
        role="dialog"
        aria-modal={inline ? undefined : true}
        aria-label={title}
        tabIndex={-1}
        onKeyDown={(e) => !inline && e.stopPropagation()}
      >
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
