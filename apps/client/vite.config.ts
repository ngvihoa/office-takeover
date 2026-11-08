import { execFileSync } from 'node:child_process';
import preact from '@preact/preset-vite';
import { defineConfig } from 'vite';

let buildVersion = 'unknown';
try {
  buildVersion = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {
  // Source archives may not contain Git metadata.
}

export default defineConfig({
  plugins: [preact()],
  define: { __BUILD_VERSION__: JSON.stringify(buildVersion) },
  server: { port: 5173 },
});
