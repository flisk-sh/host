import { HOSTS, CHECKED } from './hosts.js';
import { hostsPage } from './page.js';
import { cabinetPage, messagePage } from './console.js';
import { PROVIDERS, hostRef, parseRef } from './providers/index.js';
import { bearer, githubAuthorizeUrl, githubLogin, newToken } from './auth.js';
import { clearSession, makeSession, readSession, sameOrigin } from './session.js';
import { vaultReady } from './vault.js';
import { connectProvider, createKey, disconnectProvider, getHost, listConnections, listHosts, listKeys, loginForKey, markHostRemoved, providerKey, recordHost, revokeKey } from './store.js';
import { overMinuteLimit } from './limit.js';

const HEADERS = { 'content-type': 'text/html; charset=utf-8' };
const html = (body, status = 200, extra = {}) => new Response(body, { status, headers: { ...HEADERS, ...extra } });
const json = (status, body) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
const redirect = (to, extra = {}) => new Response(null, { status: 303, headers: { location: to, ...extra } });
const safeNext = (n) => (/^\/console(\?[\w=&%.-]*)?$/.test(n || '') ? n : '/console');

// Start a pod host on `provider` with the user's own provider key. Returns { host } or { status, error }.
export async function startHost(env, login, provider, { fetchImpl = fetch, providers = PROVIDERS } = {}) {
  const adapter = providers[provider];
  if (!adapter) return { status: 400, error: `unknown provider "${provider}". Known: ${Object.keys(providers).join(', ')}` };
  const key = adapter.demo ? 'demo' : await providerKey(env, login, provider);
  if (!key) return { status: 400, error: `connect ${adapter.label} on the Providers page first` };
  const token = newToken();
  const name = `fleetd-${newToken().slice(0, 8)}`;
  let made;
  try {
    made = await adapter.create(key, { name, token }, { fetchImpl });
  } catch (e) {
    return { status: 502, error: `${adapter.label} refused: ${String(e?.message || e).slice(0, 200)}` };
  }
  const ref = hostRef(provider, made.id);
  await recordHost(env, login, { ref, provider, url: made.url, token });
  return { host: { id: ref, provider, url: made.url, token, credential: `${token}@${made.url}` } };
}

export async function stopHost(env, login, ref, { fetchImpl = fetch, providers = PROVIDERS } = {}) {
  const parsed = parseRef(ref);
  const host = parsed && (await getHost(env, login, ref));
  if (!host) return { status: 404, error: 'no such host' };
  if (host.removed) return { ok: true, alreadyGone: true };
  const adapter = providers[parsed.provider];
  const key = adapter?.demo ? 'demo' : await providerKey(env, login, parsed.provider);
  if (adapter && key) {
    try {
      await adapter.remove(key, parsed.id, { fetchImpl });
    } catch (e) {
      if (e.status !== 404) return { status: 502, error: `${adapter.label} refused: ${String(e?.message || e).slice(0, 200)}` };
    }
  }
  await markHostRemoved(env, login, ref);
  return { ok: true };
}

