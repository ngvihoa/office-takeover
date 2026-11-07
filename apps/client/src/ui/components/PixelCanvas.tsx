import { FONT_FAMILY, type Painter } from '@ot/design';
import { useEffect, useRef } from 'preact/hooks';

/** Canvas2D implementation of the shared Painter. Draws at scale `s` so pixels stay crisp and text stays sharp. */
function canvasPainter(ctx: CanvasRenderingContext2D, s: number): Painter {
  return {
    rect(x, y, w, h, color) {
      if (w <= 0 || h <= 0) return;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x * s), Math.round(y * s), Math.round(w * s), Math.round(h * s));
    },
    text(x, y, str, { size, color, align = 'left' }) {
      ctx.fillStyle = color;
      ctx.font = `${size * s}px ${FONT_FAMILY}`;
      ctx.textAlign = align;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(str, Math.round(x * s), Math.round(y * s));
    },
  };
}

/**
 * Renders a paint routine at logical size w×h. Reads the current scale from the CSS variable --s so it follows
 * the page's scale switcher. `animate` redraws every frame and passes elapsed ms.
 */
export function PixelCanvas({
  w,
  h,
  draw,
  animate,
  label,
}: {
  w: number;
  h: number;
  draw: (g: Painter, t: number) => void;
  animate?: boolean;
  label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const s = Number(getComputedStyle(canvas).getPropertyValue('--s')) || 2;
    canvas.width = w * s;
    canvas.height = h * s;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const g = canvasPainter(ctx, s);
    let raf = 0;
    const start = performance.now();
    const frame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      draw(g, performance.now() - start);
      if (animate) raf = requestAnimationFrame(frame);
    };
    void document.fonts.ready.then(frame);
    return () => cancelAnimationFrame(raf);
  });
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={label}
      style={{
        width: `calc(var(--n) * ${w})`,
        height: `calc(var(--n) * ${h})`,
        display: 'block',
        imageRendering: 'pixelated',
      }}
    />
  );
}
