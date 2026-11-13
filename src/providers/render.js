// Render (render.com) web service from a Docker image. API: https://api.render.com/v1 (docs: https://api-docs.render.com).
// Not tested on a real account: written from the public API docs on 2026-11-13; tests pin what host sends.
import { call, FLEETD_IMAGE } from './http.js';

const API = 'https://api.render.com/v1';
const auth = (key) => ({ authorization: `Bearer ${key}` });

export default {
  label: 'Render',
  untested: true,
  async create(key, { name, token }, { fetchImpl = fetch } = {}) {
    const owners = await call(fetchImpl, `${API}/owners?limit=1`, { headers: auth(key) });
    const ownerId = owners?.[0]?.owner?.id;
    if (!ownerId) throw new Error('Render returned no owner for this key');
    const svc = await call(fetchImpl, `${API}/services`, {
      method: 'POST',
      headers: auth(key),
      body: {
        type: 'web_service',
        name,
        ownerId,
        image: { ownerId, imagePath: FLEETD_IMAGE },
        serviceDetails: { plan: 'free', runtime: 'image', region: 'frankfurt' },
        envVars: [
          { key: 'FLEETD_TOKEN', value: token },
          { key: 'HOST', value: '0.0.0.0' },
          { key: 'PORT', value: '7860' },
        ],
      },
    });
    const id = svc?.service?.id || svc?.id;
    const url = svc?.service?.serviceDetails?.url || svc?.serviceDetails?.url;
    if (!id || !url) throw new Error('Render returned no service id or url');
    return { id, url };
  },
  async remove(key, id, { fetchImpl = fetch } = {}) {
    await call(fetchImpl, `${API}/services/${encodeURIComponent(id)}`, { method: 'DELETE', headers: auth(key) });
  },
};
