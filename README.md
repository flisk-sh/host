# host

host.flisk.si is a short list of free places to run a fleetd pod host (for fleet.flisk.si), with the catch for each.

The public catalog lives in [`src/hosts.js`](src/hosts.js). The project is a Cloudflare Worker with a D1 database.

## Run locally

Install [Bun](https://bun.sh/) first, then start the local demo environment:

```bash
bun install
bun scripts/dev.mjs
```

The local server uses a demo provider, a fake database, and automatic sign-in, so no OAuth application or provider keys are needed for a first run. Open the URL printed by Wrangler to try the cabinet locally.

## Test

Run the complete test suite from the repository root:

```bash
bun test
```

The tests cover the catalog, cabinet API, ratings, security headers, and theme metadata.

## Deploy

Deploy the Worker with Wrangler:

```bash
bunx wrangler@4 deploy
```

Production deployment requires a D1 database named `host` (apply [`schema.sql`](schema.sql)), a GitHub OAuth app with callback `https://host.flisk.si/auth/callback`, and these secrets/variables:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `SESSION_SECRET`
- `PROVIDER_KEYS_SECRET` (32+ characters)
- `PUBLIC_ORIGIN=https://host.flisk.si`

Render, Fly, and Koyeb connectors are untested (each needs a card), and the
`ghcr.io/flisk-sh/fleetd` image is not published yet.

## Cabinet (host.flisk.si/console)

Sign in with GitHub, connect your own hosting-provider keys (encrypted, never shown again), start fleetd hosts, and get a `token@address` credential for fleet's **Fleet pod** provider. No money moves through Flisk. Same shape as fleet's cabinet.

API (Bearer `host_...` key): `GET /v1/providers`, `GET|POST /v1/hosts`, `GET|DELETE /v1/hosts/:id`. The public catalog JSON moved to `/v1/hosts-catalog`.
