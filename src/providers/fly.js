// Fly.io Machines API (https://fly.io/docs/machines/api/). One app and one machine per host.
// Not tested on a real account (Fly wants a card before any machine): written from the public docs on 2026-11-13.
import { call, FLEETD_IMAGE } from './http.js';

const API = 'https://api.machines.dev/v1';
const auth = (key) => ({ authorization: `Bearer ${key}` });

export default {
  label: 'Fly.io',
  untested: true,
  async create(key, { name, token }, { fetchImpl = fetch } = {}) {
    const [org, ...rest] = String(key).split(':');
    const apiKey = rest.length ? rest.join(':') : org; // "org:token" or just a token (personal org)
    const orgSlug = rest.length ? org : 'personal';
    await call(fetchImpl, `${API}/apps`, { method: 'POST', headers: auth(apiKey), body: { app_name: name, org_slug: orgSlug } });
    await call(fetchImpl, `${API}/apps/${name}/machines`, {
      method: 'POST',
      headers: auth(apiKey),
      body: {
        config: {
          image: FLEETD_IMAGE,
          env: { FLEETD_TOKEN: token, HOST: '0.0.0.0', PORT: '7860' },
          guest: { cpu_kind: 'shared', cpus: 1, memory_mb: 256 },
          services: [{ protocol: 'tcp', internal_port: 7860, ports: [{ port: 443, handlers: ['tls', 'http'] }, { port: 80, handlers: ['http'] }] }],
        },
      },
    });
    return { id: name, url: `https://${name}.fly.dev` };
  },
  async remove(key, id, { fetchImpl = fetch } = {}) {
    const apiKey = String(key).includes(':') ? String(key).split(':').slice(1).join(':') : key;
    await call(fetchImpl, `${API}/apps/${encodeURIComponent(id)}`, { method: 'DELETE', headers: auth(apiKey) });
  },
};
