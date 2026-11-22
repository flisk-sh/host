import { expect, test } from 'bun:test';
import { handle } from '../src/index.js';

const home = async () => (await handle(new Request('https://host.flisk.si/'), {})).text();

test('the home page declares a theme-color matching the light page background', async () => {
  const html = await home();
  expect(html).toContain('<meta name="theme-color" content="#f7f5e4">');
  expect(html).toContain('<meta name="theme-color" content="#f7f5e4" media="(prefers-color-scheme: light)">');
});

test('a dark-scheme theme-color variant matching the dark page background is declared', async () => {
  expect(await home()).toContain('<meta name="theme-color" content="#121210" media="(prefers-color-scheme: dark)">');
});
