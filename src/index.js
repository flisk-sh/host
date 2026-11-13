import { HOSTS, CHECKED } from './hosts.js';
import { hostsPage } from './page.js';

export async function handle(request) {
  const { pathname } = new URL(request.url);
  if (request.method !== 'GET') return new Response('method not allowed', { status: 405 });
  if (pathname === '/') return new Response(hostsPage(), { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' } });
  if (pathname === '/v1/hosts') return Response.json({ checked: CHECKED, hosts: HOSTS }, { headers: { 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=300' } });
  return new Response('not found', { status: 404 });
}
export default { fetch: (request) => handle(request) };
