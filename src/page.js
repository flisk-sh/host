import { HOSTS, LABEL, CHECKED } from './hosts.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const CSS = `
:root{--paper:#f7f5e4;--card:#fffef6;--ink:#171715;--dim:#6b6a5f;--green:#16a34a;--red:#b42318;--mono:'JetBrains Mono',ui-monospace,Menlo,monospace;--sans:'Inter Tight',system-ui,sans-serif;--serif:Fraunces,Georgia,serif}
@media (prefers-color-scheme:dark){:root{--paper:#121210;--card:#1a1a17;--ink:#f1efe0;--dim:#a09f92;--green:#4ade80;--red:#f97066}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.55 var(--sans)}
a{color:inherit}.m{font-family:var(--mono);text-transform:uppercase;letter-spacing:.06em;font-size:12px}
.frame{max-width:980px;margin:0 auto;padding:0 0 64px;border-left:1px solid var(--ink);border-right:1px solid var(--ink)}.pad{padding:0 16px}
.top{display:flex;align-items:stretch;border-bottom:1px solid var(--ink);height:56px;position:relative}
.top .brand{display:flex;align-items:center;gap:11px;padding:0 20px;text-decoration:none;border-right:1px solid var(--ink);font:800 23px/1 var(--serif);letter-spacing:-.015em;text-transform:none}
.top .tile{display:grid;place-items:center;width:34px;height:34px;flex-shrink:0}.top .tile svg{width:34px;height:34px}
.top .swp{display:flex;align-items:center;padding:0 14px;border-right:1px solid var(--ink)}
.swp span{display:inline-flex;border:1px solid var(--ink);padding:3px;gap:3px;background:var(--card)}
.swp a{display:inline-flex;align-items:center;gap:7px;padding:6px 11px;text-decoration:none;color:var(--dim);transition:background .15s,color .15s}
.swp a i{width:7px;height:7px;border:1px solid currentColor;flex-shrink:0}
.swp a:hover{color:var(--ink);background:var(--paper)}
.swp a.on{background:var(--ink);color:var(--paper)}
.swp a.on i{background:#22c55e;border-color:#22c55e;box-shadow:0 0 0 0 rgba(34,197,94,.7);animation:swpulse 1.8s infinite}
@keyframes swpulse{70%{box-shadow:0 0 0 6px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
@media (prefers-reduced-motion:reduce){.swp a.on i{animation:none}}
.top nav{display:flex;gap:26px;align-items:center;padding:0 20px;margin-left:auto}
.top nav a{position:relative;text-decoration:none;padding:19px 0}
.top nav a::after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:3px;background:var(--green);transform:scaleX(0);transform-origin:left;transition:transform .18s}
.top nav a:hover::after,.top nav a[aria-current]::after{transform:scaleX(1)}
.top .cta{display:flex;align-items:center;gap:9px;padding:0 24px;background:var(--green);background-image:repeating-linear-gradient(135deg,transparent 0 7px,rgba(0,0,0,.07) 7px 10px);color:#04130a;font-weight:600;text-decoration:none;border-left:1px solid var(--ink)}
.top .cta i{font-style:normal;display:inline-block;transition:transform .18s}.top .cta:hover i{transform:translateX(4px)}.top .cta:hover{background-color:#22c55e}
@media (max-width:600px){.top .brand{padding:0 12px}.top{height:auto;flex-wrap:wrap}.top .brand{height:54px}.top nav{display:none}.top .cta{margin-left:auto;height:54px}.top .swp{order:3;width:100%;border-right:0;border-top:1px solid var(--ink);padding:8px 12px}.swp span{display:flex;width:100%}.swp a{flex:1;justify-content:center;padding:7px 4px}.top nav{gap:14px;padding:0 12px;flex:1;min-width:0;overflow-x:auto;scrollbar-width:none}.top nav a{white-space:nowrap}.top .cta{padding:0 14px}}
h1{font:800 clamp(34px,6vw,60px)/1.02 var(--serif);margin:48px 0 14px}h2{font:800 24px/1.1 var(--serif);margin:44px 0 12px}
.lede{max-width:640px;color:var(--dim);font-size:17px}
.fam{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid var(--ink);margin:24px 0}.fam div{padding:14px;border-right:1px solid var(--ink)}.fam div:last-child{border:0}
.fam b{display:block;font-family:var(--mono)}.fam span{color:var(--dim)}
.hosts{display:grid;gap:0;border:1px solid var(--ink)}.h{padding:16px;border-bottom:1px solid var(--ink);background:var(--card)}.h:last-child{border:0}
.h header{display:flex;flex-wrap:wrap;gap:10px;align-items:baseline;justify-content:space-between}.h h3{margin:0;font-size:18px}
.tag{font:500 11px/1 var(--mono);text-transform:uppercase;padding:4px 7px;border:1px solid var(--ink)}.tag.use{background:var(--green);color:#04130a;border-color:var(--green)}
.h p{margin:6px 0 0}.h .c{color:var(--dim)}.h .sz{font-family:var(--mono);font-size:12px;color:var(--dim)}
pre{background:#0a0a0e;color:#e8e8e0;padding:14px;white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.5 var(--mono)}
ol{padding-left:20px}li{margin:6px 0}code{font-family:var(--mono);font-size:13px}
.note{color:var(--dim);font-size:13px;margin-top:28px}
@media (max-width:640px){.fam{grid-template-columns:1fr}.fam div{border-right:0;border-bottom:1px solid var(--ink)}}
`;

const DOCKERFILE = `FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 git curl ca-certificates && rm -rf /var/lib/apt/lists/*
USER node
WORKDIR /home/node/app
COPY --chown=node fleetd.mjs .
ENV PORT=7860 HOST=0.0.0.0
EXPOSE 7860
CMD ["node", "fleetd.mjs"]`;

// The standard Flisk second-level header (same as fleet's topbar in flisk-sh/fleet src/page.js): keep the two in step.
export const HOST_MARK = '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" rx="14" fill="#0b0b0d"/><rect x="12" y="14" width="40" height="10" rx="3" fill="#fbfaf7" opacity=".25"/><rect x="12" y="27" width="40" height="10" rx="3" fill="#fbfaf7" opacity=".25"/><rect x="12" y="40" width="40" height="10" rx="3" fill="#16a34a"/><circle cx="46" cy="45" r="2.5" fill="#0b0b0d"/></svg>';
export const topbar = ({ name, mark, nav, cta, sw = [], current = '' }) =>
  `<div class="top m"><a class="brand" href="/" aria-label="${esc(name)} home"><span class="tile">${mark}</span><b>${esc(name)}</b></a>` +
  (sw.length ? `<div class="swp"><span aria-label="Flisk pod products">${sw.map(([href, label, on]) => `<a${on ? ' class="on" aria-current="true"' : ''} href="${esc(href)}"><i></i>${esc(label)}</a>`).join('')}</span></div>` : '') +
  `<nav aria-label="${esc(name)}">${nav.map(([href, label, cls = '']) => `<a${cls ? ` class="${cls}"` : ''} href="${esc(href)}"${href === current ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('')}</nav>` +
  `<a class="cta" href="${esc(cta[0])}">${esc(cta[1])} <i aria-hidden="true">→</i></a></div>`;

export const SWITCH = (on) => [['https://fleet.flisk.si', 'fleet', on === 'fleet'], ['https://fleet.flisk.si/podlytics', 'podlytics'], ['/', 'host', on === 'host']];
export const SITE_NAV = [['/#setup', 'Set up'], ['/console?section=docs', 'API'], ['https://inference.flisk.si', 'Inference'], ['https://github.com/flisk-sh/fleet/tree/main/fleetd', 'fleetd']];
export const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,800&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">';
// A full page around `body`, with the standard header. Cabinet pages pass noindex.
export const shell = ({ title, description = '', body, extraCss = '', noindex = false, cta = ['/console', 'Console'] }) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>${description ? `\n<meta name="description" content="${esc(description)}">` : ''}${noindex ? '\n<meta name="robots" content="noindex">' : ''}
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' fill='%2322c55e'/%3E%3C/svg%3E">
${FONTS}<style>${CSS}${extraCss}</style><script src="https://flisk.si/assets/bar.js" defer></script></head><body><div class="frame">
${topbar({ name: 'Host', mark: HOST_MARK, sw: SWITCH('host'), nav: SITE_NAV, cta })}${body}</div></body></html>`;

export function hostsPage() {
  const rows = HOSTS.map(
    (h) => `<article class="h" id="${esc(h.id)}"><header><h3><a href="${esc(h.url)}" rel="noopener">${esc(h.name)}</a></h3><span class="tag ${esc(h.status)}">${esc(LABEL[h.status])}</span></header>
<div class="sz">${esc(h.size)}${h.card === true ? ' · card needed' : h.card === false ? ' · no card' : ''}</div>
<p>${esc(h.why)}</p><p class="c"><b>Catch:</b> ${esc(h.catch)}</p></article>`,
  ).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>host: free places to run your own pods</title>
<meta name="description" content="Where to run a fleetd pod host for free, with the catch for each: Hugging Face Spaces, Oracle Always Free, Render, Koyeb, Fly and Cloudflare.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' fill='%2322c55e'/%3E%3C/svg%3E">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,800&family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
<style>${CSS}</style><script src="https://flisk.si/assets/bar.js" defer></script></head><body><div class="frame">
${topbar({ name: 'Host', mark: HOST_MARK, sw: SWITCH('host'), nav: SITE_NAV, cta: ['/console', 'Console'] })}<div class="pad">
<h1>Free places to run your own pods.</h1>
<p class="lede">Fleet pods normally run on a paid sandbox provider. For your own, trusted agents you can run a pod host yourself on a free machine instead. These are the places we checked, and the catch for each.</p>
<div class="fam"><div><b>inference</b><span>AI models</span></div><div><b>fleet</b><span>sandbox pods</span></div><div><b>host</b><span>free hosting for fleet pods</span></div></div>
<h2>Where</h2>
<div class="hosts">${rows}</div>
<p class="note">Checked ${esc(CHECKED)} from each vendor's public page and our own tries. Limits change: read the vendor's page before you rely on one. Pods on these hosts are not sandboxes: use them for your own agents, never for strangers' code.</p>
<h2 id="setup">Set up fleetd on any Docker host in 4 steps</h2>
<ol><li>Get a host that runs Docker and has a public https address (pick one above). Keep its address.</li>
<li>Easiest: run the ready-made image <code>ghcr.io/flisk-sh/fleetd:latest</code> (port 7860). Or put <code>fleetd.mjs</code> from <a href="https://github.com/flisk-sh/fleet/tree/main/fleetd">the fleet repo</a> and this <code>Dockerfile</code> in a folder and build it:<pre>${esc(DOCKERFILE)}</pre></li>
<li>In the host's settings add a secret <code>FLEETD_TOKEN</code>: any random string of 16 or more characters.</li>
<li>In fleet, connect the provider <b>Fleet pod</b> with <code>token@https://your-host-address</code>. Check it first: <code>curl https://your-host-address/health</code> answers <code>{"ok":true}</code>.</li></ol>
</div></div></body></html>`;
}
