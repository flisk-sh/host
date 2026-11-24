import { expect, test } from 'bun:test';
import worker from '../src/index.js';

const get = (path, method = 'GET') => worker.fetch(new Request(`https://host.flisk.si${path}`, { method }));

test('GET and HEAD serve the cacheable site favicon', async () => {
  const icon = await get('/favicon.ico');
  expect(icon.status).toBe(200);
  expect(icon.headers.get('content-type')).toMatch(/^image\/svg\+xml\b/);
  expect(icon.headers.get('cache-control')).toBe('public, max-age=86400');
  expect(await icon.text()).toMatch(/^<svg\b.*<\/svg>$/);

  const head = await get('/favicon.ico', 'HEAD');
  expect(head.status).toBe(200);
  expect(head.headers.get('content-type')).toBe(icon.headers.get('content-type'));
  expect(head.headers.get('cache-control')).toBe(icon.headers.get('cache-control'));
  expect(await head.text()).toBe('');
});

test.each(['/', '/docs', '/rating'])('%s declares the favicon route', async (path) => {
  expect(await (await get(path)).text()).toContain('<link rel="icon" type="image/svg+xml" href="/favicon.ico">');
});
