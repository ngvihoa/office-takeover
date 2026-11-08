import { color, scaleFor } from '@ot/design';
import Phaser from 'phaser';
import { GameScene } from '../scenes/GameScene';
import type { OfflineOptions } from './session';

export async function startGame(parent: HTMLElement, options: OfflineOptions = {}) {
  await document.fonts.load('16px VT323');
  const initialScale = scaleFor(window.innerWidth, window.innerHeight);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 640 * initialScale,
    height: 360 * initialScale,
    backgroundColor: color.bgApp,
    pixelArt: true,
    roundPixels: true,
    scene: [new GameScene(options)],
    scale: { mode: Phaser.Scale.NONE, autoCenter: Phaser.Scale.NO_CENTER },
  });
  if (import.meta.env.DEV && location.pathname === '/dev/perf') {
    const { measureGame } = await import('../dev/benchmark');
    measureGame(game);
  }
  const resize = () => {
    const s = scaleFor(window.innerWidth, window.innerHeight);
    game.scale.resize(640 * s, 360 * s);
  };
  game.events.once('ready', resize);
  window.addEventListener('resize', resize);
  game.events.once('destroy', () => window.removeEventListener('resize', resize));
  return game;
}
