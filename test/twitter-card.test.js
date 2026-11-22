import { expect, test } from 'bun:test';
import { handle } from '../src/index.js';

const home = async () => (await handle(new Request('https://host.flisk.si/'))).text();
const meta = (html, name) => html.match(new RegExp(`<meta name="${name}" content="([^"]*)">`))?.[1];
const og = (html, name) => html.match(new RegExp(`<meta property="og:${name}" content="([^"]*)">`))?.[1];

test('the home page declares a large Twitter card', async () => {
  expect(meta(await home(), 'twitter:card')).toBe('summary_large_image');
});

test('the card title, description and image mirror the Open Graph values', async () => {
  const html = await home();
  for (const key of ['title', 'description', 'image']) expect(meta(html, `twitter:${key}`)).toBe(og(html, key));
});
