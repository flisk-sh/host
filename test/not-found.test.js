import { describe, expect, test } from 'bun:test';
import worker from '../src/index.js';

describe('small not-found response', () => {
  test('unknown paths return a cached, sub-kilobyte HTML page', async () => {
    const res = await worker.fetch(new Request('https://host.flisk.si/definitely-not-here'), {});
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('cache-control')).toBe('public, max-age=300');
    const body = await res.text();
    expect(new TextEncoder().encode(body).length).toBeLessThan(1024);
    expect(body).toContain('Nothing lives at this address.');
    expect(body).toContain('href="/"');
  });
});
