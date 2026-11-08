import { FONT_FAMILY, type Painter } from '@ot/design';

/** Shared paint routines draw directly into a Phaser CanvasTexture at integer scale. */
export function canvasPainter(ctx: CanvasRenderingContext2D, scale: number): Painter {
  return {
    rect(x, y, w, h, color) {
      if (w <= 0 || h <= 0) return;
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x * scale), Math.round(y * scale), Math.round(w * scale), Math.round(h * scale));
    },
    text(x, y, text, { size, color, align = 'left' }) {
      ctx.font = `${size * scale}px ${FONT_FAMILY}`;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(text, Math.round(x * scale), Math.round(y * scale));
    },
  };
}
