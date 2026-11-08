// index.css declares every subset with its unicode-range (the per-subset files omit it).
import '@fontsource/vt323/index.css';
import { tokensCss } from '@ot/design';
import { render } from 'preact';
import './styles/ui.css';

const style = document.createElement('style');
style.textContent = tokensCss();
document.head.append(style);

const root = document.getElementById('app') as HTMLElement;

async function boot() {
  if (import.meta.env.DEV && location.pathname.startsWith('/dev/ui')) {
    const { DevUI } = await import('./dev/DevUI');
    render(<DevUI />, root);
    return;
  }
  if (import.meta.env.DEV && location.pathname === '/dev/perf') {
    const { startGame } = await import('./game/start');
    await startGame(root);
    return;
  }
  const { App } = await import('./App');
  render(<App />, root);
}

void boot();
