import { describe, expect, test } from 'bun:test';
import { handle } from '../src/index.js';
import { ranked, score, SANDBOXES } from '../src/rating.js';

const get = (path) => handle(new Request(`https://host.flisk.si${path}`));

describe('sandbox rating', () => {
  test('no card and a link beat everything else', () => {
    const both = score({ card: false, link: true });
    expect(both).toBe(90);
    expect(score({ card: true, link: true })).toBe(40);
    expect(score({ card: false, link: false })).toBe(50);
    expect(score({ card: null, link: null })).toBe(25);
    expect(score({ card: false, link: true, creditUsd: 500 })).toBe(100);
  });

  test('every row has a name, a vendor link and a source', () => {
    expect(SANDBOXES.length).toBeGreaterThan(20);
    for (const s of SANDBOXES) {
      expect(s.name).toBeTruthy();
      expect(s.url).toMatch(/^https:\/\//);
      expect(s.source).toMatch(/^https:\/\//);
      expect([true, false, null]).toContain(s.card);
      expect([true, false, null]).toContain(s.link);
    }
    expect(new Set(SANDBOXES.map((s) => s.id)).size).toBe(SANDBOXES.length);
  });

  test('ranked is best first and Upstash Box is in the top group', () => {
    const r = ranked();
    for (let i = 1; i < r.length; i++) expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
    const upstash = r.find((s) => s.id === 'upstash');
    expect(upstash.card).toBe(false);
    expect(upstash.link).toBe(true);
  });

  test('/rating shows the table and /v1/sandbox-rating the same rows', async () => {
    const page = await get('/rating');
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain('Upstash Box');
    // The green-row class must not reuse .top, the header bar's flex class.
    expect(html).toContain('<tr class="both"');
    expect(html).not.toContain('<tr class="top"');
    expect(html).toContain('href="/v1/sandbox-rating"');
    const j = await (await get('/v1/sandbox-rating')).json();
    expect(j.sandboxes.length).toBe(SANDBOXES.length);
    expect(j.sandboxes[0].score).toBeGreaterThanOrEqual(j.sandboxes.at(-1).score);
  });

  test('the home page and the sitemap point at the rating', async () => {
    expect(await (await get('/')).text()).toContain('href="/rating"');
    expect(await (await get('/sitemap.xml')).text()).toContain('/rating');
  });
});
