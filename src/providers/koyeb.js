// Koyeb (koyeb.com) app + web service from a Docker image. API: https://app.koyeb.com/v1 (docs: https://www.koyeb.com/docs/api).
// Not tested on a real account (Koyeb asks for a card, with a $29 hold): written from the public docs on 2026-11-13.
import { call, FLEETD_IMAGE } from './http.js';

const API = 'https://app.koyeb.com/v1';
const auth = (key) => ({ authorization: `Bearer ${key}` });

export default {
  label: 'Koyeb',
  untested: true,
  async create(key, { name, token }, { fetchImpl = fetch } = {}) {
    const app = await call(fetchImpl, `${API}/apps`, { method: 'POST', headers: auth(key), body: { name } });
    const appId = app?.app?.id;
    if (!appId) throw new Error('Koyeb returned no app id');
    await call(fetchImpl, `${API}/services`, {
      method: 'POST',
      headers: auth(key),
      body: {
        app_id: appId,
        definition: {
          name: 'fleetd',
          type: 'WEB',
          docker: { image: FLEETD_IMAGE },
          env: [
            { key: 'FLEETD_TOKEN', value: token },
            { key: 'HOST', value: '0.0.0.0' },
            { key: 'PORT', value: '7860' },
          ],
          ports: [{ port: 7860, protocol: 'http' }],
          routes: [{ port: 7860, path: '/' }],
          regions: ['fra'],
          instance_types: [{ type: 'free' }],
          scalings: [{ min: 1, max: 1 }],
        },
      },
    });
    const info = await call(fetchImpl, `${API}/apps/${appId}`, { headers: auth(key) });
    const domain = info?.app?.domains?.[0]?.name;
    if (!domain) throw new Error('Koyeb returned no public domain yet');
    return { id: appId, url: `https://${domain}` };
  },
  async remove(key, id, { fetchImpl = fetch } = {}) {
    await call(fetchImpl, `${API}/apps/${encodeURIComponent(id)}`, { method: 'DELETE', headers: auth(key) });
  },
};
