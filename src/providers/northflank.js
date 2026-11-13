// Northflank (northflank.com) project + deployment service from a Docker image. API: https://api.northflank.com/v1 (docs: https://northflank.com/docs/v1/api).
// Not tested on a real account: written from the public docs on 2026-11-13; tests pin what host sends.
import { call, FLEETD_IMAGE } from './http.js';

const API = 'https://api.northflank.com/v1';
const auth = (key) => ({ authorization: `Bearer ${key}` });

export default {
  label: 'Northflank',
  untested: true,
  async create(key, { name, token }, { fetchImpl = fetch } = {}) {
    const proj = await call(fetchImpl, `${API}/projects`, { method: 'POST', headers: auth(key), body: { name, region: 'europe-west', billing: { deploymentPlan: 'nf-compute-10' } } });
    const projectId = proj?.data?.id;
    if (!projectId) throw new Error('Northflank returned no project id');
    try {
      await call(fetchImpl, `${API}/projects/${projectId}/services/deployment`, {
        method: 'POST',
        headers: auth(key),
        body: {
          name: 'fleetd',
          billing: { deploymentPlan: 'nf-compute-10' },
          deployment: { instances: 1, external: { imagePath: FLEETD_IMAGE } },
          runtimeEnvironment: { FLEETD_TOKEN: token, HOST: '0.0.0.0', PORT: '7860' },
          ports: [{ name: 'p01', internalPort: 7860, public: true, protocol: 'HTTP' }],
        },
      });
      const info = await call(fetchImpl, `${API}/projects/${projectId}/services/fleetd`, { headers: auth(key) });
      const dns = info?.data?.ports?.find((p) => p.dns)?.dns;
      if (!dns) throw new Error('Northflank returned no public address yet');
      return { id: projectId, url: `https://${dns}` };
    } catch (e) {
      await call(fetchImpl, `${API}/projects/${projectId}`, { method: 'DELETE', headers: auth(key) }).catch(() => {});
      throw e;
    }
  },
  async remove(key, id, { fetchImpl = fetch } = {}) {
    await call(fetchImpl, `${API}/projects/${encodeURIComponent(id)}`, { method: 'DELETE', headers: auth(key) });
  },
};
