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
- Sendblue / iMessage phone linking lookup

**Must be identical** on both Vercel services (`web` and `eve`). If missing or mismatched, memory injection, Slack linking, and iMessage auth will fail silently or return 401.

## Sendblue (iMessage, optional)

Reach the agent over iMessage via [Sendblue](https://chat-sdk.dev/adapters/vendor-official/sendblue). Set these on the **eve** service (and `BETTER_AUTH_URL` on both services so the agent can resolve phone links):

| Variable | Required | Description |
|----------|----------|-------------|
| `SENDBLUE_API_KEY` | Yes | API key ID from the [Sendblue dashboard](https://dashboard.sendblue.com) |
| `SENDBLUE_API_SECRET` | Yes | API secret key |
| `SENDBLUE_FROM_NUMBER` | Yes | Your Sendblue line in E.164 format (e.g. `+15551234567`) |
| `SENDBLUE_WEBHOOK_SECRET` | Recommended | Shared secret verified via the `sb-signing-secret` header |
| `SENDBLUE_STATUS_CALLBACK_URL` | No | Delivery status callbacks for outbound messages |
| `SENDBLUE_ALLOWED_SERVICES` | No | Comma-separated list; defaults to `iMessage` only. Use `iMessage,SMS,RCS` to accept all |

Setup:

1. Create a Sendblue account and note your API credentials and assigned number (`sendblue show-keys`, `sendblue lines`).
2. Set the env vars above on the **eve** Vercel service.
3. Configure the Sendblue **receive webhook** to:

   `https://<your-domain>/_eve_internal/eve/eve/v1/sendblue/webhook`

4. Users add their personal phone number (E.164) in **Settings → Profile** before messaging the Sendblue number.

See [Customization](./CUSTOMIZATION.md#sendblue-imessage) for the full linking flow.

## AI provider

This template does not define AI keys in `.env.example`. The default model is set in [`agent/agent.ts`](../agent/agent.ts):

```typescript
model: "anthropic/claude-sonnet-4.6"
```

On Vercel, Eve handles provider configuration through the platform. For local development, follow [Eve docs](https://eve.dev) for your chosen provider.

**Acceptance harness (local only):** `DREAM_MACHINE_ACCEPTANCE=1` enables `/acceptance/*` routes without login. It is **ignored in production** (`NODE_ENV=production`) even if set. Never enable on Vercel.

## Projection runtime (T-R1, optional)

The portal serves `POST /projection` — the single HTTP seam for read-only ledger access. When configured, the Scene motor and `runtime_projection` use HTTP instead of shelling `python3` directly.

| Variable | Required | Description |
|----------|----------|-------------|
| `DREAM_MACHINE_RUNTIME_URL` | No | Base URL of the runtime (e.g. `http://localhost:3000`). Defaults to `BETTER_AUTH_URL` when unset. |
| `DREAM_MACHINE_RUNTIME_TOKEN` | No | Bearer token required on `/projection` when set (client and server must match). |
| `DREAM_MACHINE_RUNTIME_TIMEOUT_MS` | No | Request timeout in ms (default `8000`). |
| `DREAM_MACHINE_RUNTIME_SHELL_ONLY` | No | Set to `1` to skip HTTP and always use the local python bridge. |

Local dev: with `BETTER_AUTH_URL=http://localhost:3000` and `pnpm dev` running, Scene reads go through `/projection` automatically (shell fallback on failure). Unit tests use the shell bridge unless you export a runtime URL.

## T-P2 acceptance (optional)

For T-P2 agent/chat acceptance (requires Node ≥24), set `AI_GATEWAY_API_KEY` in `.env` (or export `VERCEL_OIDC_TOKEN` when linked to Vercel):

- `pnpm test:eval` — eve eval (`evals/scene-andamento.eval.ts`)
- `pnpm test:e2e:chat` — portal chat UI → Scene card (`e2e/portal-chat-scene.spec.ts`)

## Vercel Connect (optional)

Integrations use [Vercel Connect](https://vercel.com/docs/connect) — no extra env vars in this repo, but you must:

1. Create Connect resources (Linear MCP, Slack) in your Vercel team
2. Update the Slack slug in [`agent/channels/slack.ts`](../agent/channels/slack.ts) (default: `slack/v`)
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
