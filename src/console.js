// The cabinet at /console: connect hosting providers with your own keys, start pod hosts, make host keys. Same layout idea as fleet's cabinet.
import { esc, shell } from './page.js';
import { HOSTS, LABEL } from './hosts.js';
import { PROVIDERS } from './providers/index.js';

const SECTIONS = [
  ['overview', 'Overview'],
  ['hosts', 'Hosts'],
  ['providers', 'Providers'],
  ['keys', 'API keys'],
  ['docs', 'Docs'],
];

const CSS = `
.cab{display:grid;grid-template-columns:200px minmax(0,1fr);min-height:70vh}
.cab aside{border-right:1px solid var(--ink);padding:18px 0;display:flex;flex-direction:column}
.cab aside a{display:block;padding:10px 20px;text-decoration:none;font:500 12px/1 var(--mono);text-transform:uppercase;letter-spacing:.06em}
.cab aside a:hover{background:var(--card)}.cab aside a.on{background:var(--ink);color:var(--paper)}
.cab aside form{margin-top:auto;padding:16px 20px 0}.who{font:12px var(--mono);color:var(--dim);margin-bottom:8px;display:block}
.cab main{padding:24px 28px 56px;min-width:0}.cab h1{margin:0 0 6px;font:800 34px/1.05 var(--serif)}.cab h2{font-size:20px;margin:30px 0 10px}
.note{color:var(--dim);font-size:13px}.msg{padding:10px 14px;border:1px solid var(--green);margin:14px 0;background:var(--card)}.msg.err{border-color:var(--red);color:var(--red)}
.btn{font:600 12px/1 var(--mono);text-transform:uppercase;letter-spacing:.05em;padding:11px 16px;border:1px solid var(--ink);background:var(--ink);color:var(--paper);cursor:pointer}
.btn.g{background:var(--green);border-color:var(--green);color:#04130a}.btn.o{background:transparent;color:var(--ink)}
input[type=text],input[type=password],select{font:14px var(--mono);padding:10px 12px;border:1px solid var(--ink);background:var(--card);color:var(--ink);min-width:0;max-width:100%}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--ink);vertical-align:top}th{font:500 11px var(--mono);text-transform:uppercase;color:var(--dim)}
td code,.cred{font:13px var(--mono);word-break:break-all}.cred{display:block;background:#0a0a0e;color:#e8e8e0;padding:10px 12px;margin:6px 0}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:0;border:1px solid var(--ink)}.pc{padding:14px;border:0;border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);background:var(--card)}
.pc h3{margin:0 0 6px;font-size:17px}.pc .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.pc form{margin:0}
.stats{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--ink);margin:16px 0}.stats div{padding:14px;border-right:1px solid var(--ink)}.stats div:last-child{border:0}.stats b{display:block;font:800 30px var(--serif)}
@media (max-width:760px){.cab{grid-template-columns:1fr}.cab aside{flex-direction:row;flex-wrap:wrap;border-right:0;border-bottom:1px solid var(--ink);padding:0}.cab aside a{padding:12px 14px}.cab aside form{display:none}.cab main{padding:18px 16px 40px}.stats{grid-template-columns:1fr}.stats div{border-right:0;border-bottom:1px solid var(--ink)}}
`;

const when = (iso) => (iso ? new Date(iso).toISOString().slice(0, 16).replace('T', ' ') : '');

function hostsSection({ hosts, connections, notice, error, fresh }) {
  const usable = Object.entries(PROVIDERS).filter(([id, p]) => p.demo || connections[id]);
  const live = hosts.filter((h) => !h.removed);
  const form = `<form method="post" action="/console/hosts" class="row" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><select name="provider" aria-label="Provider">${usable
    .map(([id, p]) => `<option value="${id}">${esc(p.label)}${p.untested ? ' (untested)' : ''}</option>`)
    .join('')}</select><button class="btn g" type="submit">Start a pod host</button></form>`;
  const rows = live
    .map(
      (h) => `<tr><td><code>${esc(h.id)}</code></td><td>${esc(h.provider)}</td><td><code>${esc(h.url)}</code></td><td>${esc(when(h.created))}</td><td><form method="post" action="/console/hosts/${encodeURIComponent(h.id)}/stop"><button class="btn o" type="submit">Stop</button></form></td></tr>`,
    )
    .join('');
  return `<h1>Hosts</h1><p class="note">A host is a small server (<code>fleetd</code>) that runs your agents' pods. Start one on a hosting provider you connected, then paste its address into fleet.</p>
${notice ? `<div class="msg">${esc(notice)}</div>` : ''}${error ? `<div class="msg err">${esc(error)}</div>` : ''}
${fresh ? `<div class="msg"><b>Host started.</b> In fleet, connect the provider <b>Fleet pod</b> with:<code class="cred">${esc(fresh.credential)}</code><span class="note">${fresh.provider === 'demo' ? 'This is a pretend host: the address does not exist.' : 'Keep it private: the part before @ is the host&#39;s password.'}</span></div>` : ''}
${form}
<h2>Your hosts</h2>${live.length ? `<table><thead><tr><th>Id</th><th>Provider</th><th>Address</th><th>Started</th><th></th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="note">None yet. Start the Demo host to see the flow with no account.</p>'}`;
}

