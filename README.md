# host

host.flisk.si: a short list of free places to run a fleetd pod host (for fleet.flisk.si), with the catch for each.
Data: src/hosts.js. `bun test`, `bun scripts/dev.mjs`. Deploy: `bunx wrangler@4 deploy`.

## Cabinet (host.flisk.si/console)

Sign in with GitHub, connect your own hosting-provider keys (encrypted, never shown again), start fleetd hosts, and get a `token@address` credential for fleet's **Fleet pod** provider. No money moves through Flisk. Same shape as fleet's cabinet.

API (Bearer `host_...` key): `GET /v1/providers`, `GET|POST /v1/hosts`, `GET|DELETE /v1/hosts/:id`. The public catalog JSON moved to `/v1/hosts-catalog`.

Deploying needs: a D1 database `host` (run `schema.sql`) bound as `DB`, a GitHub OAuth app (callback `https://host.flisk.si/auth/callback`), secrets `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SESSION_SECRET`, `PROVIDER_KEYS_SECRET` (32+ chars), and var `PUBLIC_ORIGIN`. Render/Fly/Koyeb connectors are untested (each needs a card) and the fleetd image `ghcr.io/flisk-sh/fleetd` is not published yet. Local: `bun scripts/dev.mjs` (demo provider, fake DB, auto sign-in).
