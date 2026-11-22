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

  test('reloading the Stop result page goes back to the hosts list, not a 404', async () => {
    const env = mkEnv();
    const c = await signIn(env);
    const r = await get(env, c, '/console/hosts/host_demo_demo1ae4e1/stop');
    expect(r.status).toBe(303);
    expect(r.headers.get('location')).toBe('/console?section=hosts');
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
    expect(await r.text()).toContain('connect Fly.io on the Hosts page first');
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
      expect(r.headers.get('location')).toBe(`/console?section=${s === 'providers' ? 'hosts' : s}`);
    }
    const out = await (await post(env, c, '/console/keys', { name: '<script>alert(1)</script>' })).text();
    expect(out).not.toContain('<script>alert(1)</script>');
  });

  test('northflank connector sends the project and service, and removes the project on a failed address', async () => {
    const { default: nf } = await import('../src/providers/northflank.js');
    const seen = [];
    const ok = async (url, init) => {
      seen.push(`${init.method || 'GET'} ${url}`);
      const body = url.endsWith('/projects') ? { data: { id: 'p1' } } : url.endsWith('/services/fleetd') ? { data: { ports: [{ dns: 'x.code.run' }] } } : {};
      return new Response(JSON.stringify(body), { status: 200 });
    };
    expect(await nf.create('k', { name: 'h1', token: 't' }, { fetchImpl: ok })).toEqual({ id: 'p1', url: 'https://x.code.run' });
    expect(seen[1]).toBe('POST https://api.northflank.com/v1/projects/p1/services/deployment');
    const bad = async (url, init) => new Response(JSON.stringify(url.endsWith('/projects') ? { data: { id: 'p2' } } : { data: { ports: [] } }), { status: 200 });
    const calls = [];
    await expect(nf.create('k', { name: 'h2', token: 't' }, { fetchImpl: (u, i) => (calls.push(i.method || 'GET'), bad(u, i)) })).rejects.toThrow('no public address');
    expect(calls.at(-1)).toBe('DELETE');
  });

  test('railway connector creates project, service and domain, and deletes the project when no domain comes back', async () => {
    const { default: rw } = await import('../src/providers/railway.js');
    const sent = [];
    const reply = (q) =>
      q.includes('projectCreate') ? { projectCreate: { id: 'pr1' } }
      : q.includes('environments') ? { project: { environments: { edges: [{ node: { id: 'e0', name: 'staging' } }, { node: { id: 'e1', name: 'production' } }] } } }
      : q.includes('serviceCreate') ? { serviceCreate: { id: 's1' } }
      : q.includes('serviceDomainCreate') ? { serviceDomainCreate: { domain: 'fleetd.up.railway.app' } }
      : {};
    const ok = async (url, init) => {
      const b = JSON.parse(init.body);
      sent.push(b);
      expect(url).toBe('https://backboard.railway.com/graphql/v2');
      expect(init.headers.authorization).toBe('Bearer k');
      return new Response(JSON.stringify({ data: reply(b.query) }), { status: 200 });
    };
    expect(await rw.create('k', { name: 'h1', token: 't' }, { fetchImpl: ok })).toEqual({ id: 'pr1', url: 'https://fleetd.up.railway.app' });
    expect(sent[2].variables.input.source.image).toContain('fleetd');
    expect(sent[2].variables.input.variables.FLEETD_TOKEN).toBe('t');
    expect(sent[3].variables.input).toEqual({ serviceId: 's1', environmentId: 'e1', targetPort: 7860 });
    const calls = [];
    const noDomain = async (url, init) => {
      const b = JSON.parse(init.body);
      calls.push(b.query);
      return new Response(JSON.stringify({ data: b.query.includes('serviceDomainCreate') ? {} : reply(b.query) }), { status: 200 });
    };
    await expect(rw.create('k', { name: 'h2', token: 't' }, { fetchImpl: noDomain })).rejects.toThrow('no public address');
    expect(calls.at(-1)).toContain('projectDelete');
    const gqlErr = async () => new Response(JSON.stringify({ errors: [{ message: 'Not Authorized' }] }), { status: 200 });
    await expect(rw.create('k', { name: 'h3', token: 't' }, { fetchImpl: gqlErr })).rejects.toThrow('Railway: Not Authorized');
  });

  test('snapdeploy connector creates then starts the container, and explains why an API key cannot delete', async () => {
    const { default: sd } = await import('../src/providers/snapdeploy.js');
    const seen = [];
    const ok = async (url, init) => {
      seen.push(`${init.method || 'GET'} ${url}`);
      expect(init.headers['x-api-key']).toBe('k');
      return new Response(JSON.stringify(url.endsWith('/containers') ? { id: 'c9' } : {}), { status: 200 });
    };
    expect(await sd.create('k', { name: 'h1', token: 't' }, { fetchImpl: ok })).toEqual({ id: 'c9', url: 'https://h1.containers.snapdeploy.app' });
    expect(seen).toEqual(['POST https://snapdeploy.dev/api/mobile/containers', 'POST https://snapdeploy.dev/api/mobile/containers/c9/start']);
    const forbidden = async () => new Response(JSON.stringify({ message: 'INTERACTIVE_SESSION_REQUIRED' }), { status: 403 });
    await expect(sd.remove('k', 'c9', { fetchImpl: forbidden })).rejects.toThrow('delete it in the SnapDeploy dashboard');
    const noFreeHours = async (url) => new Response('{}', { status: url.endsWith('/start') ? 402 : 200 });
    await expect(sd.create('k', { name: 'h2', token: 't' }, { fetchImpl: async (u, i) => (u.endsWith('/containers') ? new Response('{"id":"c1"}', { status: 200 }) : noFreeHours(u)) })).rejects.toThrow('HTTP 402');
  });

  test('provider picker: lists providers with their catch, saves a default, start uses it', async () => {
    const env = mkEnv();
    const c = await signIn(env);
    let h = await (await get(env, c, '/console?section=hosts')).text();
    expect(h).toContain('not chosen yet');
    // one list: an unconnected provider is not a radio choice; it is under Connect a provider
    expect(h).not.toMatch(/name="provider" value="render"/);
    expect(h).toContain('action="/console/providers/render/connect"');
    expect(h).not.toContain('section=providers');
    expect(h).not.toMatch(/>untested</);
    expect(h).toMatch(/name="provider" value="demo"(?! disabled)/);
    // a provider that is not connected cannot become the default
    expect(await (await post(env, c, '/console/default', { provider: 'render' })).text()).toContain('Connect that provider first');
    // demo can; the choice is remembered and shown
    expect(await (await post(env, c, '/console/default', { provider: 'demo' })).text()).toContain('is now your default');
    h = await (await get(env, c, '/console?section=hosts')).text();
    expect(h).toMatch(/Your pods run on: <b id="host-now">Demo/);
    expect(h).toMatch(/value="demo" checked/);
    // "make this my default" on Start
    const env2 = mkEnv();
    const c2 = await signIn(env2);
    const started = await post(env2, c2, '/console/hosts', { provider: 'demo', remember: '1' });
    expect(await started.text()).toContain('Host started');
    expect(await (await get(env2, c2, '/console?section=hosts')).text()).toContain('id="host-now">Demo');
  });
});
