import { describe, expect, test } from 'bun:test';
import { handle } from '../src/index.js';
import { HOSTS } from '../src/hosts.js';

const get = (p) => handle(new Request(`https://host.test${p}`));

describe('host.flisk.si', () => {
  test('the page lists every host, and GitHub Actions is not offered (its terms forbid it)', async () => {
    const html = await (await get('/')).text();
    for (const h of HOSTS) expect(html).toContain(h.name);
    expect(html).toContain('FLEETD_TOKEN');
    expect(html.toLowerCase()).not.toContain('github actions');
    expect(JSON.stringify(HOSTS).toLowerCase()).not.toContain('actions');
  });
  test('no host is marked "use this" until a real run proved it; Hugging Face is paid', () => {
    expect(HOSTS.filter((h) => h.status === 'use')).toEqual([]);
    expect(HOSTS.find((h) => h.id === 'huggingface').status).toBe('paid');
  });
  test('/v1/hosts is JSON, other paths 404, writes are refused', async () => {
    expect((await (await get('/v1/hosts-catalog')).json()).hosts.length).toBe(HOSTS.length);
    expect((await get('/nope')).status).toBe(404);
    expect((await handle(new Request('https://host.test/', { method: 'POST' }))).status).toBe(405);
  });
  test('no script in the page except the shared Flisk bar', async () => {
    const html = await (await get('/')).text();
    expect([...html.matchAll(/<script[^>]*>/g)].map((m) => m[0])).toEqual(['<script src="https://flisk.si/assets/bar.js" defer>']);
  });
});

describe('standard header', () => {
  test('brand, nav and the green call-to-action, same markup as fleet', async () => {
    const html = await (await get('/')).text();
    expect(html).toContain('<a class="brand" href="/"');
    expect(html).toContain('<a class="cta" href="/console">Console');
    expect(html).toContain('id="setup"');
    expect(html).toContain('<a class="on" aria-current="true" href="/"><i></i>host</a>');
  });
});

describe('guide accuracy', () => {
  test('the Dockerfile on the page makes fleetd reachable and the image is named', async () => {
    const html = await (await handle(new Request('https://host.test/'))).text();
    expect(html).toContain('HOST=0.0.0.0');
    expect(html).toContain('ghcr.io/flisk-sh/fleetd:latest');
  });
  test('HEAD works like GET', async () => {
    const r = await handle(new Request('https://host.test/', { method: 'HEAD' }));
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('');
  });
});
