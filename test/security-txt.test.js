import { expect, test } from 'bun:test';
import { handle } from '../src/index.js';

const get = (path) => handle(new Request(`https://host.flisk.si${path}`));

test('GET /.well-known/security.txt returns plain text with a one-day cache', async () => {
  const res = await get('/.well-known/security.txt');
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toMatch(/^text\/plain/);
  expect(res.headers.get('cache-control')).toContain('max-age=86400');
});

test('it names the repo advisories page and expires at least six months out', async () => {
  const text = await (await get('/.well-known/security.txt')).text();
  expect(text).toContain('Contact: https://github.com/flisk-sh/host/security/advisories/new');
  expect(text).toContain('Canonical: https://host.flisk.si/.well-known/security.txt');
  const expires = text.match(/^Expires: (\S+)$/m)?.[1];
  expect(expires).toBeTruthy();
  expect(Date.parse(expires)).toBeGreaterThan(Date.now() + 180 * 24 * 60 * 60 * 1000);
});
