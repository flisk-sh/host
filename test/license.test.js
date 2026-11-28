
import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

const license = readFileSync(
  new URL('../LICENSE', import.meta.url),
  'utf8'
);

test('package.json declares the license matching the LICENSE file', () => {
  expect(license).toContain('MIT License');
  expect(packageJson.license).toBe('MIT');
});