export async function handle(request, env = {}, opts = {}) {
  // HEAD is GET without the body.
  if (request.method === 'HEAD') {
    const r = await handle(new Request(request.url, { method: 'GET', headers: request.headers }), env, opts);
    return new Response(null, { status: r.status, headers: r.headers });
  }
  const { providers = PROVIDERS, fetchImpl = fetch } = opts;
  const url = new URL(request.url);
  const path = url.pathname;
  const origin = env.PUBLIC_ORIGIN || url.origin;

  // ---- public
  if (request.method === 'GET' && path === '/') return html(hostsPage(), 200, { 'cache-control': 'public, max-age=300' });
  if (request.method === 'GET' && path === '/v1/hosts-catalog') return Response.json({ checked: CHECKED, hosts: HOSTS }, { headers: { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300' } });

  // ---- sign-in
  if (request.method === 'GET' && path === '/auth/start') {
    if (!env.DB || !env.SESSION_SECRET) return html(messagePage('Sign-in is not set up', 'This copy of host has no key store or session secret yet.'), 503);
    const next = safeNext(url.searchParams.get('next'));
    if (await readSession(env, request)) return redirect(next);
    if (env.DEV_LOGIN) return redirect(next, { 'set-cookie': await makeSession(env, env.DEV_LOGIN) });
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return html(messagePage('Sign-in is not set up', 'GitHub sign-in has not been connected yet.'), 503);
    const state = crypto.randomUUID();
    const headers = new Headers({ location: githubAuthorizeUrl({ ...env, PUBLIC_ORIGIN: origin }, state) });
    headers.append('set-cookie', `host_state=${state}; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
    headers.append('set-cookie', `host_next=${encodeURIComponent(next)}; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
    return new Response(null, { status: 302, headers });
  }
  if (request.method === 'GET' && path === '/auth/callback') {
    const state = url.searchParams.get('state') || '';
    const cookie = /(?:^|;\s*)host_state=([^;]+)/.exec(request.headers.get('cookie') || '')?.[1] || '';
    const code = url.searchParams.get('code') || '';
    if (!env.DB || !env.SESSION_SECRET || !code || !state || state !== cookie) return html(messagePage('Sign-in failed', 'The sign-in link expired. Start again.'), 400);
    const login = await githubLogin(env, code, fetchImpl);
    if (!login) return html(messagePage('Sign-in failed', "GitHub didn't confirm the sign-in. Start again."), 400);
    const nextCookie = /(?:^|;\s*)host_next=([^;]+)/.exec(request.headers.get('cookie') || '')?.[1];
    const headers = new Headers({ location: safeNext(nextCookie ? decodeURIComponent(nextCookie) : '') });
    headers.append('set-cookie', await makeSession(env, login));
    headers.append('set-cookie', 'host_state=; Path=/auth; Max-Age=0');
    headers.append('set-cookie', 'host_next=; Path=/auth; Max-Age=0');
    return new Response(null, { status: 303, headers });
  }
  if (request.method === 'POST' && path === '/auth/signout') {
    if (!sameOrigin(request, origin)) return html(messagePage('Not allowed', 'This form only works from host itself.'), 403);
    return redirect('/', { 'set-cookie': clearSession() });
  }

  // ---- cabinet
  if (path === '/console' || path.startsWith('/console/')) {
    if (!env.DB) return html(messagePage('Sign-in is not set up', 'This copy of host has no key store yet.'), 503);
    const session = await readSession(env, request);
    if (!session) return request.method === 'GET' ? redirect(`/auth/start?next=${encodeURIComponent(path + url.search)}`) : html(messagePage('Signed out', 'Sign in again.'), 401);
    const { login } = session;
    const canConnect = vaultReady(env);
    const page = async (section, extra = {}) =>
      html(cabinetPage({ origin, login, section, canConnect, hosts: await listHosts(env, login), keys: await listKeys(env, login), connections: await listConnections(env, login), ...extra }), 200, { 'cache-control': 'no-store' });
    if (request.method === 'GET' && path === '/console') return page(url.searchParams.get('section') || 'overview');
    // A result page (after Start, Connect, Create key) sits at /console/<section>; a reload must not 404.
    const where = request.method === 'GET' && /^\/console\/(overview|hosts|providers|keys|docs)$/.exec(path);
    if (where) return redirect(`/console?section=${where[1]}`);
    if (request.method === 'POST') {
      if (!sameOrigin(request, origin)) return html(messagePage('Not allowed', 'This form only works from host itself.'), 403);
      const form = await request.formData().catch(() => null);
      if (path === '/console/keys') {
        const made = await createKey(env, login, form?.get('name'));
        return page('keys', { newKey: made.key, error: made.error });
      }
      let m = /^\/console\/keys\/([a-f0-9]{12})\/revoke$/.exec(path);
      if (m) return page('keys', { error: (await revokeKey(env, login, m[1])).error });
      m = /^\/console\/providers\/([a-z0-9]+)\/(connect|disconnect)$/.exec(path);
      if (m) {
        const [, provider, action] = m;
        if (!providers[provider] || providers[provider].demo) return page('providers', { error: 'No such provider.' });
        if (!canConnect) return page('providers', { error: 'Connecting providers is not set up on this copy of host.' });
        if (action === 'disconnect') {
          await disconnectProvider(env, login, provider);
          return page('providers', { notice: `${providers[provider].label} disconnected. Host no longer has that key.` });
        }
        const done = await connectProvider(env, login, provider, form?.get('key'));
        return page('providers', done.error ? { error: done.error } : { notice: `${providers[provider].label} connected.` });
      }
      if (path === '/console/hosts') {
        const made = await startHost(env, login, String(form?.get('provider') || ''), { fetchImpl, providers });
        return page('hosts', made.error ? { error: made.error } : { fresh: made.host });
      }
      m = /^\/console\/hosts\/([^/]+)\/stop$/.exec(path);
      if (m) {
        const done = await stopHost(env, login, decodeURIComponent(m[1]), { fetchImpl, providers });
        return page('hosts', done.error ? { error: done.error } : { notice: 'Host stopped.' });
      }
    }
    return html(messagePage('Page not found', 'Nothing lives at this address.'), 404);
  }

  // ---- API (Bearer host key)
  if (path.startsWith('/v1/')) {
    const login = await loginForKey(env, bearer(request));
    if (!login) return json(401, { error: `missing, revoked or unknown host key. Create one at ${origin}/console?section=keys and send it as "Authorization: Bearer host_..."` });
    if (await overMinuteLimit(login, { cache: env.LIMIT_CACHE })) return json(429, { error: 'too many requests for this account: at most 120 a minute' });
    if (path === '/v1/providers' && request.method === 'GET') {
      const conn = await listConnections(env, login);
      return json(200, { providers: Object.entries(providers).map(([id, p]) => ({ id, label: p.label, connected: !!p.demo || !!conn[id], untested: !!p.untested })) });
    }
    if (path === '/v1/hosts' && request.method === 'GET') return json(200, { hosts: await listHosts(env, login) });
    if (path === '/v1/hosts' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const made = await startHost(env, login, String(body?.provider || ''), { fetchImpl, providers });
      return made.error ? json(made.status, { error: made.error }) : json(201, made.host);
    }
    const m = /^\/v1\/hosts\/([^/]+)$/.exec(path);
    if (m) {
      const ref = decodeURIComponent(m[1]);
      if (request.method === 'GET') {
        const h = await getHost(env, login, ref);
        return h ? json(200, { id: h.id, provider: h.provider, url: h.url, created: h.created, removed: h.removed, credential: h.token ? `${h.token}@${h.url}` : null }) : json(404, { error: 'no such host' });
      }
      if (request.method === 'DELETE') {
        const done = await stopHost(env, login, ref, { fetchImpl, providers });
        return done.error ? json(done.status, { error: done.error }) : json(200, done);
      }
    }
    return json(404, { error: 'not found' });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('method not allowed', { status: 405, headers: { allow: 'GET' } });
  return html(messagePage('Page not found', 'Nothing lives at this address.'), 404);
}

export default { fetch: (request, env) => handle(request, env) };
