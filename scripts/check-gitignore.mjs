import { execFileSync } from 'node:child_process';

// Install artifacts, build output, logs and local secrets must never be staged by git add ..
const PATHS = [
  'node_modules/',
  'dist/',
  'npm-debug.log',
  '.env',
  '.dev.vars',
  '.wrangler/',
];
const missing = [];
for (const path of PATHS) {
  try {
    execFileSync('git', ['check-ignore', '-q', path], { stdio: 'ignore' });
  } catch {
    missing.push(path);
  }
}
if (missing.length) {
  console.error(`.gitignore does not ignore: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`.gitignore covers ${PATHS.join(', ')}`);
}
