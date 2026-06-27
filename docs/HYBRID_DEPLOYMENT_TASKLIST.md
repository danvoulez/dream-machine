# Dream Machine — Hybrid Deployment Tasklist (verified playbook)

> **Verified:** 2026-06-27 on dev machine (`/Users/ubl-ops/Projetos`)  
> **Companion:** [`HYBRID_DEPLOYMENT.md`](./HYBRID_DEPLOYMENT.md) (playbook — idea, scripts, bootstrap) · [`dream-machine-hybrid-topology.v0.yml`](./dream-machine-hybrid-topology.v0.yml) (contract)  
> **Scope:** Code we build here (Projetos triple) + steps to get three rings live. Not Vercel dashboard trivia for its own sake.

This is the **operator checklist with receipts**. Each row says what the docs/scripts *claim*, what we *ran*, and whether it *actually* worked.

---

## How to use this doc

1. Work **top to bottom** — later phases assume earlier ones.
2. Run the **Verify** command before checking `[x]`.
3. Status legend:
   - **✓ verified** — command ran green on 2026-06-27
   - **~ partial** — works with caveats (noted)
   - **✗ blocked** — failed or unreachable when tested
   - **○ not run** — not executed on this machine yet
4. Re-run `pnpm bootstrap:hybrid audit` after cloud phases; use `pnpm ops:status` for Canyon health.

---

## Operator facts (Dan, 2026-06-27)

| Topic | Answer |
|-------|--------|
| Vercel project `dream-machine-portal` | **Does not exist yet** — greenfield |
| Neon integration on Vercel | **Not connected** |
| `DATABASE_URL` on Vercel | **Not set** — will come from **`vercel integration add neon`** (`.env` has `USE_VERCEL_NEON_INTEGRATION=1`) |
| “Dynamic” on Vercel | **Eve dynamic** — `defineDynamic` instructions/tools, durable sessions (Workflow SDK under Eve), **not** a separate Vercel Workflows product track |
| Eve’s role | **Half the project** — Nuxt web/chat UI + Eve agent runtime (`vercel.json` `experimentalServices`: `web` + `eve`) |
| LAB | Address **last** |

---

## Architecture — Eve is half the deploy (not a bolt-on)

Vercel deploys **two services** from one repo ([`vercel.json`](../vercel.json)):

| Service | Framework | Route | Owns |
|---------|-----------|-------|------|
| **web** | Nuxt | `/` | Portal UI, auth, threads, memory, Scene cards, internal API |
| **eve** | Eve (`eve build`) | `/_eve_internal/eve` | Agent loop, tools (`scene`, …), channels, evals, **dynamic** instructions |

**Chat UI ↔ Eve:** `app/composables/chat/providers/eve/*` streams sessions; `agent/channels/eve.ts` wires Better Auth + `vercelOidc()`.

**“Dynamic Eve” (what we mean):**