function providersSection({ connections, notice, error, canConnect }) {
  const cards = HOSTS.map((h) => {
    const a = PROVIDERS[h.id];
    const conn = connections[h.id];
    const connect = !a
      ? '<p class="note">No connector yet. <a href="https://github.com/flisk-sh/host/issues">Ask for one</a>.</p>'
      : conn
        ? `<div class="row"><span class="note">Connected · key ending ${esc(conn.hint)}</span><form method="post" action="/console/providers/${h.id}/disconnect"><button class="btn o" type="submit">Disconnect</button></form></div>`
        : canConnect
          ? `<form method="post" action="/console/providers/${h.id}/connect" class="row"><input type="password" name="key" placeholder="Your ${esc(h.name)} API key" autocomplete="off" required><button class="btn g" type="submit">Connect</button></form>`
          : '<p class="note">Connecting is not set up on this copy.</p>';
    return `<div class="pc" id="${h.id}"><h3>${esc(h.name)} <span class="tag ${esc(h.status)}">${esc(LABEL[h.status])}</span></h3><p class="note">${esc(h.catch)}</p>${a?.untested ? '<p class="note"><b>Not run on a real account yet.</b> Built from the provider&#39;s public docs.</p>' : ''}${connect}</div>`;
  }).join('');
  return `<h1>Providers</h1><p class="note">Connect your own account at each hosting provider with an API key. Host keeps it encrypted and never sends it anywhere except that provider. One host key then starts hosts on any of them.</p>${notice ? `<div class="msg">${esc(notice)}</div>` : ''}${error ? `<div class="msg err">${esc(error)}</div>` : ''}<div class="cards">${cards}</div>`;
}

function keysSection({ keys, newKey, error }) {
  return `<h1>API keys</h1><p class="note">A host key lets your agent or script start and stop hosts through the API. Up to 10.</p>${error ? `<div class="msg err">${esc(error)}</div>` : ''}
${newKey ? `<div class="msg"><b>Copy it now, it is shown once.</b><code class="cred">${esc(newKey)}</code></div>` : ''}
<form method="post" action="/console/keys" style="display:flex;gap:10px;flex-wrap:wrap"><input type="text" name="name" placeholder="Name, e.g. laptop" maxlength="40"><button class="btn g" type="submit">Create key</button></form>
<h2>Your keys</h2>${keys.length ? `<table><thead><tr><th>Name</th><th>Key</th><th>Created</th><th></th></tr></thead><tbody>${keys.map((k) => `<tr><td>${esc(k.name)}</td><td><code>${esc(k.hint)}</code></td><td>${esc(when(k.created))}</td><td><form method="post" action="/console/keys/${esc(k.id)}/revoke"><button class="btn o" type="submit">Revoke</button></form></td></tr>`).join('')}</tbody></table>` : '<p class="note">No keys yet.</p>'}`;
}

function docsSection(origin) {
  return `<h1>Docs</h1><p class="note">Every call needs <code>Authorization: Bearer host_...</code>.</p>
<h2>Start a host</h2><pre>curl -X POST ${esc(origin)}/v1/hosts -H "Authorization: Bearer host_..." -H "content-type: application/json" -d '{"provider":"demo"}'</pre><p class="note">Answers 201 with <code>id</code>, <code>url</code>, <code>token</code> and <code>credential</code> (<code>token@url</code>): paste that into fleet's Fleet pod provider.</p>
<h2>List, read, stop</h2><pre>GET    ${esc(origin)}/v1/hosts
GET    ${esc(origin)}/v1/hosts/:id
DELETE ${esc(origin)}/v1/hosts/:id
GET    ${esc(origin)}/v1/providers</pre>
<p class="note">Providers are the ones you connected on the Providers page, plus <code>demo</code>. Host stops a host at its provider on DELETE.</p>`;
}

function overviewSection({ hosts, keys, connections }) {
  const live = hosts.filter((h) => !h.removed).length;
  return `<h1>Overview</h1><div class="stats"><div><b>${live}</b>hosts running</div><div><b>${Object.keys(connections).length}</b>providers connected</div><div><b>${keys.length}</b>API keys</div></div>
<h2>How it works</h2><ol><li>Connect a hosting provider on <a href="/console?section=providers">Providers</a> with your own key. Every free host we found needs a card or has a catch, so read each card first.</li><li>Start a host on <a href="/console?section=hosts">Hosts</a>, or with one API call.</li><li>Paste the <code>token@address</code> into fleet's <b>Fleet pod</b> provider. Fleet then starts pods there, for free, for trusted code.</li></ol>
<p class="note">No money moves through Flisk: you pay each provider directly on your own account.</p>`;
}

export function cabinetPage({ origin, login, section = 'overview', hosts = [], keys = [], connections = {}, canConnect = false, notice, error, newKey, fresh }) {
  const sec = SECTIONS.some(([id]) => id === section) ? section : 'overview';
  const body = { overview: overviewSection, hosts: hostsSection, providers: providersSection, keys: keysSection, docs: () => docsSection(origin) }[sec]({ hosts, keys, connections, canConnect, notice, error, newKey, fresh });
  const nav = SECTIONS.map(([id, label]) => `<a href="/console?section=${id}"${id === sec ? ' class="on" aria-current="page"' : ''}>${label}</a>`).join('');
  return shell({
    title: `${SECTIONS.find(([id]) => id === sec)[1]} · host`,
    noindex: true,
    extraCss: CSS,
    cta: ['/console?section=hosts', 'New host'],
    body: `<div class="cab"><aside>${nav}<form method="post" action="/auth/signout"><span class="who">@${esc(login)}</span><button class="btn o" type="submit">Sign out</button></form></aside><main>${body}</main></div>`,
  });
}

export const messagePage = (title, text) => shell({ title, noindex: true, body: `<div class="pad"><h1 style="font:800 34px var(--serif);margin:40px 0 10px">${esc(title)}</h1><p>${esc(text)}</p><p><a href="/">Back to host</a></p></div>` });
