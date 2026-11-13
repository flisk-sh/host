import { HOSTS, LABEL, CHECKED } from './hosts.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const CSS = `
:root{--paper:#f7f5e4;--card:#fffef6;--ink:#171715;--dim:#6b6a5f;--green:#16a34a;--red:#b42318;--mono:'JetBrains Mono',ui-monospace,Menlo,monospace;--sans:'Inter Tight',system-ui,sans-serif;--serif:Fraunces,Georgia,serif}
@media (prefers-color-scheme:dark){:root{--paper:#121210;--card:#1a1a17;--ink:#f1efe0;--dim:#a09f92;--green:#4ade80;--red:#f97066}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.55 var(--sans)}
a{color:inherit}.m{font-family:var(--mono);text-transform:uppercase;letter-spacing:.06em;font-size:12px}
.frame{max-width:980px;margin:0 auto;padding:0 16px 64px;border-left:1px solid var(--ink);border-right:1px solid var(--ink)}
nav{display:flex;gap:20px;align-items:center;height:46px;border-bottom:1px solid var(--ink)}nav b{font-family:var(--mono)}
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
ENV PORT=7860
EXPOSE 7860
CMD ["node", "fleetd.mjs"]`;

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
<nav class="m"><b>host</b><a href="https://fleet.flisk.si">fleet</a><a href="https://inference.flisk.si">inference</a><a href="https://github.com/flisk-sh/fleet/tree/main/fleetd">fleetd</a></nav>
<h1>Free places to run your own pods.</h1>
<p class="lede">Fleet pods normally run on a paid sandbox provider. For your own, trusted agents you can run a pod host yourself on a free machine instead. These are the places we checked, and the catch for each.</p>
<div class="fam"><div><b>inference</b><span>AI models</span></div><div><b>fleet</b><span>sandbox pods</span></div><div><b>host</b><span>free hosting for fleet pods</span></div></div>
<h2>Where</h2>
<div class="hosts">${rows}</div>
<p class="note">Checked ${esc(CHECKED)} from each vendor's public page and our own tries. Limits change: read the vendor's page before you rely on one. Pods on these hosts are not sandboxes: use them for your own agents, never for strangers' code.</p>
<h2>Set up a Hugging Face Space in 4 steps</h2>
<ol><li>Make a Space at <a href="https://huggingface.co/new-space">huggingface.co/new-space</a>, SDK <code>Docker</code>, free hardware, keep it public.</li>
<li>Add <code>fleetd.mjs</code> from <a href="https://github.com/flisk-sh/fleet/tree/main/fleetd">the fleet repo</a> and this <code>Dockerfile</code>:<pre>${esc(DOCKERFILE)}</pre></li>
<li>In the Space settings add a secret <code>FLEETD_TOKEN</code>: any random string of 16 or more characters.</li>
<li>In fleet, connect the provider <b>Fleet pod</b> with <code>token@https://your-name-your-space.hf.space</code>. Check it first: <code>curl https://your-name-your-space.hf.space/health</code> answers <code>{"ok":true}</code>.</li></ol>
</div></body></html>`;
}