| Layer | In code today | Planned (T-EVE1) |
|-------|---------------|------------------|
| Dynamic **instructions** | **✓** `agent/instructions.ts` — `defineDynamic` on `session.started` (memory + channel) | — |
| Dynamic **tools** | Static `scene` tool only | `defineDynamic` on `step.started` → one tool per `legal_next_move` |
| Durable sessions | Eve on Vercel (Workflow SDK substrate per [Eve launch blog](https://vercel.com/blog/introducing-eve)) | HITL approvals, subagents as needed |

**Env rule:** `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `INTERNAL_API_SECRET` must be on **both** web and eve. `DATABASE_URL` (Neon) is portal persistence — web-side NuxtHub; Eve reads via internal API, not the ledger.

**Not the deploy critical path yet:** passport contract’s `workflow-run.v1` / Vercel Workflow SDK for L5 adapter orchestration — Ring 3 + LogLine, later.

---

## Git map (searched locally)

### FACE — `Dream-Machine-Processual-UI`

| Ref | Commit | What it is |
|-----|--------|------------|
| `origin` | `https://github.com/danvoulez/dream-machine.git` | Production remote |
| `main` (local + remote) | `5e7a59b` | **Still Vercel template** — deps chore only |
| `codex/dream-machine-membrane-contracts` (local + remote) | `acd0921` | **All Dream Machine work** — **40 commits** ahead of `main`, ~12k LOC |
| `origin/vercel/install-vercel-web-analytics-…` | — | Template-era remote branch (ignore) |

**Before Vercel Git deploy:** merge `codex/dream-machine-membrane-contracts` → `main` and push. CI (`.github/workflows/ci.yml`) only runs on **`main`**.

### Triple (not on GitHub as one repo)

| Repo | Branch | Notes |
|------|--------|-------|
| `Dream-Machine-LogLine-Acts` | `pr2-docs` | KERNEL; clean tree |
| `Dream-Machine-Envelope-Ledger` | `pr1-close-loops` | SPINE; clean tree |
| `Projetos` (umbrella) | `pr2-docs` | Atlas + submodule pointers |

LAB gets KERNEL+SPINE via **`pnpm sync:lab`**, not via `danvoulez/dream-machine` GitHub.

---

## A. What “the code” is (source of truth)

| Source | Role | Use for deploy? |
|--------|------|-----------------|
| `Projetos/Dream-Machine-LogLine-Acts` | KERNEL | **Yes** — synced to LAB, sealed in pack |
| `Projetos/Dream-Machine-Envelope-Ledger` | SPINE | **Yes** |
| `Projetos/Dream-Machine-Processual-UI` | FACE | **Yes** — Vercel deploys this repo |
| `github.com/danvoulez/logline-acts-python` | Legacy KERNEL rename | **No** — stale; review separately |
| `github.com/danvoulez/dream-machine` | FACE remote | **Yes** — but branch/commits lag local |

**Layout assumption:** Projetos workspace has all three sibling folders. `sync-lab.sh` rsyncs all three to `LAB_HOST:LAB_SRC/`.

---

## B. Code readiness — verified snapshot (2026-06-27)

Run these before any deploy. This is “does the code we make here work,” not “is Vercel configured.”

| Check | Claim (docs / task list) | Verify command | Actual result |
|-------|--------------------------|----------------|---------------|
| Membrane contracts | 17 contracts pass | `pnpm contracts:validate` | **✓ pass** |
| Triple pack seal | `pack_runtime_before_prod` gate | `pnpm pack:runtime --skip-tar` | **✓ pass** (~50s; runs KERNEL oauth subset + SPINE 113 tests + FACE motor) |
| FACE motor tests | T-P2 “system receipt” | `pnpm test` | **~ partial** — 70 pass, **7 skip**, 0 fail |
| Ledger integration tests | scene-e2e, projection-routing, etc. | same | **✗ false green** — all 7 skips are **path bug**: bundled tests in `.tmp/tests/` resolve `LOGLINE_DB` wrong (`import.meta.url`), so `existsSync` fails even though `Dream-Machine-LogLine-Acts/.lab/lab.sqlite` exists (7 acts) |
| Python bridge `rows` | Scene reads both ledgers | `python3 scripts/runtime-projection-local.py rows <logline> <envelope> '{}'` | **✓ works** — 7 logline_acts, 2 queue rows, 36 shifts (absolute paths) |
| SPINE full suite | 107+ tests | `cd ../Dream-Machine-Envelope-Ledger && pnpm test` | **✓ 113 pass** |
| KERNEL full suite | 265 pass | `cd ../Dream-Machine-LogLine-Acts && .venv/bin/python -m pytest -q` | **✗ 1 fail** — `test_executor_re_evaluates_and_closes_incomplete_work_without_dispatch` expects `incompleto`, got `failed` (272 pass, 1 skip) |
| Derivation pipe | T-S1 / T-S2 | `node scripts/derive-from-logline.mjs` twice | **✓ idempotent** — stream `logline-derived-<fingerprint>`; re-run `derived: 0`, `verify_ok: true` |
| FACE typecheck | CI job | `pnpm typecheck` | **✗ 2 errors** — `board-json-v0.ts`, `oauth-crossing.ts` |
| Local ledgers seeded | task list snapshot | `ls …/.lab/lab.sqlite …/.board/board.sqlite` | **✓ present** |
| `install:runtime` | T-P1 toolchain check | `pnpm install:runtime` | **✓ pass** (warns Node 20 vs `>=24` in package.json) |
| Git hygiene | DoD “registered” | `git status` per repo | **✗ FACE 46 uncommitted files**; KERNEL/SPINE clean on feature branches |
| Branch alignment | deploy on `main` | see §C1 | **✗ three repos, three branches, none merged to `main`** |

**Bottom line (code):** Read-path seam (bridge → Scene → projections contract) **works when invoked with correct paths**. Automated test green is **misleading** until ledger test paths are fixed. KERNEL has **one red test**. FACE has **uncommitted deploy work** and **typecheck red**.

---

## C. Phase 0 — Fix code gates before shipping

Do these before treating any deploy as honest.

| ID | Task | Verify | Status |
|----|------|--------|--------|
| C0.1 | Fix ledger test paths — use `resolveUiRoot()` / `resolveLoglineDbPath()` (like `oauth-crossing.test.ts`), not `dirname(import.meta.url)` in bundled tests | `pnpm test` → 0 skips on ledger tests; scene-e2e runs | **○ not done** |
| C0.2 | Fix KERNEL `test_runtime.py` executor status (`incompleto` vs `failed`) | `.venv/bin/python -m pytest -q` → 0 failed | **○ not done** |
| C0.3 | Fix FACE typecheck (2 TS errors) | `pnpm typecheck` → exit 0 | **○ not done** |
| C0.4 | Commit + push FACE hybrid work (46 files) to `danvoulez/dream-machine` | `git status` clean; `gh api …/commits` shows hash | **○ not done** |
| C0.5 | Merge feature branches → `main` on all three repos (or document single integration branch) | `git branch -a` shows `main` at deploy commits | **○ not done** |
| C0.6 | Upgrade local Node to **≥24** (package.json + CI use 24) | `node -v` → v24+ | **~ dev on v20.20.2** |

---

## C1. Phase 1 — Register git remote (FACE)

| ID | Task | Command | Verify | Status |
|----|------|---------|--------|--------|
| C1.1 | Set production remote | `DREAM_MACHINE_GIT_REMOTE=https://github.com/danvoulez/dream-machine.git` in `Projetos/.env` | `git remote -v` → danvoulez/dream-machine | **✓ done** |
| C1.2 | Wire origin | `pnpm bootstrap:hybrid git-remote` | audit: Git origin remote ✓ | **✓ done** |
| C1.3 | Push deploy branch | `git push -u origin <branch>` | `gh api repos/danvoulez/dream-machine/branches` | **~ partial** — only `codex/dream-machine-membrane-contracts`; **no `main`** |
| C1.4 | Connect Vercel Git | `pnpm bootstrap:hybrid vercel` (after C2) | Vercel dashboard → Git connected | **○ blocked** — no Vercel project yet |

**Note:** GitHub repo is **FACE-only**. KERNEL/SPINE reach LAB via `pnpm sync:lab`, not via git submodule on GitHub.

---

## C2. Phase 2 — Ring 2 cloud (greenfield: Vercel + Neon + Eve dual-service)

**Dan confirmed:** no project, no Neon integration, no `DATABASE_URL` on Vercel yet. This phase **creates** the stack.

Local `.env.hybrid.generated` already has auth secrets + runtime token + passport hash. **`DATABASE_URL` will appear after `integration-neon`**, not manual paste (unless integration fails).

| ID | Task | Command | Verify | Status |
|----|------|---------|--------|--------|
| C2.0 | **Merge deploy branch to `main`** | `git checkout main && git merge codex/dream-machine-membrane-contracts && git push` | `main` = `acd0921…`; CI eligible | **○ not done** — `main` still template `5e7a59b` |
| C2.1 | Operator tokens in `Projetos/.env` | manual | audit: Vercel CLI auth ✓ | **✓ done** |
| C2.2 | Generate / refresh secrets | `pnpm bootstrap:hybrid secrets` | file exists | **✓ done** |
| C2.3 | **Create Vercel project + link** | `pnpm bootstrap:hybrid vercel` (creates `dream-machine-portal` on scope `minilab`) | `.vercel/project.json`; dashboard shows **web + eve** services | **○ greenfield** |
| C2.4 | **Neon via Vercel integration** | `USE_VERCEL_NEON_INTEGRATION=1 pnpm bootstrap:hybrid integration-neon` | `DATABASE_URL` in `.env.hybrid.generated` after `vercel env pull` | **○ after C2.3** |
| C2.5 | Portal DB migrate | `pnpm bootstrap:hybrid migrate` | `pnpm db:migrate` against Neon unpooled URL | **○ after C2.4** |
| C2.6 | Re-run vercel env push | `pnpm bootstrap:hybrid vercel` | Vercel **both services** have auth + DB + passport | **○ after C2.5** |
| C2.7 | Mint passport (if rotated) | `pnpm bootstrap:passport` | 64-char hex | **✓ done** (`91c381ec…`) |

**Eve-specific deploy checks (after first preview):**

| ID | Task | Verify |
|----|------|--------|
| C2.8 | `eve` service build succeeds | Vercel build log: `eve build` completes |
| C2.9 | Web chat reaches Eve | Browser chat streams; `/_eve_internal/eve` healthy |
| C2.10 | AI Gateway OIDC | No `AI_GATEWAY_API_KEY` on prod; model calls work via linked project |
| C2.11 | Dynamic instructions | Logged-in session gets memory block (`agent/instructions.ts` `session.started`) |

**What `vercel` phase pushes (read `bootstrap-hybrid.mjs`):**

- **Production:** `DATABASE_URL`, `DREAM_MACHINE_RUNTIME_URL=https://api.lab.minilab.work`, runtime token, auth secrets — on **web and eve**.
- **Preview:** `DREAM_MACHINE_RUNTIME_SHELL_ONLY=1` + `DREAM_MACHINE_ACCEPTANCE=1`; runtime URL omitted (stub lab).

**Preview can ship before LAB.** Production live andamento needs Ring 3 (Phase 3–4, Dan addresses last).

---

## C3. Phase 3 — Ring 3 engine room (LAB 8GB)

Code path: dev machine → rsync triple → LAB setup → build → launchd.

| ID | Task | Command | Verify | Status |
|----|------|---------|--------|--------|
| C3.1 | SSH to LAB | `ssh lab-8gb` or `ssh lab-8gb-cf` | `hostname` | **✗ unreachable here** — `lab-8gb.local` DNS fail; `lab-8gb-cf` websocket bad handshake |
| C3.2 | Write LAB runtime env on dev | `pnpm bootstrap:hybrid lab-env` | `.env.lab.generated` exists | **✓ done** (token + `/Lab/data/*.sqlite` paths) |
| C3.3 | Rsync triple to LAB | `pnpm sync:lab` | on LAB: `ls /Lab/src/Dream-Machine-*` | **○ blocked** on C3.1 |
| C3.4 | One-time LAB setup | `ssh lab-8gb 'cd /Lab/src/Dream-Machine-Processual-UI && pnpm setup:lab'` | copies env, seeds sqlite, installs launchd, runs `deploy-lab-runtime.sh` | **○ not run** |
| C3.5 | Local projection smoke on LAB | `curl -H "Authorization: Bearer $TOKEN" -d '{"mode":"rows","scope":{}}' http://127.0.0.1:3000/projection` | HTTP 200 + JSON rows | **○ not run** |

**What `setup-lab.sh` does (verified by reading script):**

1. Creates `/Lab/{src,data,env,logs,bin,backups}`
2. Copies `.env.lab.generated` → `/Lab/env/runtime.env`
3. Seeds `lab.sqlite` / `board.sqlite` from KERNEL/SPINE `.lab`/`.board` if missing
4. Runs `derive-from-logline.mjs`
5. Installs Golden Bridge hourly/daily + `work.dream-machine.runtime` launchd
6. Runs `deploy-lab-runtime.sh` (install, contracts, pack, **build**, restart runtime, smoke `/projection`)

**`deploy-lab-runtime.sh` requires `pnpm build`** — LAB must have Node ≥24 and enough RAM for Nuxt build.

---

## C4. Phase 4 — Canyon (cloud ingress)

| ID | Task | Command | Verify | Status |
|----|------|---------|--------|--------|
| C4.1 | Cloudflare auth | `cloudflared tunnel login` **or** API token in `Projetos/.env` | `ls ~/.cloudflared/cert.pem` or token set | **○ not verified** (cloudflared installed ✓) |
| C4.2 | Create tunnel + DNS | on LAB: `pnpm bootstrap:canyon` | `api.lab.minilab.work` resolves | **○ not run** |
| C4.3 | Canyon smoke from dev | `DREAM_MACHINE_RUNTIME_TOKEN=… pnpm ops:status` | `POST …/projection → HTTP 200` | **✗ HTTP 000** (tunnel not live from here) |

---

## C5. Phase 5 — Deploy cockpit

| ID | Task | Command | Verify | Status |
|----|------|---------|--------|--------|
| C5.1 | Pack seal (full) | `pnpm pack:runtime` | `.pack/dream-machine.json` | **✓ pass** |
| C5.2 | Production deploy | `pnpm bootstrap:hybrid deploy` | Vercel prod URL loads | **○ blocked** — C2.3, C2.6, C0.x |
| C5.3 | Fix prod URLs if hostname differs | update `BETTER_AUTH_URL`, `NUXT_PUBLIC_SITE_URL` on Vercel | login + callback work | **○ after first deploy** |
| C5.4 | Cockpit live Scene | open portal → chat → Scene card with andamento | not stub | **○ needs C3+C4** |

**Contract promotion gate** (`dream-machine-hybrid-topology.v0.yml`):

- `pnpm pack:runtime` passes — **✓ locally**
- unit + safety tests pass — **~** (ledger tests skipped)
- optional eval against preview — **○**

---

## D. Ongoing operations (after live)

| Schedule | Script | Verified |
|----------|--------|----------|
| Hourly | `golden-bridge/run-hourly.sh` | disk + `/projection` + cloudflared pgrep |
| Daily | `golden-bridge/run-daily.sh` | backup sqlite, fleet audit, pack, derive pipe |
| Boot | `work.dream-machine.runtime` launchd | Nuxt `.output/server/index.mjs` |
| On `main` push | GitHub CI | contracts + test + typecheck — **triggers only on `main`** (branch missing) |
| Manual | `pnpm ops:status` | **✓ runs**; Canyon 000 until tunnel live |

---

## E. Doc claims vs reality (don’t get fooled)

| Claim | Reality (verified) |
|-------|-------------------|
| “`pnpm test` green = system receipt” | **False** — 7 ledger/scene tests **skip** in bundled runner despite seeded DBs |
| “T-P2 exit met” | **Overstated** until C0.1 fixed and e2e/chat eval run with receipts |
| “T-S2 pipe re-run collides” | **Fixed in code** — fingerprinted `stream_id`; re-run is idempotent |
| “KERNEL 265 pass” | **Stale** — 272 pass, **1 fail**, 1 skip on current tree |
| “`bootstrap:hybrid all` does everything” | **False** — `all` = secrets → neon? → migrate? → vercel → lab-env only; **no** passport, sync, canyon, deploy, git-remote |
| “Vercel project already exists” | **False** — greenfield; create via `vercel` phase |
| “Eve is optional agent sidecar” | **False** — **half the product** (web UI + eve runtime); dual `experimentalServices` |
| “Dynamic = Vercel Workflows product” | **False for now** — **Eve `defineDynamic`** + durable Eve sessions; `workflow-run.v1` is later Ring 3 |
| “Minimum Dan = 5 items” | **Fair** for *ongoing* ops; **understates** code hygiene (C0) and LAB reachability |
| “logline-acts-python = dream machine” | **False** — legacy; Projetos triple is source of truth |
| “Preview needs LAB” | **False** — Preview env uses `RUNTIME_SHELL_ONLY=1` by design |
| “Production needs LAB for live andamento” | **True** — prod env sets `DREAM_MACHINE_RUNTIME_URL=api.lab.minilab.work` |

---

## F. One-session execution order (recommended)

```bash
# --- Phase 0 (code honesty) ---
# fix tests + typecheck + commit (C0.1–C0.4)

# --- Phase 1–2 (cloud) ---
cd Dream-Machine-Processual-UI
pnpm bootstrap:hybrid audit
USE_VERCEL_NEON_INTEGRATION=1 pnpm bootstrap:hybrid integration-neon
pnpm bootstrap:hybrid migrate
git checkout main && git merge codex/dream-machine-membrane-contracts && git push -u origin main
pnpm bootstrap:hybrid vercel

# --- Phase 3–4 (LAB + Canyon) — on LAN/VPN where lab-8gb resolves ---
pnpm bootstrap:hybrid lab-env
pnpm sync:lab
ssh lab-8gb 'cd /Lab/src/Dream-Machine-Processual-UI && pnpm setup:lab'
ssh lab-8gb 'cd /Lab/src/Dream-Machine-Processual-UI && pnpm bootstrap:canyon'

# --- Phase 5 (prod) ---
pnpm bootstrap:hybrid deploy
DREAM_MACHINE_RUNTIME_TOKEN=… pnpm ops:status   # expect HTTP 200 on Canyon

# --- Acceptance (after C0.1) ---
pnpm test                                        # 0 ledger skips
DREAM_MACHINE_ACCEPTANCE=1 pnpm test:e2e         # portal Scene card
# AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN:
pnpm test:e2e:chat && pnpm test:eval
```

---

## G. Quick reference — scripts map

| Script | Ring | What it actually does |
|--------|------|------------------------|
| `bootstrap-hybrid.mjs audit` | — | CLI auth, contracts, pack seal, DATABASE_URL check |
| `bootstrap-hybrid.mjs secrets` | 2 | Writes `.env.hybrid.generated` |
| `bootstrap-hybrid.mjs integration-neon` | 2 | Vercel Neon marketplace + env pull |
| `bootstrap-hybrid.mjs migrate` | 2 | `pnpm db:migrate` with unpooled URL |
| `bootstrap-hybrid.mjs vercel` | 1+2 | project add, link, git connect, env push (preview stub profile) |
| `bootstrap-hybrid.mjs lab-env` | 3 | `.env.lab.generated` for `/Lab/env/runtime.env` |
| `bootstrap-passport.mjs` | 2 | `lab.cli register` → passport hash |
| `sync-lab.sh` | 3 | rsync all three Projetos repos to LAB |
| `setup-lab.sh` | 3 | layout, seed DBs, golden bridge, first deploy |
| `bootstrap-canyon.sh` | 4 | cloudflared tunnel + DNS + launch agent |
| `deploy-lab-runtime.sh` | 3 | install, pack, build, restart runtime, smoke |
| `pack-runtime.mjs` | all | triple seal + tests (deploy gate) |
| `ops-status.sh` | — | contracts + Canyon HTTP probe |

---

## H. Exit criteria (T-HYBRID done)

From task list — checked honestly:

- [ ] Dan checklist in `HYBRID_DEPLOYMENT.md` completed end-to-end
- [ ] `pnpm contracts:validate` includes hybrid contract — **✓ today**
- [ ] `DATABASE_URL` on Vercel — **✗**
- [ ] Cockpit Scene reads LAB via `api.lab.minilab.work` — **✗** (Canyon 000)
- [ ] `pnpm pack:runtime` before prod — **✓ locally**
- [ ] Ledger tests actually run (not skip) — **✗**
- [ ] KERNEL pytest 0 fail — **✗**

When all `[ ]` are checked with verify commands, T-HYBRID can move to `[x]`.

---

*Notes file for operators. Update the “Verified” date and re-run §B table after any merge or script change.*