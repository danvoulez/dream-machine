# Environment Variables

> Back to [README](../README.md) | See also: [Architecture](./ARCHITECTURE.md), [Customization](./CUSTOMIZATION.md)

Copy the example file and fill in the values:

```bash
cp .env.example .env
```

## Quick start (minimum required)

| Variable | How to get it |
|----------|---------------|
| `BETTER_AUTH_SECRET` | Run `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` locally, or your production URL |
| `INTERNAL_API_SECRET` | Run `openssl rand -base64 32` (must match on web + eve services) |

These three variables are enough for local development. On Vercel, set them on **both** the `web` and `eve` services.

### `NUXT_PUBLIC_SITE_URL` (optional)

Canonical URL for SEO — used for Open Graph images, Twitter cards, and canonical links. Set to your production URL (e.g. `https://your-app.vercel.app`). Falls back to the request origin when unset.

## Authentication

### `BETTER_AUTH_SECRET` (required)

Random secret used by [Better Auth](https://www.better-auth.com/docs/installation#set-environment-variables) to sign sessions and tokens.

```bash
openssl rand -base64 32
```

### `BETTER_AUTH_URL` (required)

Public URL of the Nuxt app. Used for auth callbacks and as the base URL for agent → Nuxt internal API calls.

| Environment | Value |
|-------------|-------|
| Local | `http://localhost:3000` |
| Production | `https://your-domain.vercel.app` |

## Internal API

### `INTERNAL_API_SECRET` (required)

Shared bearer token between the Eve agent service and the Nuxt internal API (`/api/internal/*`).

Used for:

- Memory read/write from the agent
- Slack account linking

**Must be identical** on both Vercel services (`web` and `eve`). If missing or mismatched, memory injection and Slack linking will fail silently or return 401.

## AI provider

This template does not define AI keys in `.env.example`. The default model is set in [`agent/agent.ts`](../agent/agent.ts):

```typescript
model: "anthropic/claude-sonnet-4.6"
```

On Vercel, Eve handles provider configuration through the platform. For local development, follow [Eve docs](https://eve.dev) for your chosen provider.

## Vercel Connect (optional)

Integrations use [Vercel Connect](https://vercel.com/docs/connect) — no extra env vars in this repo, but you must:

1. Create Connect resources (Linear MCP, Slack) in your Vercel team
2. Update the Slack slug in [`agent/channels/slack.ts`](../agent/channels/slack.ts) (default: `slack/adam`)
3. Connect clients in **Settings → Integrations** in the app

See [Customization](./CUSTOMIZATION.md#integrations) for setup steps.

## Local-only files

These paths are gitignored and should never be committed:

| Path | Purpose |
|------|---------|
| `.env` | Local secrets |
| `.data/` | SQLite database (NuxtHub) |
| `.eve/` | Eve dev cache |
| `.vercel/` | Vercel CLI link metadata |

Reset the local database:

```bash
rm -rf .data/db && pnpm db:migrate
```

### Eve dev timeout

If `pnpm dev` fails with `Timed out waiting for Eve to print its server URL`, clear stale Eve artifacts and retry:

```bash
rm -rf .eve node_modules/.cache/eve
pnpm dev
```
