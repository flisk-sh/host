// GitHub sign-in and host key helpers. Only SHA-256 hashes of host keys are stored (see store.js).
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function sha256(text) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}
export const newHostKey = () => `host_${hex(crypto.getRandomValues(new Uint8Array(24)))}`;
export const newToken = () => hex(crypto.getRandomValues(new Uint8Array(20)));

export function bearer(request) {
  const m = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') || '');
  return m ? m[1] : '';
}

export function githubAuthorizeUrl(env, state) {
  const u = new URL('https://github.com/login/oauth/authorize');
  u.searchParams.set('client_id', env.GITHUB_CLIENT_ID || '');
  u.searchParams.set('redirect_uri', `${env.PUBLIC_ORIGIN}/auth/callback`);
  u.searchParams.set('state', state);
  return u.toString();
}

export async function githubLogin(env, code, fetchImpl = fetch) {
  const tokenRes = await fetchImpl('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }),
  });
  const token = (await tokenRes.json().catch(() => ({}))).access_token;
  if (!token) return null;
  const userRes = await fetchImpl('https://api.github.com/user', { headers: { authorization: `Bearer ${token}`, 'user-agent': 'host', accept: 'application/vnd.github+json' } });
  const login = (await userRes.json().catch(() => ({}))).login;
  return typeof login === 'string' && login ? login : null;
}
