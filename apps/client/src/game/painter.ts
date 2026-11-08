import { FONT_FAMILY, ICONS, type IconName, type Painter } from '@ot/design';
import type Phaser from 'phaser';

/** Shared paint routines draw directly into a Phaser CanvasTexture at integer scale. */
export function canvasPainter(ctx: CanvasRenderingContext2D, scale: number, atlas?: Phaser.Textures.Texture): Painter {
  const tinted = new Map<string, HTMLCanvasElement>();
  ctx.imageSmoothingEnabled = false;
  return {
    sprite(name, x, y, tint) {
      if (!atlas?.has(name)) return false;
      const frame = atlas.get(name);
      const { cutX: sx, cutY: sy, cutWidth: w, cutHeight: h } = frame;
      const image = frame.source.image as HTMLImageElement;
      if (!tint) {
        ctx.drawImage(image, sx, sy, w, h, Math.round(x * scale), Math.round(y * scale), w * scale, h * scale);
        return true;
      }
      const key = `${name}:${tint}`;
      let tile = tinted.get(key);
      if (!tile) {
        tile = document.createElement('canvas');
        tile.width = w;
        tile.height = h;
        const g = tile.getContext('2d') as CanvasRenderingContext2D;
        g.drawImage(image, sx, sy, w, h, 0, 0, w, h);
        g.fillStyle = tint;
        if (name.startsWith('icon_')) {
          ICONS[name.slice(5) as IconName].forEach((row, j) => {
            for (let i = 0; i < row.length; i++) if (row[i] === 'o') g.fillRect(i, j, 1, 1);
          });
        } else {
          g.globalCompositeOperation = 'source-in';
          g.fillRect(0, 0, w, h);
        }
        tinted.set(key, tile);
      }
      ctx.drawImage(tile, Math.round(x * scale), Math.round(y * scale), w * scale, h * scale);
      return true;
    },
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
