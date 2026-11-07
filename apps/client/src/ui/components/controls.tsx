import type { CSSProperties } from 'preact';
import { useRef, useState } from 'preact/hooks';
import { Icon } from './primitives';

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <fieldset class="seg" aria-label={label}>
      <span class="seg-face">
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </span>
    </fieldset>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label class="field">
      <span>{label}</span>
      <button type="button" role="switch" class="toggle" aria-checked={checked} onClick={() => onChange(!checked)} />
    </label>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label class="check-row">
      <input
        type="checkbox"
        class="check-native"
        checked={checked}
        onChange={(e) => onChange((e.target as HTMLInputElement).checked)}
      />
      <span class="check" aria-hidden="true">
        {checked && <Icon name="check" />}
      </span>
      {label}
    </label>
  );
}

export function Slider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <label class="field">
      <span>{label}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'calc(var(--n) * 6)' }}>
        <input
          class="slider"
          type="range"
          min={0}
          max={100}
          step={10}
          value={value}
          aria-label={label}
          style={{ '--fill': `${value}%` } as CSSProperties}
          onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
        />
        <span style={{ width: 'calc(var(--n) * 22)' }}>{value}%</span>
      </span>
    </label>
  );
}

/** Room codes use an alphabet without look-alike characters (docs/05 §5). */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function RoomCodeInput({ onSubmit }: { onSubmit: (code: string) => boolean }) {
  const [chars, setChars] = useState(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const update = (next: string[]) => {
    setChars(next);
    setError(null);
    if (next.every(Boolean)) {
      const code = next.join('');
      if (!onSubmit(code)) {
        setError(`Không tìm thấy phòng ${code}. Kiểm tra lại mã nhé.`);
        setShake((s) => s + 1);
      }
    }
  };

  const onInput = (i: number, raw: string) => {
    const clean = [...raw.toUpperCase()].filter((c) => CODE_ALPHABET.includes(c));
    const next = [...chars];
    let j = i;
    for (const c of clean) {
      if (j > 3) break;
      next[j++] = c;
    }
    if (clean.length === 0) next[i] = '';
    update(next);
    refs.current[Math.min(j, 3)]?.focus();
  };

  return (
    <div>
      <div class={`code ${error ? 'is-error' : ''}`} key={shake}>
        {chars.map((c, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={c}
            maxLength={4}
            aria-label={`Ký tự ${i + 1} của mã phòng`}
            onInput={(e) => onInput(i, (e.target as HTMLInputElement).value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !chars[i] && i > 0) refs.current[i - 1]?.focus();
            }}
          />
        ))}
      </div>
      {error && <div class="error-text">{error}</div>}
    </div>
  );
}
