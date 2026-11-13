// What host remembers, in D1 (see schema.sql). Provider keys and fleetd tokens are sealed (vault.js).
import { sha256, newHostKey } from './auth.js';
import { open, seal } from './vault.js';

export const MAX_KEYS = 10;
const DAY = 86400_000;
const nowIso = () => new Date().toISOString();

const keyRow = (r) => ({ id: r.id, name: r.name, hint: r.hint, created: r.created, lastUsed: r.last_used });

export async function listKeys(env, login) {
  const { results } = await env.DB.prepare('SELECT * FROM keys WHERE login = ? ORDER BY created DESC').bind(login).all();
  return results.map(keyRow);
}
export async function createKey(env, login, name) {
  const list = await listKeys(env, login);
  if (list.length >= MAX_KEYS) return { error: `You have ${MAX_KEYS} keys. Revoke one first.`, list };
  const key = newHostKey();
  const hash = await sha256(key);
  const entry = { id: hash.slice(0, 12), name: String(name || '').trim().slice(0, 40) || 'default', hint: `${key.slice(0, 9)}…${key.slice(-4)}`, created: nowIso(), lastUsed: null };
  await env.DB.prepare('INSERT INTO keys (hash, id, login, name, hint, created) VALUES (?, ?, ?, ?, ?, ?)').bind(hash, entry.id, login, entry.name, entry.hint, entry.created).run();
  return { key, entry, list: [entry, ...list] };
}
export async function revokeKey(env, login, id) {
  const r = await env.DB.prepare('DELETE FROM keys WHERE login = ? AND id = ?').bind(login, id).run();
  const list = await listKeys(env, login);
  return r.meta.changes ? { list } : { error: 'No such key.', list };
}
// API side: host key -> login. "Last used" is written at most once a day a key.
export async function loginForKey(env, key) {
  if (!key || !key.startsWith('host_') || !env.DB) return null;
  const hash = await sha256(key);
  const row = await env.DB.prepare('SELECT * FROM keys WHERE hash = ?').bind(hash).first();
  if (!row) return null;
  if (Date.now() - Date.parse(row.last_used || 0) > DAY) {
    try {
      await env.DB.prepare('UPDATE keys SET last_used = ? WHERE hash = ?').bind(nowIso(), hash).run();
    } catch {}
  }
  return row.login;
}

// ---- hosting-provider keys, connected once in the cabinet
export async function connectProvider(env, login, provider, key) {
  const clean = String(key || '').trim();
  if (clean.length < 8 || clean.length > 400 || /\s/.test(clean)) return { error: 'That does not look like an API key. Paste the whole key, with no spaces.' };
  const sealed = await seal(env.PROVIDER_KEYS_SECRET, clean);
  await env.DB.prepare('INSERT INTO provider_keys (login, provider, sealed, hint, created) VALUES (?, ?, ?, ?, ?) ON CONFLICT(login, provider) DO UPDATE SET sealed = excluded.sealed, hint = excluded.hint, created = excluded.created')
    .bind(login, provider, sealed, clean.slice(-4), nowIso())
    .run();
  return { ok: true };
}
export async function disconnectProvider(env, login, provider) {
  await env.DB.prepare('DELETE FROM provider_keys WHERE login = ? AND provider = ?').bind(login, provider).run();
}
export async function listConnections(env, login) {
  const { results } = await env.DB.prepare('SELECT provider, hint, created FROM provider_keys WHERE login = ?').bind(login).all();
  return Object.fromEntries(results.map((r) => [r.provider, { hint: r.hint, created: r.created }]));
}
export async function providerKey(env, login, provider) {
  const r = await env.DB.prepare('SELECT sealed FROM provider_keys WHERE login = ? AND provider = ?').bind(login, provider).first();
  if (!r) return null;
  try {
    return await open(env.PROVIDER_KEYS_SECRET, r.sealed);
  } catch {
    return null;
  }
}

// ---- hosts (fleetd) started through host
export async function recordHost(env, login, { ref, provider, url, token }) {
  const sealed = await seal(env.PROVIDER_KEYS_SECRET, token);
  await env.DB.prepare('INSERT INTO hosts (login, ref, provider, url, sealed_token, created) VALUES (?, ?, ?, ?, ?, ?)').bind(login, ref, provider, url, sealed, nowIso()).run();
}
const hostRow = (r) => ({ id: r.ref, provider: r.provider, url: r.url, created: r.created, removed: r.removed });
export async function listHosts(env, login) {
  const { results } = await env.DB.prepare('SELECT * FROM hosts WHERE login = ? ORDER BY n DESC LIMIT 100').bind(login).all();
  return results.map(hostRow);
}
export async function getHost(env, login, ref) {
  const r = await env.DB.prepare('SELECT * FROM hosts WHERE login = ? AND ref = ?').bind(login, ref).first();
  if (!r) return null;
  let token = null;
  try {
    token = await open(env.PROVIDER_KEYS_SECRET, r.sealed_token);
  } catch {}
  return { ...hostRow(r), token };
}
export async function markHostRemoved(env, login, ref) {
  await env.DB.prepare('UPDATE hosts SET removed = ? WHERE login = ? AND ref = ? AND removed IS NULL').bind(nowIso(), login, ref).run();
}
