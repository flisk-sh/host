import { describe, expect, test } from 'bun:test';
import { handle } from '../src/index.js';
import { CSS, shell } from '../src/page.js';

const get = async (p) => (await handle(new Request(`https://host.test${p}`))).text();

// The first element a keyboard user reaches on every page must jump to content.
function firstFocusable(html) {
  const anchors = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)];
  const body = html.indexOf('<body>');
  const first = anchors.find((m) => m.index > body);
  return first ? { href: first[0].match(/href="([^"]*)"/)?.[1], text: first[1].replace(/<[^>]*>/g, '') } : null;
}

describe('skip to content', () => {
  test('the first focusable element on the home page is a skip link', async () => {
    const first = firstFocusable(await get('/'));
    expect(first).not.toBeNull();
    expect(first.href?.startsWith('#')).toBe(true);
    expect(first.text.toLowerCase()).toContain('skip');
  });

  test('the skip link target exists on the home page', async () => {
    const html = await get('/');
    const first = firstFocusable(html);
    expect(html).toContain(`id="${first.href.slice(1)}"`);
  });

  test('the skip link is hidden until focused and visible on focus', () => {
    expect(CSS).toMatch(/\.skip\b[^}]*position:\s*absolute/);
    expect(CSS).toMatch(/\.skip:focus\b[^}]*(top:\s*0|transform:\s*none|clip:\s*auto)/);
  });

  test('the shared shell also starts with a skip link to content', () => {
    const html = shell({ title: 'Page', body: '<div class="pad"><h1>Page</h1></div>' });
    const first = firstFocusable(html);
    expect(first.href?.startsWith('#')).toBe(true);
    expect(html).toContain(`id="${first.href.slice(1)}"`);
  });
});
