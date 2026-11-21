import { describe, expect, test } from 'bun:test';
import { open, seal, vaultReady } from '../src/vault.js';

const SECRET = '0123456789abcdef0123456789abcdef';
const OTHER = 'ffffffffffffffffffffffffffffffff';

describe('provider key vault', () => {
  test('seal then open returns the original text', async () => {
    const sealed = await seal(SECRET, 'sk-live-123');
    expect(sealed).not.toBe('sk-live-123');
    expect(await open(SECRET, sealed)).toBe('sk-live-123');
  });

  test('open fails closed with a different secret', async () => {
    const sealed = await seal(SECRET, 'sk-live-123');
    let failed = false;
    try {
      await open(OTHER, sealed);
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  });

  test('each seal uses a fresh IV', async () => {
    const first = await seal(SECRET, 'same text');
    const second = await seal(SECRET, 'same text');
    expect(first).not.toBe(second);
    expect(await open(SECRET, first)).toBe('same text');
    expect(await open(SECRET, second)).toBe('same text');
  });

  test('seal refuses a missing or short secret', async () => {
    for (const secret of [undefined, '', 'too short']) {
      let failed = false;
      try {
        await seal(secret, 'x');
      } catch {
        failed = true;
      }
      expect(failed).toBe(true);
    }
  });

  test('vaultReady needs a string secret of at least 32 characters', () => {
    expect(vaultReady({ PROVIDER_KEYS_SECRET: SECRET })).toBe(true);
    expect(vaultReady({ PROVIDER_KEYS_SECRET: SECRET.slice(0, 31) })).toBe(false);
    expect(vaultReady({ PROVIDER_KEYS_SECRET: undefined })).toBe(false);
    expect(vaultReady({ PROVIDER_KEYS_SECRET: 12345678901234567890123456789012 })).toBe(false);
    expect(vaultReady({})).toBe(false);
  });
});
