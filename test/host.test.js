import { describe, expect, test } from 'bun:test';
import { handle } from '../src/index.js';
import { HOSTS } from '../src/hosts.js';

const get = (p) => handle(new Request(`https://host.test${p}`));

describe('host.flisk.si', () => {
  test('the page lists every host and marks GitHub Actions not allowed', async () => {
    const html = await (await get('/')).text();
    for (const h of HOSTS) expect(html).toContain(h.name);
    expect(html).toMatch(/id="github-actions"[\s\S]*?Not allowed/);
    expect(html).toContain('FLEETD_TOKEN');
  });
  test('exactly one host is marked "use this", and it needs no card', () => {
    const use = HOSTS.filter((h) => h.status === 'use');
    expect(use.map((h) => h.id)).toEqual(['huggingface']);
    expect(use[0].card).toBe(false);
  });
  test('/v1/hosts is JSON, other paths 404, writes are refused', async () => {
    expect((await (await get('/v1/hosts')).json()).hosts.length).toBe(HOSTS.length);
    expect((await get('/nope')).status).toBe(404);
    expect((await handle(new Request('https://host.test/', { method: 'POST' }))).status).toBe(405);
  });
  test('no script in the page except the shared Flisk bar', async () => {
    const html = await (await get('/')).text();
    expect([...html.matchAll(/<script[^>]*>/g)].map((m) => m[0])).toEqual(['<script src="https://flisk.si/assets/bar.js" defer>']);
  });
});
