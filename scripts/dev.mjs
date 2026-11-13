import { handle } from '../src/index.js';
Bun.serve({ port: Number(process.env.PORT) || 8798, fetch: handle });
console.log('host on http://localhost:' + (process.env.PORT || 8798));
