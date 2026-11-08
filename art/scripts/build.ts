import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { ROOT } from './lib';

for (const [script, ...args] of [
  ['build-sprites'],
  ['validate', 'source'],
  ['recolor'],
  ['validate', 'output'],
  ['pack'],
  ['contact-sheet'],
]) {
  execFileSync(process.execPath, ['--import', 'tsx', resolve(ROOT, `art/scripts/${script}.ts`), ...args], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}
