export const UA = 'host/0.1 (+https://host.flisk.si)';
// One fetch helper for every adapter: JSON in, JSON out, and an error naming the HTTP status and the provider's message.
export async function call(fetchImpl, url, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetchImpl(url, {
    method,
    headers: { 'user-agent': UA, accept: 'application/json', ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.message || data?.error?.message || (typeof data?.error === 'string' ? data.error : '') || String(text).replace(/<[^>]*>/g, ' ').trim().slice(0, 160);
    const err = new Error(`HTTP ${res.status}${msg ? `: ${msg}` : ''}`);
    err.status = res.status;
    throw err;
  }
  return data;
}
// The image every real host runs. Built from fleet's fleetd/Dockerfile.
export const FLEETD_IMAGE = 'ghcr.io/flisk-sh/fleetd:latest';
export const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30);
