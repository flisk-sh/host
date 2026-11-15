import { describe, expect, test } from 'bun:test';
import { handle } from '../src/index.js';
import { HOSTS } from '../src/hosts.js';
import { shell } from '../src/page.js';

const get = (p) => handle(new Request(`https://host.test${p}`));

async function headValues(url = 'https://host.flisk.si/', env = {}) {
  const values = {};
  const add = (key, value) => (values[key] ??= []).push(value);
  await new HTMLRewriter()
    .on('head link[rel="canonical"]', { element: (e) => add('canonical', e.getAttribute('href')) })
    .on('head meta[property]', { element: (e) => add(e.getAttribute('property'), e.getAttribute('content')) })
    .transform(await handle(new Request(url), env)).text();
  return values;
}

describe('host.flisk.si', () => {
  test.each([
    ['canonical', 'https://host.flisk.si/'],
    ['og:title', 'host: free places to run your own pods'],
    ['og:description', 'Where to run a fleetd pod host for free, with the catch for each: Hugging Face Spaces, Oracle Always Free, Render, Koyeb, Fly and Cloudflare.'],
    ['og:image', 'https://raw.githubusercontent.com/flisk-sh/flisk-emoji/main/apps/png/host-512.png'],
    ['og:url', 'https://host.flisk.si/'],
    ['og:type', 'website'],
  ])('the home head includes one %s value', async (key, value) => {
    expect((await headValues())[key]).toEqual([value]);
  });

  test.each(['https://public.test', 'https://public.test/'])('canonical and Open Graph URLs follow public origin %s', async (origin) => {
    const values = await headValues('https://preview.test/', { PUBLIC_ORIGIN: origin });
    expect(values.canonical).toEqual(['https://public.test/']);
    expect(values['og:url']).toEqual(['https://public.test/']);
  });

  test('shared head metadata escapes page text and canonical attributes', () => {
    const html = shell({ title: 'Host & "pods"', description: 'A <guide>', canonical: 'https://host.flisk.si/?a=1&b=2', body: '' });
    expect(html).toContain('<meta property="og:title" content="Host &amp; &quot;pods&quot;">');
    expect(html).toContain('<meta property="og:description" content="A &lt;guide&gt;">');
    expect(html).toContain('<link rel="canonical" href="https://host.flisk.si/?a=1&amp;b=2">');
  });

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
  test('the page loads Flisk Analytics in <head>', async () => {
    const html = await (await get('/')).text();
    const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
    expect(head).toContain('<script defer data-domain="host.flisk.si" src="https://flisk.sh/a.js"></script>');
  });
  test('the home page preconnects to Google Fonts before loading the stylesheet', async () => {
    const html = await (await get('/')).text();
    const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
    const google = '<link rel="preconnect" href="https://fonts.googleapis.com">';
    const gstatic = '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
    const stylesheet = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?';
    expect(head).toContain(google);
    expect(head).toContain(gstatic);
    expect(head.indexOf(google)).toBeLessThan(head.indexOf(stylesheet));
    expect(head.indexOf(gstatic)).toBeLessThan(head.indexOf(stylesheet));
  });
  test('no script in the page except the shared Flisk bar and Flisk Analytics', async () => {
    const html = await (await get('/')).text();
    expect([...html.matchAll(/<script[^>]*>/g)].map((m) => m[0])).toEqual(['<script defer data-domain="host.flisk.si" src="https://flisk.sh/a.js">', '<script src="https://flisk.si/assets/bar.js" defer>']);
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

describe('machine-readable', () => {
  test('llms.txt and sitemap.xml are served', async () => {
    const l = await handle(new Request('https://host.test/llms.txt'));
    expect(l.status).toBe(200);
    expect(await l.text()).toContain('/v1/hosts-catalog');
    const m = await handle(new Request('https://host.test/sitemap.xml'));
    expect(await m.text()).toContain('<loc>https://host.test/</loc>');
  });
});

describe('public API docs', () => {
  test('the nav API link opens docs without sign-in', async () => {
    const home = await (await get('/')).text();
    expect(home).toContain('href="/docs"');
    expect(home).not.toContain('/console?section=docs');
    const res = await get('/docs');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('/v1/hosts');
    expect(html).toContain('<title>Host API docs</title>');
  });
});
