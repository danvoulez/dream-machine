# Dream Machine — Task List

Normalized 2026-06-27. Single source of truth for what is done, in flight, and open
across the three organelles. Replaces the prior multi-section version, whose pending
items were duplicated across four places and whose status claims had drifted from the
running code. Every status here was re-verified against the repos on 2026-06-27.

**How to read:** `[x]` done · `[~]` partial / in flight · `[ ]` todo · `[!]` needs a
decision before work · each task names its repo and an exit criterion.

Repos / jurisdictions:
- **KERNEL** = `Dream-Machine-LogLine-Acts` (Python) — owns consequence (the `logline_acts` ledger, process law, grants, closure).
- **SPINE** = `Dream-Machine-Envelope-Ledger` (TypeScript) — owns cognition/observability (events, shifts, proposals, findings, projections). Additive: "add, never subtract."
- **FACE** = `Dream-Machine-Processual-UI` (Nuxt + Eve, agent = Sonnet 4.6) — owns crossing + rendering + human intervention. Not authority.

---

## 0. Definition of Done — the ruler (ratified by Dan, 2026-06-27)

Two levels. Nothing is `[x]` unless both hold.

**Per-task gate — a task is `[x]` only when all seven hold:**
1. **Intent inteiro** — solves the unshrunk goal, not a shrunk proxy.
2. **Load-bearing, não plástico** — real behavior; no decorative param (the `projection_spec` lesson), no stub presented as implementation.
3. **Probe + committed test** — it ran, AND an automated test exercising the real behavior is committed alongside (not an exists-test).
4. **World-fit** — respects §A invariants: append-only, additive, projections non-authoritative, vocabulary ban.
5. **Registered** — committed to the repo. Working-tree-only is not done (the ledger's own law: only the registered creates consequence).
6. **Ghosts named** — whatever is missing is written here, not hidden.
7. **Desk clean** — the next actor (human or model) continues without archaeology.

If not all seven: status is `[~]` with an honest sub-status (implemented-but-unverified / uncommitted / stubbed / blocked).

**System packaged shape — the whole is "done" only in this clean form:**
- **LogLine** = 1 Python body + 1 test body + 1 conformance type. *(closest today)*
- **Envelope** = 1 TS body + 1 test body + 1 conformance type. *(conformance missing → T-S7)*
- **One plugin** = a single packaged seam (Python + TS behind one interface) that gives the Eve agent the power to understand the processes AND report their **andamento**. *(today: spread across a tool + a shell bridge + 2 sqlite-by-path → T-P1)*
- **UI as acceptance, not luxury** = the receipt of the whole: open the UI → ask the agent about the processes and their andamentos → correct, end-to-end answer against the real ledgers. *(T-P2 harness green: portal chat Scene card + eve eval + motor e2e; needs `AI_GATEWAY_API_KEY` + seeded ledgers + Node ≥24)*

The system-level receipt **is** that UI e2e. Until it runs and verifies, the system is `[~]` no matter how many per-task `[x]` exist.

---

## A. Invariants (load-bearing doctrine — do not relitigate casually)

**Constitutional cut.** One institution, three jurisdictions + a customs office:
LogLine owns consequence · Envelope owns cognition · Membrane owns crossing · Processual UI owns interaction.

**Membrane law.** No domain may define another domain's primitive. A domain may reference
another's primitive only through declared membrane fields.

**Two crown technologies (both stay, neither replaces the other):**
- LogLine content-addressed receipts → authority, offline verification, consequence. *Hashes win authority.*
- Envelope dynamic projections → cognition, observability, navigation, live context. *Projections win perception.*

**Cross-cutting rules.** Projections are eyes, not truth (a projection inconsistent with the
ledger is rebuilt, never argued with). BoardActs/EnvelopeActs are envelope-canon until translated
into a LogLine receipt. Buttons only exist when backed by a declared affordance. Irreversible/dangerous
actions route through LogLine authority + approval. The UI may request/render/ask/approve/explain;
it may not register receipts, dispatch, close, or remember as authority.

**Risk + attention split.** Envelope perceives/narrates L5 but may not authorize it — LogLine owns
L5 authorization (Envelope native tiers are L0–L4). Attention is three things: Envelope salience
(non-authoritative), LogLine process-triggered obligation (authoritative when registered), UI
rendered interruption (non-authoritative, requires affordance). The LLM-query attention governor
(below) is a fourth, still-unbuilt sense.

**Vocabulary ban (membrane schemas must reject these unqualified):** `candidate`, `admission`,
`admitted`, `act`. Renames: Candidate→Proposal, Admission→Confirmation/Sealing/BoardCommit,
admitted→board_committed, Act→BoardAct/EnvelopeAct. Docs are sanitized; **code is not yet** (see T-E4).

---

## B. Verified reality snapshot (2026-06-27)

- **KERNEL tests:** `pytest` = **265 passed, 1 skipped** (0 failures). (Prior list said 242/94 — stale.)
- **SPINE tests:** `vitest` = **107 passed**, 18 files, incl. fuzz tamper-detection over Projection `source_json`. (Prior list said 103 — stale.)
- **Ledgers now have data (local sqlite only — Supabase santoandre deliberately untouched):**
  KERNEL `.lab/lab.sqlite` seeded with 4 acts via the legit `lab act` writer; SPINE `.board/board.sqlite`
  created + seeded via the `Board` API.
- **The agent read-path works end-to-end:** FACE `agent/tools/scene.ts` (primary) → `agent/lib/scene/*` → `scripts/runtime-projection-local.py` → reads both sqlite ledgers. `runtime_projection` is deprecated unless `DREAM_MACHINE_ENABLE_LEGACY_PROJECTION=1`. Proven: Scene returns bounded ProcessViews with andamento from seeded data.
- **The LogLine→Envelope derivation pipe now EXISTS** (was the central missing seam): `Dream-Machine-Envelope-Ledger/scripts/derive-from-logline.mjs` reads `logline_acts` read-only, ingests each as an Envelope Event (payload embeds the LogLine `content_hash`), condenses → CandidateVersion → admits → BoardAct (slots.object = the content_hash) → projects. `verify_ok: true`; the 4 LogLine hashes appear verbatim in the derived chain. Observability now emerges from the kernel.
- **Corrected overclaim:** "Envelope Dynamic Projections already exist" is only half true. The *metadata
  scaffolding* (ladder L0–L5, pin, parent hashes, loss-accounting, diff) is real and tested in all three
  projection impls. The *actual dynamic composition* is **partially implemented in FACE** on branch
  `codex/dream-machine-membrane-contracts`: goal-driven salience, rank/bound, loss, legal moves, Scene card.
  KERNEL `lab/projections.py` `_ledger_snapshot` still ignores `projection_spec`; SPINE `buildProjection`
  still takes `narrative` as input. See T-DP1/T-DP2 — one owner, not three half-motors.

**Full scan (2026-06-27) — the size of the monster:**
- **KERNEL** `lab/`: ~4.2k LOC, 24 modules, 31 test files (265 tests). Conformance corpus ✓ (`tests/jcs_conformance`, `fixtures/.../conformance/vectors`, `santo-andre-vectors`). `runtime/` service daemons are **README-only stubs** (executor/clock/adapters) except `receiver/realtime_listener.mjs` — the real logic lives in `lab/`. `fleet/` = machine+service yml (lab-256/8gb/512). `migrations/` = 3 Postgres SQL. `schemas/receipt.v0.schema.json`. `signing/webauthn_verifier.py`.
- **SPINE** `src/`: ~4.2k LOC, 39 modules, 18 test files (107 tests). Conformance ✗ — scattered, no single corpus (→ T-S7).
- **FACE**: ~10.4k+ LOC ts/vue. Eve template + `scene` tool (Dynamic Projection Motor) + deprecated `runtime_projection` + shell bridge. 40 `.yml` membrane contracts (15 enforced by `pnpm contracts:validate`). `pnpm test` = 30 tests (29 pass, 1 skip if ledgers absent).
- **Docs:** 113 `.md` → target ~12 (T-H5). **Packaging: none** — no umbrella package / Makefile / Docker / install across the three repos; the installable topology exists only as a contract (→ T-T1).

**Session close — 2026-06-27 (T-R1 projection HTTP + T-P1 bridge consolidation on FACE `codex/dream-machine-membrane-contracts`, not merged):**
- **T-R1:** `POST /projection` + `projection-bridge.ts` + `fetchProjectionRuntime()`; optional bearer; documented in `docs/ENVIRONMENT.md`.
- **T-P1 partial:** Scene `createSceneReaders()` + legacy `runtime_projection` deduped through one bridge; shell is fallback not default when URL set.
- **Queue seed:** `pnpm seed:lab-queue` + scene-e2e queue/claimed assertions.
- **Typecheck green;** `scene.back` explicitly unimplemented.

**Prior session — 2026-06-27 (Scene motor + T-P2 harness on FACE `codex/dream-machine-membrane-contracts`, not merged):**
- **Scene motor (PR-6/7 partial):** `agent/lib/scene/*`, `agent/tools/scene.ts`, `Scene.vue`, `shared/tools/scene.ts`, python bridge `rows` mode + scope filter + `risk_by_process`. Fixed intents retired (deprecated). 30 unit/integration tests committed.
- **T-P2 harness:** `tests/scene-e2e.test.ts` (motor) + `e2e/portal-scene-acceptance.spec.ts` (Scene card) + `e2e/portal-chat-scene.spec.ts` (Eve chat → Scene card; `pnpm test:e2e:chat`) + `evals/scene-andamento.eval.ts` (`pnpm test:eval`). All need seeded ledgers; agent/chat paths need `AI_GATEWAY_API_KEY` + Node ≥24.
- **Not merged/pushed:** motor branch; merge/push is Dan's call.

**Prior session — 2026-06-27 (PR-1 + PR-2 committed to branches, not merged):**
- **PR-1** (`pr1-close-loops` on KERNEL/SPINE; feature branch on FACE): SPINE `577b725` derivation pipe + `tests/derive-pipe.test.ts` + `.gitignore` + JCS fix → **T-S1 ✓, T-H2 ✓**; KERNEL `2e61123` test_inference aligned to the inspect projection → **T-K6 ✓**; FACE `56d2c4c` this tasklist normalized. SPINE suite 107→**109**.
- **PR-2** (`pr2-docs` on KERNEL/umbrella): KERNEL `cc192c4` prose docs **78→39**, non-canon archived to `~/dream-machine-attic/kernel-docs` (incl. the 4 LAB specs) → **T-H5 substantially ✓, T-H1 ✓** (devin ghosts archived with the LAB specs); umbrella `de73587` Atlas counts fixed → **T-H3 ✓**. Board canon reconciled, coherent → **T-H6 ✓** (only the L5 delta remains, tracked as T-S3).
- **Not merged/pushed:** all of the above lives on the branches above; merge/push is Dan's call.

---

## C. Tasks

### KERNEL — LogLine-Acts

- [x] Folder cut + repo init; receipt hardening (golden vectors, Python↔JS parity, LIP-0007 profile, closed-`hashes` bug fix) — committed on `main` (`c4e2d59`).
- [x] OAuth 2.1 client dry-run adapter (`lab/oauth.py`, acts-side) — committed on `main` (`5b32f8a`).
- [~] **T-K1 Citation + read-only inspection surface.** `lab/citation.py`, `lab/inspect.py` exist with tests. *Exit:* commit/merge state decided, inspection exposed through the portal path, citation profile folded into membrane contracts.
- [ ] **T-K2 Encode automation A0–A5 in process contracts**, not just doctrine. *Exit:* runnable process contracts carry an automation tier field the evaluator reads.
- [ ] **T-K3 LogLine attention-obligation shape** (`logline-attention-obligation.v0.yml`): process-triggered obligation, authority requirement, closure path.
- [ ] **T-K4 LogLine↔Envelope reference fields** (`logline-envelope-reference-fields.v0.yml`): declare `event_hash`, `source_digest`, `shift_hash`, `proposal_version_hash`, `projection_hash`, `finding_id` as the only legal cross-refs.
- [ ] **T-K5 Canyon canonical target decision** (`logline-canyon-decision.v0.yml`): CAS + LogLine registration vs a standalone `inbox` table.
- [x] **T-K6 Uncommitted tree decision.** *(test_inference committed `2e61123`; other dirty files still Dan's call to commit/revert.)* `tests/test_inference.py` is modified and uncommitted; older note also lists `docs/DANGER_TIERS.md`, `lab/cli.py`, `processes/*CATALOG/RUNNABLE*.md`, `tests/test_grants_danger_tiers.py` dirty. *Decide* commit or revert per file — do not leave dangling.
- [ ] **T-K7 Fix broken venv wrapper.** `.venv/bin/pytest` shebang still points at the pre-rename `/Users/ubl-ops/dream-machine-main/.venv/...`; use `python -m pytest` or rebuild the venv.

### SPINE — Envelope-Ledger

- [x] Additive-spine foundation merged on `main`: canonical `Envelope` (intact content + shifts + custody + transport), dual hash (`thin_envelope_hash` vs `envelope_hash`), additive-law validation, append-only constructors.
- [x] Projection metadata in identity: `pin`, `parent_projection_hashes`, `ladder_level`, `ttl_ms`, `stale`, `rebuild_reason`, `loss_accounting` (persisted via `identity_body_json`, no table migration). Verifier catches invalid ladder/missing parents/stale-without-reason/incomplete loss.
- [x] Projection diff / `changes_since` — `diffProjections(...)` + `Board.diffProjections(...)`.
- [x] **T-S1 LogLine→Envelope derivation pipe** — `scripts/derive-from-logline.mjs` + `tests/derive-pipe.test.ts` (act count → derived count, content_hash carried, verify ok, empty-ledger case), committed `577b725` on `pr1-close-loops`. See T-S2 for the re-run limit.
- [~] **T-S2 Pipe re-run safety.** Stream id is `logline-derived-<count>`; re-running with the same act count collides (append-only). *Exit:* unique/idempotent stream stamping OR an explicit "rebuild wipes `.board`" command, logged — no silent collision.
- [ ] **T-S3 Map/add L5** at the Envelope boundary (perceive-only; never authorize). Currently stops at L4.
- [ ] **T-S4 Evaporated-source loss policy** (formal): when events evaporate, projections still cite a durable `source_digest` and reveal what detail is gone. Basic field exists; policy doesn't.
- [ ] **T-S5 Richer freshness policy** + source watermark beyond the basic `generated_at/as_of_seq/ttl_ms/stale`.
- [ ] **T-S6 Portal-contract normalization fixtures + live-adapter tests** for SPINE projections → `dream-machine-projections.v0`.
- [ ] **T-S7 Envelope conformance type** (the missing third leg of the SPINE body). Today conformance is only scattered across `canon.test.ts`/`canonical.test.ts`/`board-fuzz.test.ts` — there is no single corpus like LogLine's. *Exit:* one `board-json-v0` conformance corpus (canonical bytes → hash vectors, tamper vectors) runnable as one suite, symmetric to LogLine's; resolving T-H2 (the JCS contradiction) is part of defining it.

### FACE — Membrane + Processual UI

- [x] Membrane contract set written + validated: `pnpm contracts:validate` = 15 contracts pass (ownership, vocabulary, reference-map, jurisdictions, crossing-map, conflict-map, projections + JSON schema, actions, core-technologies, installable-topology, portal-chief, …).
- [x] `runtime_projection` Eve tool + `RuntimeProjection.vue` card exist; jurisdiction routing (`preferredJurisdiction`), stub/live/local-adapter seam, LogLine + Envelope + diff mappers, `mergeMixedProjection`. *(deprecated — superseded by `scene`.)*
- [x] **`scene` Eve tool + `Scene.vue` card** — Dynamic Projection Motor: goal-driven ProcessViews, loss accounting, legal moves, proposals (airlock-only). Committed on `codex/dream-machine-membrane-contracts`.
- [x] Local bridge `scripts/runtime-projection-local.py` reads both sqlite ledgers (proven against seeded data); `rows` mode feeds Scene readers.
- [x] **T-F1 Symmetric normalization.** `agent/lib/projection-portal.ts` owns envelope-native → `RawProjection` mapping; Scene (`normalizeSceneProjection`) and legacy (`normalizeBridgeProjection`) both land on `dream-machine-projections.v0` with `authoritative: false` and portal `cannot_do`. *Exit met:* `tests/projection-symmetric.test.ts` (2026-06-27).
- [x] **T-F2 Live-source adapter coverage + tests** — routing tests for logline (`logline_receipt_detail`), envelope (`open_findings`), mixed (`overview`) via `normalizeBridgeProjection` + shell bridge. *Exit met:* `tests/projection-routing.test.ts` (2026-06-27).
- [~] **T-F3 Projection UI cards**: `Scene.vue` covers ProcessView list, warnings, loss line, legal moves, proposals (airlock), and normalized `output.projection` blocks + `cannot_do` footer. Ghost: source-ref, finding, attention, proposal-detail, receipt-detail, next-steps cards; full affordance button set from declared affordances.
- [x] **T-F4 Safety integration tests**: legal moves `effect_class: "none"`, proposals not in affordances, `cannot_do` includes `register_receipt`, unimplemented ops surface op in `cannot_do`, source→card path. *Exit met:* `tests/projection-safety.test.ts` (2026-06-27).
- [ ] **T-F5 Auth identity bridge**: app user ↔ Supabase user ↔ LAB ID ↔ grants ↔ Vercel Connect/MCP boundary.

### The one plugin — live data path (cross-cutting seam)

- [~] **T-P1 Consolidate the seam into ONE packaged plugin** (the "1 plugin do conjunto"). `agent/lib/projection-bridge.ts` + `POST /projection` + `fetchProjectionRuntime()` unify Scene rows + legacy intents; python bridge is shell fallback behind the HTTP seam. Ghost: no umbrella install step / runtime daemon package yet (→ T-T1). Absorbs T-R1 (interface) + T-F1 symmetric normalization.
- [x] **T-P2 UI acceptance e2e — the system receipt.** Motor (`pnpm test`) + portal Scene card + portal chat Scene card (`AI_GATEWAY_API_KEY=… pnpm test:e2e:chat` → `/acceptance/chat` → Scene card with andamento) + agent eval (`pnpm test:eval`). Acceptance harness uses `DREAM_MACHINE_ACCEPTANCE=1`; production chat path still requires login. *Exit met:* e2e runs green against real seeded ledgers through the scene plugin (2026-06-27).
- [x] **T-R1 Build the `/projection` HTTP runtime endpoint** (`DREAM_MACHINE_RUNTIME_URL`) — `server/routes/projection.post.ts` serves rows + legacy intents; `fetchProjectionRuntime()` is HTTP-first (defaults to `BETTER_AUTH_URL`), shell fallback. Scene + deprecated `runtime_projection` share the bridge. *Exit met:* 2026-06-27 on `codex/dream-machine-membrane-contracts`.
- [ ] **T-R2 OAuth client registration crossing** (§ first external-effect additive client). Acts-side dry-run committed; the real Supabase POST must become a TS edge crosser recording an Envelope `Shift`(kind `effect`)/`ShiftResult` — `input_hash`=act `content_hash`, transport+custody, act intact, `client_secret` never enters a receipt/projection. *Exit:* test proves additive (content_hash unchanged) + dry-run/real share one builder; **and** resolve the governance question (oauth-client.v1 is L3, below the L4/L5 grant gate — keep L3 or raise to L4).

### The real motor — Dynamic Projection (the gap behind "agent knows the processes")

- [~] **T-DP1 Composer.** FACE `compose.ts` + `assembleScene` build ProcessViews from real ledger rows; goal drives salience profile. Ghost: KERNEL `lab/projections.py` still ignores `projection_spec`; no single owner (recommend KERNEL Python). Unbuilt ops: `group`, `filter`, `compare`, `ascend`, `descend`. *Exit:* one owner turns spec/question into the view; SPINE/FACE become thin adapters — **not three half-motors**.
- [~] **T-DP2 Attention governor over the query space** — FACE `governor.ts`: deterministic goal→salience, rank/bound, loss accounting, legal moves, proposals. Ghost: not full Scene-bound dynamic-tool reshaping (`defineDynamic`); LLM ranker extension point unused. Distinct from human attention objects in §A.

### Doc & repo hygiene

- [x] Drift apparatus deleted + root junk cleared: `DOC_TREE_AND_DRIFT.md` + generator `build_doc_tree.py` deleted (were untracked); `.playwright-mcp` + login png deleted; 47MB history tar + 48h md + spine demo moved to `~/dream-machine-attic`; `.board/` + `*.sqlite` gitignored in SPINE (committed `577b725`).
- [x] **T-H1 Ghost `devin_session`** *(resolved by archiving the LAB specs in PR-2 `cc192c4`)*: stale references in 3 KERNEL canon docs (`LAB OPERATING ATLAS.md`, `LAB FINAL IMPLEMENTATION SPEC v0.md`, `LAB LLM-FACING CANON SPEC v0.md`) — contract doesn't exist on disk. *Edit, not delete:* replace with `route_to_devin` or mark deprecated.
- [x] **T-H2 JCS contradiction** *(fixed to `board-json-v0` in PR-1 `577b725`)* in `Dream-Machine-Envelope-Ledger/docs/superpowers/specs/2026-06-26-envelope-additive-spine-design.md`: invariant says "JCS+sha256", erratum says "NOT JCS" (code confirms the erratum). *Exit:* delete the wrong line.
- [x] **T-H3 `DREAM_MACHINE_ATLAS.md`**: kept as the one general doc; stale counts fixed (265/1-skip, 109) in PR-2 `de73587`.
- [ ] **T-H4 Vocabulary still in canon docs vs code**: keep docs sanitized; do not reintroduce banned unqualified terms.
- [~] **T-H5 Rationalize the prose docs — 113 `.md` is LLM padding** *(KERNEL done in PR-2 `cc192c4`: 78→39, non-canon to attic. Remaining: confirm the ~3 specific + the LogLine-canon=ADRs call; trim FACE/SPINE template boilerplate if wanted.)* (78 in KERNEL alone; 13 READMEs; CONTRIBUTING/CODE_OF_CONDUCT/AGENTS/ARCHITECTURE/ENVIRONMENT duplicated across repos; `reports/` snapshots; generated mirrors; **2 copies of this very task list**). Collapse to one clean set, one doc per concept:
  - **1 general:** `DREAM_MACHINE_ATLAS.md` (per T-H3).
  - **~3 specific:** this task list + `dream-machine-portal-chief.v0.md` + installable topology *(confirm the exact 3)*.
  - **LogLine canon = 3:** the ADRs `docs/decisions/0001..0003` *(confirm these are the 3, vs the LAB SPEC set)*.
  - **Envelope canon = 5:** 1 tabuleiro `BOARD SPEC_v0.2.md` + 4 board (`BOARD_DECISIONS`, `BOARD_VERTICAL_SLICE`, `BOARD_LIFECYCLE`, `BOARD_OBJECTS`).
  - **Keep** the machine-readable `.yml` membrane contracts (validated by `pnpm contracts:validate`) — those are not prose padding.
  *Exit:* everything outside that set deleted or moved to attic; no duplicate prose; the doc count is the set above, not 113.
- [x] **T-H6 Reconcile the 5 Envelope canon docs against code.** *(Checked 2026-06-27: arming delays match code L0–L4; only delta is L5 (code 120s, BOARD SPEC stops at L4) — tracked as T-S3, not drift. Docs coherent.)* Board/tabuleiro docs are NORMATIVE (BOARD wins). If `BOARD SPEC_v0.2` / `BOARD_DECISIONS` / `BOARD_VERTICAL_SLICE` / `BOARD_LIFECYCLE` / `BOARD_OBJECTS` disagree with `src/` (arming delays, lifecycle states, object fields, the hash/JCS discipline of T-H2), correct the doc to the verified runtime. *Exit:* each canon doc reconciled against code, drift fixed and dated.

### Installable topology (LAB 8GB) — planned

- [ ] **T-T1 One installable Dream Machine copy on LAB 8GB.** Topology (deployment, not a 4th jurisdiction): **Canyon** (Cloudflare Tunnel ingress, no authority from ingress) · **Golden Bridge** (macOS execution + preventive maintenance: health/disk/backup/log-rotation/service-restart/model-availability) · **Manhattan** (local inference + dynamic-projection workbench; cognition only, no consequence). *Exit:* the existing `dream-machine-installable-topology.v0.yml` is honored by an actual install plan + `runtime_projection` is deployable local-first.

### E4 — Envelope vocabulary code migration

- [~] **T-E4 Migrate SPINE code vocabulary** Candidate→Proposal, Admission→Confirmation/BoardCommit, admitted→board_committed, Act→BoardAct/EnvelopeAct. Docs sanitized; TS type names/aliases started; **stored identity keys/table names kept stable on purpose** (renaming re-keys hashes). *Exit:* new public API uses membrane vocabulary (old names only as deprecation aliases); a written migration plan covers stored keys; `board_act_hashes` vs current `source.act_hashes` accepted+normalized by adapters until the hash-preserving migration lands.

---

## D. Corrected / removed claims (so they don't creep back)

- ✗ "There is a v0/v1 gate schism" — false; v0 is the live system (corrected 2026-06-26).
- ✗ "Envelope Dynamic Projections already exist" — metadata scaffolding is real; composition + attention governor are **partial in FACE Scene motor** (T-DP1/T-DP2 `[~]`), not done in KERNEL/SPINE.
- ✗ Test counts 103 / 242 / 94 — stale; now 107 (SPINE) and 265+1-skip (KERNEL).
- ✗ "No LogLine→Envelope derivation pipe" — built this session (T-S1).
- ✗ `DOC_TREE_AND_DRIFT.md` as a trustworthy drift report — it had itself drifted; deleted.

## E. Execution order

0. **Close this session's ghosts** — write the T-S1 pipe test, then commit the pipe + seeds + hygiene deletes + this tasklist. Turns honest `[~]` into honest `[x]` under DoD §0.
1. **T-K6 / T-H1 / T-H2 / T-H3** — hygiene + uncommitted-tree decisions (cheap, stops rot).
2. **T-S2** — make the derivation pipe re-runnable (it's the load-bearing seam).
3. **T-S7** — Envelope conformance type (completes the SPINE body's third leg; folds in T-H2).
4. **T-P1 (incl. T-R1, T-F1)** — consolidate the seam into the one packaged plugin.
5. **T-DP1 → T-DP2** — the real motor: composer first, then the attention governor (needed for *andamento*).
6. **T-F2 → T-F3 → T-F4** — live adapters, cards, safety tests (read-only proven before any effect).
7. **T-P2** — the UI acceptance e2e: the system-level done receipt.
8. **T-R2** — the first external-effect crossing, only after read-only is proven safe.
9. **T-E4 / T-K2–K5 / T-S3–S6** — vocabulary migration + remaining jurisdiction contracts, in parallel as capacity allows.
10. **T-T1** — installable on LAB 8GB.

Reason for the order: close today's open loops first; stop rot; complete each body's three legs; consolidate the one plugin; then the motor; effectful actions wait until read-only projection is proven safe; the UI e2e is the receipt that the packaged shape actually works; never implement the UI card before the normalizer/adapters it renders.

## F. PR roadmap (rough cut to closure)

A PR ≈ one reviewable, independently-mergeable slice. ~12 PRs from here to the packaged shape. The **read-only system closes at PR-9** (open the UI → the agent truthfully reports the processes and their *andamento* against real ledgers); effect + deploy come after.

| PR | Slice | Tasks |
|----|-------|-------|
| PR-1 | Close today's loops & honesty (commit pipe+seeds+deletes+tasklist; pipe test; decisions) | T-S1 test, T-K6, T-H1, T-H2, T-H3 |
| PR-2 | Doc rationalization (113 → ~12) + board drift fix | T-H5, T-H6 |
| PR-3 | Pipe hardening (re-runnable + test) | T-S2 |
| PR-4 | Envelope conformance — the missing 3rd leg | T-S7 (+T-H2) |
| PR-5 | The one plugin (endpoint + consolidation) | T-P1 = T-R1 + T-F1 |
| PR-6 | Dynamic projection composer (the real motor) | T-DP1 |
| PR-7 | Attention governor (bounds the query space; enables honest *andamento*) | T-DP2 |
| PR-8 | FACE live adapters + cards + safety tests | T-F2, T-F3, T-F4 |
| **PR-9** | **UI acceptance e2e — the system done receipt** | **T-P2** |
| PR-10 | First external-effect crossing (after read-only proven) | T-R2 |
| PR-11 | Vocabulary migration + remaining jurisdiction contracts (parallel) | T-E4, T-K2–K5, T-S3–S6 |
| PR-12 | Runtime daemons + fleet + installable on LAB 8GB | T-T1 |

Closure read: ~9 PRs to the spine of done; PR-10/11/12 are effect, polish, and deployment on top.
