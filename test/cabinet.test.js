import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { handle } from '../src/index.js';
import { fakeD1 } from './d1.js';

const schema = readFileSync(new URL('../schema.sql', import.meta.url), 'utf8');
const mkEnv = () => ({ DB: fakeD1(schema), SESSION_SECRET: 's'.repeat(32), PROVIDER_KEYS_SECRET: 'p'.repeat(40), DEV_LOGIN: 'tester', PUBLIC_ORIGIN: 'https://host.test' });
const O = 'https://host.test';

async function signIn(env) {
  const r = await handle(new Request(`${O}/auth/start?next=/console`), env);
  expect(r.status).toBe(303);
  return r.headers.get('set-cookie').split(';')[0];
}
const post = (env, cookie, path, fields = {}, fetchImpl) =>
  handle(new Request(`${O}${path}`, { method: 'POST', headers: { cookie, origin: O }, body: new URLSearchParams(fields) }), env, fetchImpl ? { fetchImpl } : undefined);
const get = (env, cookie, path) => handle(new Request(`${O}${path}`, { headers: { cookie } }), env);

describe('cabinet', () => {
  test('console needs sign-in', async () => {
    const env = mkEnv();
    const r = await handle(new Request(`${O}/console`), env);
    expect(r.status).toBe(303);
    expect(r.headers.get('location')).toContain('/auth/start');
  });

  test('signed in: pages render, key shown once, API works with it', async () => {
    const env = mkEnv();
    const c = await signIn(env);
    for (const s of ['overview', 'hosts', 'providers', 'keys', 'docs']) {
      const r = await get(env, c, `/console?section=${s}`);
      expect(r.status).toBe(200);
    }
    const made = await (await post(env, c, '/console/keys', { name: 'laptop' })).text();
    const key = /host_[A-Za-z0-9_-]+/.exec(made)?.[0];
    expect(key).toBeTruthy();
    expect(await (await get(env, c, '/console?section=keys')).text()).not.toContain(key);
    const api = await handle(new Request(`${O}/v1/providers`, { headers: { authorization: `Bearer ${key}` } }), env);
    expect(api.status).toBe(200);
    expect((await handle(new Request(`${O}/v1/hosts`), env)).status).toBe(401);
  });

  test('demo host start, list, stop through the API', async () => {
    const env = mkEnv();
    const c = await signIn(env);
    const key = /host_[A-Za-z0-9_-]+/.exec(await (await post(env, c, '/console/keys', { name: 'k' })).text())[0];
    const auth = { authorization: `Bearer ${key}` };
    const r = await handle(new Request(`${O}/v1/hosts`, { method: 'POST', headers: auth, body: JSON.stringify({ provider: 'demo' }) }), env);
    expect(r.status).toBe(201);
    const h = await r.json();
    expect(h.credential).toBe(`${h.token}@${h.url}`);
    const list = await (await handle(new Request(`${O}/v1/hosts`, { headers: auth }), env)).json();
    expect(list.hosts.length).toBe(1);
    const del = await handle(new Request(`${O}/v1/hosts/${encodeURIComponent(h.id)}`, { method: 'DELETE', headers: auth }), env);
    expect(del.status).toBe(200);
    expect((await (await handle(new Request(`${O}/v1/hosts/${encodeURIComponent(h.id)}`, { headers: auth }), env)).json()).removed).toBeTruthy();
  });

  test('provider key is vaulted, never shown, and used by the adapter', async () => {
    const env = mkEnv();
    const c = await signIn(env);
    const secret = 'rnd_supersecretkey123456';
    const done = await (await post(env, c, '/console/providers/render/connect', { key: secret })).text();
    expect(done).not.toContain(secret);
    expect(await (await get(env, c, '/console?section=providers')).text()).not.toContain(secret);
    const stored = JSON.stringify(env.DB.raw.query('select * from provider_keys').all());
    expect(stored.length).toBeGreaterThan(10);
    expect(stored).not.toContain(secret);
    const seen = [];
    const fetchImpl = async (u, init) => { seen.push([String(u), init?.headers?.authorization || init?.headers?.Authorization]); return Response.json({ service: { id: 'srv-1', serviceDetails: { url: 'https://x.onrender.com' } }, id: 'srv-1' }); };
    const r = await post(env, c, '/console/hosts', { provider: 'render' }, fetchImpl);
    expect(r.status).toBe(200);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[0][1]).toContain(secret);
  });

  test('a host without its provider key is refused; cross-origin posts are refused', async () => {
    const env = mkEnv();
    const c = await signIn(env);
    const r = await post(env, c, '/console/hosts', { provider: 'fly' });
    expect(await r.text()).toContain('Providers');
    const bad = await handle(new Request(`${O}/console/keys`, { method: 'POST', headers: { cookie: c, origin: 'https://evil.test' }, body: new URLSearchParams({ name: 'x' }) }), env);
    expect(bad.status).toBe(403);
  });
});

describe('cabinet reloads', () => {
  test('a result page URL still works on GET and escapes key names', async () => {
    const env = mkEnv();
    const c = await signIn(env);
    for (const s of ['hosts', 'keys', 'providers']) {
      const r = await get(env, c, `/console/${s}`);
      expect(r.status).toBe(303);
      expect(r.headers.get('location')).toBe(`/console?section=${s}`);
    }
    const out = await (await post(env, c, '/console/keys', { name: '<script>alert(1)</script>' })).text();
    expect(out).not.toContain('<script>alert(1)</script>');
  });
});
