import { readFileSync } from 'node:fs';
import { handle } from '../src/index.js';
import { fakeD1 } from '../test/d1.js';

const DB = fakeD1(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
const port = Number(process.env.PORT) || 8798;
const env = { DB, SESSION_SECRET: 'dev-only-secret', PROVIDER_KEYS_SECRET: 'dev-only-provider-keys-secret-0123456789', DEV_LOGIN: process.env.DEV_LOGIN || 'local-dev', PUBLIC_ORIGIN: `http://localhost:${port}` };
Bun.serve({ port, fetch: (request) => handle(request, env) });
console.log(`host on http://localhost:${port}`);
