import { describe, expect, test } from 'bun:test';
import { PER_MINUTE, overMinuteLimit } from '../src/limit.js';

// A tiny in-memory stand-in for Cloudflare's Cache API; the module only needs match/put.
function fakeCache() {
  const store = new Map();
  return {
    store,
    match: async (key) => (store.has(key) ? new Response(store.get(key)) : undefined),
    put: async (key, response) => {
      store.set(key, await response.text());
    },
  };
}

const NOW = 1_700_000_000_000;

describe('per-minute rate limit', () => {
  test('allows the first PER_MINUTE requests then rejects the next one', async () => {
    const cache = fakeCache();
    for (let i = 0; i < PER_MINUTE; i++) {
      expect(await overMinuteLimit('alice', { cache, now: NOW })).toBe(false);
    }
    expect(await overMinuteLimit('alice', { cache, now: NOW })).toBe(true);
  });

  test('allows requests again in the next minute window', async () => {
    const cache = fakeCache();
    for (let i = 0; i < PER_MINUTE; i++) {
      expect(await overMinuteLimit('alice', { cache, now: NOW })).toBe(false);
    }
    expect(await overMinuteLimit('alice', { cache, now: NOW })).toBe(true);
    expect(await overMinuteLimit('alice', { cache, now: NOW + 60_000 })).toBe(false);
  });

  test('counts each login separately', async () => {
    const cache = fakeCache();
    for (let i = 0; i < PER_MINUTE; i++) {
      expect(await overMinuteLimit('alice', { cache, now: NOW })).toBe(false);
    }
    expect(await overMinuteLimit('alice', { cache, now: NOW })).toBe(true);
    expect(await overMinuteLimit('bob', { cache, now: NOW })).toBe(false);
  });

  test('fails open when no Cache API is available', async () => {
    expect(await overMinuteLimit('alice', { cache: null, now: NOW })).toBe(false);
  });

  test('honours a smaller injected limit', async () => {
    const cache = fakeCache();
    expect(await overMinuteLimit('alice', { cache, now: NOW, limit: 2 })).toBe(false);
    expect(await overMinuteLimit('alice', { cache, now: NOW, limit: 2 })).toBe(false);
    expect(await overMinuteLimit('alice', { cache, now: NOW, limit: 2 })).toBe(true);
  });
});
