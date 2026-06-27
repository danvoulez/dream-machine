# Dream Machine Triple Task List

Status: coordination task list after machine-readable membrane seed and runtime reality scan.

Date: 2026-06-26

This task list acknowledges that the three parts are at different stages of
development and were built under different pressures. The goal is not to merge
them. The goal is to let each jurisdiction become clearer, then connect them
through an explicit membrane.

## Constitutional Cut

This is one institution with three jurisdictions and a customs office:

```text
LogLine
  owns consequence

Envelope
  owns cognition

Membrane
  owns crossing

Processual UI
  owns interaction
```

The strongest membrane law is:

```text
No domain may define another domain's primitive.
A domain may reference another domain's primitive only through declared membrane fields.
```

The first deliverable is therefore not a LogLine schema or an Envelope schema.
The first deliverable is the ownership map. Until ownership is machine-readable,
every later schema risks defining the same concept twice.

Initial machine-readable seed:

- `dream-machine-ownership.v0.yml`

## Final Installable Shape

The final project shape is a single installable Dream Machine copy running on
the LAB 8GB machine.

This is the deployable topology:

```text
Canyon
  public mouth / ingress
  Cloudflare Tunnel

Golden Bridge
  runtime bridge / machine operations
  macOS execution
  preventive maintenance

Manhattan
  local cognition / projection workbench
  local inference available
  Envelope Dynamic Projections
```

This trio is deployment topology, not a fourth jurisdiction. The jurisdictions
remain LogLine, Envelope, Membrane, and Processual UI. The installable must
respect that ownership map.

Final installable requirements:

- One installable package/copy for LAB 8GB.
- Cloudflare Tunnel provides ingress; no direct public authority is inferred
  from ingress.
- macOS is the execution environment for local processes and machine
  maintenance.
- Local inference is available for Envelope Dynamic Projections and other
  cognition tasks.
- Preventive maintenance is part of the machine runtime obligation:
  health checks, storage checks, service restarts, log rotation, backup status,
  and model/runtime availability.
- The portal chief watches Canyon, requests projections from Manhattan, and
  routes operational needs through Golden Bridge without becoming authority.
- LogLine content hashes remain the authority anchor regardless of deployment
  topology.

Planning impact:

- The runtime projection tool must be deployable in a local-first install.
- The ingress boundary must be explicit in crossing and conflict rules.
- Machine maintenance should become its own contract/task before production.
- Local inference must be treated as an Envelope capability, not a LogLine
  authority source.

## Task Status Summary

This section is the operational truth of the task list as of 2026-06-26. It
separates what is already done from what is partially done and what remains
open.

### Session Update — 2026-06-26 (implementation pass)

A later same-day session moved from contract-writing into implementation. Deltas:

- **LogLine Hash Excellence (§2): substantially hardened.** Added
  `Dream-Machine-LogLine-Acts/tests/test_receipt_hardening.py` — frozen golden
  receipt vectors, the LIP-0007 composition profile (tuple/content split,
  AUX-in-content-hash, closed `hashes` object, forbidden fields, dotted version,
  bare-hex), determinism/tamper coverage, and a cross-engine parity test that
  runs the same `vectors/receipt/{valid,invalid}` corpus the JS gate
  (`verify-receipt.mjs`) runs — Python and JS now agree on all 20 receipt-shaped
  vectors. Found and fixed a real authority bug: `verify()` accepted a receipt
  with an extra `envelope_hash` smuggled into the `hashes` object; `lab/receipt.py`
  now enforces a closed `hashes` set (`HASH_FIELDS`). Python suite 242 passing;
  JS gate 21/21.
  **Superseded by the 2026-06-27 audit:** the receipt hardening is now committed
  locally in LogLine-Acts. Citation composition and read-only inspection also
  exist in the working copy with tests; their remaining work is commit/merge
  discipline plus membrane/portal integration.

- **NEW workstream — Envelope Additive Spine (foundation): DONE and merged.**
  The Envelope definition was reframed (see
  `Dream-Machine-Envelope-Ledger/docs/superpowers/specs/2026-06-26-envelope-additive-spine-design.md`):
  the LogLine act is a frozen monomer; processes are enzymes (recognition =
  movement); movement is emergent and therefore must be observed; the Envelope is
  the additive record (a `Shift` per recognition-movement), never subtractive
  ("add, never subtract"). Shipped the foundation slice to
  `Dream-Machine-Envelope-Ledger` `main`: the canonical `Envelope` object (intact
  `content` + shifts + custody + transport), the dual hash (`thin_envelope_hash`
  skin-only vs full `envelope_hash`), additive-law validation, and append-only
  constructors. 103 tests passing, final review APPROVE. Follow-on plans (own
  spec→plan cycles): `board_act`/`proposal` additive-binding retrofit, the
  queryability index (with the attention governor — queryability is
  unlimited/derived, but model perception is Scene-bounded and attention is
  scarce), Scene/attention governance, and the OAuth crossing as first client.
  This is a new prerequisite that sits alongside §3: it redefines what an
  Envelope *is* before the projection-excellence fields are added.

- **Envelope-Ledger now builds.** The repo was extracted from its `@tabuleiro`
  monorepo without its root tsconfig (dangling `extends: ../../tsconfig.json`),
  so it did not `tsc` or `vitest` at all. Replaced with a self-contained tsconfig;
  the repo is now git-initialized with a green baseline plus the foundation merged.

### Session Update — 2026-06-27 (audit correction pass)

This pass re-scanned the three active repos and corrects stale claims in this
task list. Verified facts:

- **Processual UI:** the membrane docs are committed on branch
  `codex/dream-machine-membrane-contracts`. Current untracked implementation
  foundation is only:
  `shared/tools/runtime-projection.ts` and
  `agent/lib/projection-normalizer.ts`. These define the read-only projection
  response types and a pure normalizer. They are not yet wired into Eve as an
  agent tool and not yet rendered as a custom chat card.
- **Processual UI validation:** `pnpm contracts:validate` passes:
  `Dream Machine contract validation passed (15 contracts)`. `pnpm typecheck`
  also passes with the new untracked normalizer/types.
- **LogLine Acts:** receipt hardening and OAuth dry-run are no longer just dirty
  work. They are present as local commits on `main`:
  `c4e2d59 harden(receipt): golden vectors, JS-gate parity, closed hashes object`
  and
  `5b32f8a feat(oauth): commit OAuth 2.1 client registration crossing (acts-side dry-run)`.
  The current dirty LogLine tree is instead:
  `docs/DANGER_TIERS.md`, `lab/cli.py`,
  `processes/CURRENT_RUNNABLE_PROCESSES.md`,
  `processes/PROCESS_CATALOG.md`, and
  `tests/test_grants_danger_tiers.py`, plus untracked docs/PDFs and read-only
  inspection/citation files if not yet added in this working copy.
- **LogLine validation:** relevant local tests pass when run through the moved
  venv's Python directly:
  `.venv/bin/python -m pytest tests/test_receipt.py tests/test_receipt_hardening.py tests/test_citation.py tests/test_inspect.py tests/test_oauth_client.py tests/test_grants_danger_tiers.py`
  => 94 passed. The wrapper `.venv/bin/pytest` itself is broken because its
  shebang still points at `/Users/ubl-ops/dream-machine-main/.venv/...` from
  before the folder rename; use `python -m pytest` or rebuild the venv.
- **Envelope Ledger:** additive spine foundation is committed on `main`.
  Vocabulary migration has started in TypeScript type names and aliases, while
  stored identity keys/table names/legacy function names remain deliberately
  stable to avoid re-keying existing hashes. A typecheck break in `src/board.ts`
  from the partial migration was found and fixed in this audit pass.
- **Envelope validation:** `pnpm lint` now passes and `pnpm test` passes:
  18 test files, 103 tests.

Corrected conclusion:

```text
The two crown technologies exist and are test-backed.
The missing work is no longer "invent the runtime".
The missing work is harden the exact membrane surface, finish the vocabulary
migration safely, wire the portal tool/card, and define the installable runtime
operations around Canyon / Golden Bridge / Manhattan.
```

### Session Update — 2026-06-27 (projection membrane implementation pass)

This pass corrected the projection-runtime decision and implemented the first
hardening slice.

- **Projection runtime decision corrected.** No single projection runtime wins
  for the portal as a whole. `runtime_projection` is the membrane-facing
  router/composer. It routes LogLine questions to LogLine projections/read-only
  proof surfaces, Envelope questions to Envelope projections, and mixed
  questions to side-by-side grouped source refs.
- **Processual UI portal tool/card now exists and is tested.**
  `agent/tools/runtime_projection.ts` now has jurisdiction routing, live/stub
  adapter handling, native LogLine projection mapping, Envelope projection
  mapping, and compatibility with both `source.board_act_hashes` and the current
  implementation field `source.act_hashes`.
- **Projection normalizer hardened.** Bare block refs now resolve against
  declared top-level refs instead of inventing ownerless refs, and affordance
  `result_mode` is validated before a button-eligible affordance survives.
- **Envelope projection hardening started in code.** Envelope `Projection`
  identity can now carry `pin`, `parent_projection_hashes`, `ladder_level`,
  `ttl_ms`, `stale`, `rebuild_reason`, and `loss_accounting`. These fields are
  persisted through `identity_body_json` without a table migration. The verifier
  now catches invalid ladder levels, missing parent projections, stale views
  without rebuild reason, and incomplete loss accounting.
- **Projection diff / `changes_since` implemented.** Envelope now exposes
  `diffProjections(...)` and `Board.diffProjections(...)`, comparing source refs,
  open findings, narrative block additions/removals/changes, stale changes, and
  generation delta between two projections. The Processual UI mapper recognizes
  this diff payload for the `changes_since` intent.
- **Tests added.** Processual UI has `pnpm test:projection`; Envelope verifier
  and identity tests cover projection hardening metadata; Board tests cover
  projection diff.

### Done

- Folder cut completed:
  `Dream-Machine-LogLine-Acts`, `Dream-Machine-Envelope-Ledger`, and
  `Dream-Machine-Processual-UI` are the three active local folders.
- Envelope / Board documentation sanitization completed, first pass:
  `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/docs/board/BOARD SPEC_v0.2.md`,
  `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/docs/board/BOARD_DECISIONS_v0.1.md`,
  `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/docs/board/BOARD_OBJECTS.md`,
  `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/docs/board/BOARD_LIFECYCLE.md`, and
  `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/docs/board/BOARD_VERTICAL_SLICE.md`.
- Sanitization manifest written:
  `docs/envelope-sanitization.v0.yml`.
- Machine-readable ownership map written:
  `docs/dream-machine-ownership.v0.yml`.
- Machine-readable vocabulary map written:
  `docs/dream-machine-vocabulary.v0.yml`.
- Machine-readable reference map written:
  `docs/dream-machine-reference-map.v0.yml`.
- LogLine jurisdiction contract written:
  `docs/logline-jurisdiction.v0.yml`.
- Envelope jurisdiction contract written:
  `docs/envelope-jurisdiction.v0.yml`.
- Envelope-to-LogLine translation package written:
  `docs/envelope-proposal-to-logline-package.v0.yml`.
- Projection response contract written:
  `docs/dream-machine-projections.v0.yml`.
- Action affordance contract written:
  `docs/dream-machine-actions.v0.yml`.
- Core technologies decision written:
  `docs/dream-machine-core-technologies.v0.yml`.
- Final installable topology contract written:
  `docs/dream-machine-installable-topology.v0.yml`.
- Crossing map written:
  `docs/dream-machine-crossing-map.v0.yml`.
- Conflict map written:
  `docs/dream-machine-conflict-map.v0.yml`.
- Projection response JSON Schema written:
  `docs/dream-machine-projections.v0.schema.json`.
- Portal chief doctrine written:
  `docs/dream-machine-portal-chief.v0.md`.
- Portal understanding document written:
  `docs/DREAM_MACHINE_PORTAL_UNDERSTANDING.md`.
- Runtime reality scan completed:
  LogLine already has projection runtime surfaces; Envelope already has
  projection runtime surfaces; Processual UI now has the first portal tool/card
  surface for `runtime_projection`.
- Projection-runtime decision made:
  no single projection runtime prevails for the whole portal. `runtime_projection`
  is the membrane-facing router/composer over LogLine, Envelope, and mixed
  projection views.
- Processual UI projection foundation started:
  `shared/tools/runtime-projection.ts` and
  `agent/lib/projection-normalizer.ts` define and normalize read-only projection
  responses; `agent/tools/runtime_projection.ts` and
  `app/components/chat/tool/RuntimeProjection.vue` now provide the first Eve
  tool/card surface. Live runtime adapters and tests remain pending.
- Contract validator added:
  `scripts/validate-dream-machine-contracts.mjs`.
- Package script added:
  `pnpm contracts:validate`.
- Current validation passes:
  `Dream Machine contract validation passed (15 contracts)`.

### Partially Done

- Envelope vocabulary is clean in the canonical Board docs. Code migration has
  started through sanitized TS type names and deprecated aliases, but stored
  identity keys/table names/test vocabulary still use Candidate/Admission/Act
  where changing them would re-key hashes or break storage compatibility.
- LogLine content-addressing hardening is now largely done and committed locally
  in LogLine-Acts: golden vectors, Python↔JS canonicalization parity over the
  shared conformance corpus, the LIP-0007 composition profile, tamper coverage,
  and the closed `hashes` fix. Citation composition and read-only hash inspection
  also exist in the working copy (`lab/citation.py`, `lab/inspect.py`) with
  tests. Remaining: decide their commit/merge state, expose the inspection
  surface through the portal, and encode the citation profile into the membrane
  contracts.
- Envelope Dynamic Projections already exist in implementation and are verified
  for prefix/source integrity, open finding references, ShiftResult receipts, and
  hash recomputation. Projection pin fields, parent projection hashes, ladder
  levels, TTL/stale/rebuild reason, and loss accounting now exist in code and
  participate in projection identity when present. Projection diff /
  `changes_since` now exists. Remaining "best in class" hardening: richer
  freshness policy, portal-contract normalization fixtures, live adapter tests,
  and formal evaporated-source loss policy.
- Envelope validation already exists and is the right kind of validator for
  Envelope:
  `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/src/validate.ts`
  validates input shape and primitives, while
  `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/src/verify.ts`
  verifies ledger consistency, identity hashes, ShiftResult bindings, events,
  findings, and projection prefixes. It should be hardened, not replaced by
  LogLine/JCS.
- The membrane is machine-readable enough for validation, and the crossing map,
  conflict map, portal chief doctrine, and first projection schema now exist.
  Full JSON Schema validation against sample payloads is still pending.
- Processual UI has the right Eve/Vercel integration pattern through
  `save_memory`, and now has an untracked pure normalizer/type foundation. It
  still has no Dream Machine runtime Eve tool and no projection card renderer.

### Pending

- Write LogLine automation tier contract:
  `logline-process-contract-automation.v0.yml`.
- Write LogLine attention obligation contract:
  `logline-attention-obligation.v0.yml`.
- Write LogLine-to-Envelope reference fields contract:
  `logline-envelope-reference-fields.v0.yml`.
- Write Envelope risk-tier compatibility contract:
  `envelope-risk-tier-compatibility.v0.yml`.
- Write Envelope projection pin contract:
  `envelope-projection-pin.v0.yml`.
- Write Envelope action affordance contract:
  `envelope-action-affordances.v0.yml`.
- Migrate Envelope implementation vocabulary from the older
  Candidate / Admission / Act naming to Proposal / Confirmation / BoardCommit /
  BoardAct naming.
- Harden `agent/tools/runtime_projection.ts` in Processual UI: keep the existing
  read-only Eve tool, route by jurisdiction, preserve LogLine/Envelope source
  refs, and continue live adapter coverage beyond the current pure tests.
- Finish and test the runtime projection normalizer from Envelope/LogLine outputs
  to `dream-machine-projections.v0.yml`; a pure first pass exists, the tool/card
  now exist, but live-source tests and card tests are still pending.
- Add projection cards, source-reference cards, warning cards, open-finding
  cards, and declared-affordance buttons to the UI.
- Add integration tests proving the portal can request/render projections but
  cannot register receipts, dispatch executors, mutate ledgers, or authorize L5.
- Build the OAuth client registration crossing as the first Envelope
  additive-spine client (see §11): commit the acts-side dry-run adapter, then
  record the real Supabase POST as an Envelope `Shift`/`ShiftResult` with transport
  and custody, act intact. Resolve the L3-vs-grant governance question.

## Detailed Execution Breakdown

This section expands the pending list into execution steps. Each step states the
target artifact, what must be decided or implemented, and the exit criteria.

### 0. Preserve What Is Already Done

Status: done, but must remain protected.

Artifacts:

- `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/docs/board/BOARD SPEC_v0.2.md`
- `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/docs/board/BOARD_DECISIONS_v0.1.md`
- `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/docs/board/BOARD_OBJECTS.md`
- `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/docs/board/BOARD_LIFECYCLE.md`
- `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/docs/board/BOARD_VERTICAL_SLICE.md`
- `docs/envelope-sanitization.v0.yml`
- `docs/dream-machine-ownership.v0.yml`
- `docs/dream-machine-vocabulary.v0.yml`
- `docs/dream-machine-reference-map.v0.yml`
- `docs/logline-jurisdiction.v0.yml`
- `docs/envelope-jurisdiction.v0.yml`
- `docs/envelope-proposal-to-logline-package.v0.yml`
- `docs/dream-machine-core-technologies.v0.yml`
- `docs/dream-machine-projections.v0.yml`
- `docs/dream-machine-actions.v0.yml`
- `scripts/validate-dream-machine-contracts.mjs`

Details:

- Keep the Board docs sanitized. Do not reintroduce unqualified Candidate,
  Admission, admitted, or Act vocabulary outside explicit ban notices.
- Keep LogLine as authority/consequence and Envelope as cognition/projection.
- Keep the decision that `runtime_projection` is the portal-facing
  projection membrane: it routes to LogLine projections for consequence/proof,
  Envelope projections for scene/movement/observability, and mixed projections
  only as side-by-side composition.
- Keep LogLine projections non-authoritative but first-class for registered
  consequence/proof questions.
- Keep `pnpm contracts:validate` passing before and after every doc change.

Done when:

- The validator still passes.
- New docs cite the existing contracts instead of redefining their primitives.
- Any future task preserves the completed sanitization boundary.

### 1. Missing Membrane Contract Artifacts

Status: done.

Artifacts to create:

- `docs/dream-machine-crossing-map.v0.yml`
- `docs/dream-machine-conflict-map.v0.yml`
- `docs/dream-machine-projections.v0.schema.json`
- `docs/dream-machine-portal-chief.v0.md`

Details:

- `dream-machine-crossing-map.v0.yml` must declare what can cross between
  LogLine, Envelope, Membrane, and Processual UI. It should define direction,
  allowed source refs, forbidden claims, required validation, and whether the
  crossing is read-only, proposal-only, or authority-bearing.
- `dream-machine-conflict-map.v0.yml` must declare who wins when two views
  disagree. LogLine wins consequence; Envelope wins projection/narrative shape;
  Membrane wins crossing permission; UI wins rendering only. Projection conflict
  with registered consequence causes projection rebuild.
- `dream-machine-projections.v0.schema.json` must validate the YAML projection
  response contract as a JSON Schema. It must enforce `authoritative: false`,
  `source_refs`, `warnings`, `affordances`, and `cannot_do`.
- `dream-machine-portal-chief.v0.md` must describe the portal chief in human
  terms: watches the inbox mouth, requests projections, renders processual
  state, asks humans, routes approvals, and never becomes authority.

Done when:

- All four files exist. Complete.
- `scripts/validate-dream-machine-contracts.mjs` requires them. Complete.
- `pnpm contracts:validate` passes with the expanded contract count. Complete:
  15 contracts.
- Each file depends on the ownership, vocabulary, reference, core technology,
  projection, and action contracts where relevant. Complete where relevant.

### 2. LogLine Hash Excellence

Status: hardening substantially done and locally committed for the receipt core
(golden vectors + Python↔JS parity + LIP-0007 composition profile + tamper, plus
a real `verify()` closed-`hashes` bug fixed). Citation-composition profile and
portal read-only hash inspection now exist in the working copy with tests; they
still need commit/merge discipline and membrane/portal integration. See Session
Update 2026-06-27.

Primary repo:

- `/Users/ubl-ops/Projetos/Dream-Machine-LogLine-Acts`

Existing anchors:

- `lab/receipt.py`
- `lab/citation.py`
- `lab/inspect.py`
- `lab/store.py`
- `tests/test_receipt.py`
- `tests/test_receipt_hardening.py`
- `tests/test_citation.py`
- `tests/test_inspect.py`
- `tests/test_signing.py`

Details:

- Add cross-language hash vectors for Python, JavaScript/TypeScript, and Rust
  if Rust remains part of the LogLine runtime direction.
- Add canonicalization parity tests proving the same nine-slot tuple and full
  receipt body produce the same `tuple_hash` and `content_hash` across
  supported languages.
- Add test vectors for Unicode, numeric edge cases, key ordering, forbidden
  fields, AUX fields, and every nine-slot mutation.
- Fold the existing hash composition profile into the membrane docs:
  `lab/citation.py` defines `content_hash`, `tuple_hash`,
  `process_contract_hash`, `result_hash`, and ordered bundle citations.
- Fold the existing read-only hash inspection surface into the portal path:
  `lab/inspect.py` returns receipt metadata, canonical slots, validation status,
  citation status, and safe source refs without granting mutation.
- Keep the invariant nine slots as the only runtime anatomy:
  `who`, `did`, `this`, `when`, `confirmed_by`, `if_ok`, `if_doubt`,
  `if_not`, `status`.

Done when:

- Hash vectors exist and are versioned.
- Parity tests pass across supported runtimes.
- Any mutation to one of the nine slots changes `tuple_hash`.
- Any mutation to canonical content changes `content_hash`.
- Portal-facing hash inspection is read-only and cannot register, dispatch, or
  close anything. Implemented at LogLine module level; still pending in the
  Processual UI runtime tool.

### 3. Envelope Dynamic Projection Excellence

Status: runtime exists, verifier/tests are green, and the first projection
excellence fields are implemented. Diff/changes-since and richer freshness
policy remain pending.

Primary repo:

- `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger`

Existing anchors:

- `src/projection.ts`
- `src/identity/projection.ts`
- `src/store/projections.ts`
- `src/validate.ts`
- `src/verify.ts`
- `src/board.ts`
- `tests/verify.test.ts`
- `tests/board-fuzz.test.ts`
- `tests/identity.test.ts`
- `pnpm lint`
- `pnpm test`

Validator status:

- Envelope already has a domain-native validator/verifier pair.
- `src/validate.ts` validates primitive input shape:
  hash, millis, risk tier, actor id, slots, shift context, stream config, and
  supported canonicalization/hash algorithm.
- `src/verify.ts` validates ledger consistency:
  stream config hash, chain sequence, previous hash, identity hash
  recomputation, ShiftResult binding, missing outputs, event hash, event zone,
  finding hash, finding shift refs, projection prefix, projection hash, and open
  finding references.
- `tests/verify.test.ts`, `tests/board-fuzz.test.ts`, and `tests/identity.test.ts`
  already prove clean-ledger success and tamper detection.
- This is sufficient for the current Envelope implementation; verified on
  2026-06-27 with `pnpm lint` and `pnpm test` (103 tests).
- It is not yet sufficient for the future Dynamic Projection bar because those
  fields do not exist yet in the Envelope model.

Details:

- Do not introduce LogLine/JCS as Envelope authority. Envelope uses its own
  `board-json-v0` identity and verifier. The task is to harden the existing
  Envelope verifier as Envelope grows.
- Add an explicit projection pin shape. Implemented in code:
  `model`, `prompt`, `params`, `seed`, and model-call reference.
- Add projection lineage. Implemented in code:
  `parent_projection_hashes`, `ladder_level`, and optional reason for descent
  or refinement.
- Add freshness. Basic code fields implemented; richer policy pending:
  `generated_at`, `as_of_seq`, `ttl_ms`, `stale`, `rebuild_reason`, and
  source watermark.
- Add partial-source and evaporation accounting. Basic loss-accounting field
  implemented; evaporation policy still pending:
  when events evaporate, projections must still cite durable `source_digest`
  and must reveal what source detail is no longer available.
- Add `changes_since` or projection diff. Implemented in code:
  compare projection hashes, source refs, findings, narrative blocks, risk
  notes, and affordances.
- Add contract tests against `docs/dream-machine-projections.v0.yml`:
  Envelope projection output must be normalizable into the portal projection
  response without losing source refs, open findings, or shift provenance.
- Extend `src/validate.ts` for the new projection fields once they exist.
- Extend `src/verify.ts` so it catches missing pin, invalid lineage, invalid
  ladder level, stale freshness claims, missing loss accounting, and invalid
  projection diff references.
- Keep Envelope projections non-authoritative:
  they may produce salience, proposals, warnings, and affordances, but not
  consequence.

Done when:

- Projection identity includes the intended provenance/freshness fields.
- Verification catches missing lineage, stale source claims, missing open
  findings, and projection hash mismatch.
- Existing Envelope tests still pass.
- New Envelope verifier tests cover pin, lineage, freshness, partial source
  accounting, diff, and portal-contract normalization.
- Projection diff can answer "what changed since the previous projection?"
  Implemented for source refs, open findings, narrative block add/remove/change,
  stale status changes, and generated-at delta.
- A sample Envelope projection normalizes cleanly into the portal contract.

### 4. Envelope Implementation Vocabulary Migration

Status: docs sanitized; code migration started but intentionally not complete.

Primary repo:

- `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger`

Affected areas:

- `src`
- `tests`
- any public exports or examples using older terms

Details:

- Continue implementation vocabulary migration from old terms to sanitized
  terms: Candidate to Proposal, Admission to Confirmation / Sealing /
  BoardCommit, admitted to board_committed, Act to BoardAct or EnvelopeAct where
  the owner is Envelope.
- Preserve identity keys and stored values when renaming would re-key hashes.
  Current code explicitly keeps on-wire keys such as `candidate_version_hash`,
  `admitted_by`, `admitted_risk`, table names such as `candidate_versions`, and
  output kinds such as `act`/`candidate` until a deliberate migration exists.
- Preserve storage compatibility intentionally:
  if database table or column names cannot change immediately, create a
  migration plan or compatibility aliases rather than silently breaking data.
- Update tests alongside source.
- Update public API names in a staged way:
  either introduce new names with deprecated aliases, or perform a breaking
  rename with a clear migration note.
- Keep `Shift`, `ShiftResult`, `Projection`, and `Finding` identities intact.

Done when:

- Source and tests no longer expose old unqualified vocabulary in new public API
  surfaces except compatibility/deprecation notices; stored identity keys remain
  old by design until a migration plan is written.
- Tests pass in the Envelope repo.
- The sanitizer manifest is updated to distinguish docs-clean from code-clean.
- Public API names match the membrane vocabulary.

### 5. Runtime Projection Tool

Status: foundation started; agent tool pending.

Primary repo:

- `/Users/ubl-ops/Projetos/Dream-Machine-Processual-UI`

Files likely involved:

- `agent/tools/runtime_projection.ts`
- `shared/tools/runtime-projection.ts` (exists, untracked)
- `agent/lib/projection-normalizer.ts` (exists, untracked)
- `agent/agent.ts`
- `app/components/chat/message/MessageContentEve.vue`
- `app/components/chat/tool/*`
- `app/utils/chat/*`

Details:

- `runtime_projection` exists as the first Dream Machine runtime tool. The
  shared response types, pure normalizer, Eve `defineTool` wrapper, stub/live
  adapter seam, and first card renderer exist. The remaining work is live
  adapter hardening, LogLine/Envelope routing coverage, and tests.
- Inputs should include:
  `intent`, `scope`, optional filters, `as_of`, `audience`, `max_blocks`, and
  `include_affordances`.
- Source selection should support:
  Envelope-only, LogLine-only, and mixed projections.
- Default portal-facing projection should route by question:
  LogLine for consequence/proof/hash/process/grant questions, Envelope for
  scene/movement/observability/finding questions, and mixed only when the
  operator explicitly needs both views side by side.
- The tool must normalize outputs into `dream-machine-projections.v0.yml`.
- Every response must include:
  `projection_id`, `intent`, `jurisdiction`, `authoritative: false`,
  `freshness`, `source_refs`, `blocks`, `warnings`, `affordances`, and
  `cannot_do`.
- The tool must be read-only:
  no receipt registration, no executor dispatch, no ledger mutation, no L5
  authorization.

Done when:

- The tool can return a mock or local projection response conforming to the
  contract.
- It clearly reports `cannot_do`.
- It cites source refs for every non-divider block.
- It never mutates LogLine or Envelope.

### 6. Projection Normalizer

Status: first pure pass exists; tests and live adapters pending.

Primary repo:

- `/Users/ubl-ops/Projetos/Dream-Machine-Processual-UI`

Details:

- Convert Envelope projections into portal projection blocks:
  narrative blocks, open findings, source refs, risk notes, warnings,
  attention blocks, and affordances.
- Convert LogLine projections into portal blocks only as authority context or
  proof-adjacent read models:
  receipt counts, process state, queue/read-model state, and source hashes.
- Preserve source refs by jurisdiction:
  LogLine refs as `content_hash`, `receipt_hash`, `process_id`, etc.; Envelope
  refs as `projection_hash`, `shift_hash`, `source_digest`, `finding_id`,
  `board_act_hash`, etc.
- Add warning rules:
  stale projection, partial source, mixed jurisdiction, envelope-only,
  requires LogLine registration, L5 describe-only, missing grant, unresolved
  finding.
- Add affordance filtering:
  render buttons only when backed by `dream-machine-actions.v0.yml`.

Done when:

- Unit tests cover the normalizer's rejection paths, source-ref requirements,
  mixed-jurisdiction warnings, stale warnings, affordance filtering, and
  `cannot_do` guarantees.
- A sample Envelope projection normalizes into a valid portal response.
- A sample LogLine projection normalizes into a valid portal response.
- A mixed response groups source refs by owner.
- Invalid or authority-claiming projections are rejected.

### 7. Projection UI Cards

Status: pending.

Primary repo:

- `/Users/ubl-ops/Projetos/Dream-Machine-Processual-UI`

Details:

- Add card renderers for projection summaries, source refs, findings,
  attention, proposal details, LogLine receipt details, risk notes, warnings,
  and next steps.
- Add affordance rendering from declared affordances only.
- Keep UI authority-neutral:
  cards may show, ask, explain, and route; they may not imply that a projection
  itself registered consequence.
- Add empty, stale, partial, loading, and error states.
- Preserve the existing Eve dynamic tool-card pattern already used by
  `save_memory`.

Done when:

- `runtime_projection` responses render as structured cards in chat.
- Buttons appear only from declared affordances.
- Warnings and `cannot_do` limits are visible.
- Mobile and desktop layouts do not overlap or hide source refs.

### 8. Safety And Integration Tests

Status: pending.

Primary repo:

- `/Users/ubl-ops/Projetos/Dream-Machine-Processual-UI`

Details:

- Add contract validation tests for every machine-readable membrane file.
- Add tool tests proving `runtime_projection` is read-only.
- Add UI tests proving cards render source refs, warnings, findings, and
  affordances.
- Add negative tests proving the portal cannot:
  register receipts, dispatch executors, mutate LogLine, mutate Envelope,
  authorize L5, or treat projections as truth.
- Add cross-repo fixture tests if practical:
  sample LogLine receipt/projection input and sample Envelope projection input
  normalize to the same portal response shape.

Done when:

- `pnpm contracts:validate` passes.
- Processual UI tests pass.
- Envelope tests pass after vocabulary/projection changes.
- LogLine tests pass after hash hardening changes.
- At least one end-to-end projection path is covered from runtime source to
  rendered card.

### 9. Recommended Execution Order

Order:

1. Write the missing membrane contract artifacts. Complete.
2. Add JSON schema validation for projections and contracts.
3. Harden Envelope Dynamic Projections because they are the observability-side
   projection runtime.
4. Harden LogLine hash references and inspection because they anchor authority.
5. Migrate Envelope code vocabulary.
6. Harden the existing `runtime_projection` live adapter and jurisdiction routing.
7. Harden the existing projection normalizer.
8. Harden the existing projection UI card.
9. Add integration and safety tests.

Reason:

- The portal tool should not be implemented before the missing crossing and
  conflict rules exist.
- Projection UI should not be implemented before the normalizer exists.
- Effectful actions should wait until read-only projection is proven safe.

### 10. Final Installable And Machine Topology

Status: planned.

Target:

- One installable Dream Machine copy on LAB 8GB.

Topology names:

- Canyon: public ingress mouth through Cloudflare Tunnel.
- Golden Bridge: macOS execution and machine operations layer.
- Manhattan: local cognition and Dynamic Projection workbench.

Details:

- Package the system so it can be installed as one coherent local copy on LAB
  8GB.
- Define Cloudflare Tunnel ingress as a transport boundary. It accepts entry
  into the system but never grants authority by itself.
- Define macOS execution responsibilities:
  process launch, service supervision, local scheduled work, local filesystem
  access, and safe execution boundaries.
- Define preventive maintenance responsibilities:
  health checks, disk checks, backup status, log rotation, service restart
  policy, model availability checks, and local runtime diagnostics.
- Define local inference as an Envelope/Manhattan capability:
  it may produce projections, summaries, findings, and salience; it may not
  register consequence.
- Define how the portal chief uses the trio:
  watch Canyon, ask Manhattan for projections, route operational needs through
  Golden Bridge, and cite LogLine authority for consequence.

Done when:

- A machine-readable installable topology contract exists.
- The contract is required by `pnpm contracts:validate`.
- Runtime projection and maintenance tasks cite the topology contract.
- The install plan names Cloudflare Tunnel, macOS execution, local inference,
  and preventive maintenance explicitly.
- The topology does not redefine LogLine, Envelope, Membrane, or Processual UI.

### 11. OAuth Client Registration Crossing — first Envelope additive-spine client

Status: design done; acts-side dry-run committed locally in LogLine-Acts; edge
POST script exists; the Envelope additive crossing record is not yet built. This
is the first concrete client of the Envelope Additive Spine and validates it
end-to-end: a process recognizes an act and moves it across an external boundary,
and that movement must be recorded additively as a `Shift` while the act stays
intact.

Primary repos:

- `/Users/ubl-ops/Projetos/Dream-Machine-LogLine-Acts` (acts-side dry-run, consequence)
- `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger` (the crossing record, observability)

Existing (LogLine-Acts):

- `lab/oauth.py` — dry-run adapter. `external_effect: false`, `api_called: false`;
  builds the canonical RFC 7591 client-metadata request deterministically and
  emits `request_hash` / `client_metadata_hash` as evidence + a candidate act.
- `tools/register_oauth_client.py` — the edge effect: the ONE place the real
  Supabase Auth admin POST happens, outside the kernel. It defaults to dry-run
  and requires `--execute` plus `SUPABASE_SECRET_KEY` to send. It still does not
  record the POST as an Envelope `Shift`/`ShiftResult`.
- `processes/oauth-client.v1.yml` — process contract, `danger_tier: L3`,
  `evidence_must_include: [request_hash, client_metadata_hash]`.
- `tests/test_oauth_client.py`, plus the `oauth-client` entry in `lab/adapters.py`.

The split (decided this session):

- The **acts-side dry-run adapter is legitimate LogLine consequence work** —
  recording the intent and evidence of a crossing. It is committed locally on
  the LogLine side.
- The **real POST is the membrane crossing** and currently bypasses the membrane.
  It should become a TypeScript edge program that performs the POST and records the
  crossing as an Envelope `Shift` (kind `effect`): `input_hash` references the
  act's `content_hash`, `transport` carries `sent_to: supabase` + channel, custody
  records the handoff, and a `ShiftResult` binds the returned `client_id`. The act
  is never subtracted (additive law).

Governance note:

- `danger_tier: L3` is BELOW the grant gate (`DANGEROUS_TIERS = {L4, L5}` in
  `lab/evaluator.py` / `lab/runtime.py`), so oauth-client.v1 runs with no grant.
  Harmless for the dry-run (it does nothing), but the real edge effect — creating
  an OAuth client that returns a `client_secret` — is governed by nothing in the
  kernel by design. Revisit whether the real crossing should require an L4 grant
  once it goes through the membrane.

Depends on:

- Envelope Additive Spine foundation (DONE, merged to Envelope-Ledger main).
- A way to record an external-effect `Shift` + `ShiftResult` for a boundary
  crossing in the Envelope-Ledger store (the shift/shiftResult stores exist).

Done when:

- The acts-side dry-run adapter is committed in LogLine-Acts. Complete locally;
  still check push/merge status against origin before treating it as shared.
- A TypeScript edge crosser performs the Supabase POST and records an Envelope
  `Shift`/`ShiftResult` for the crossing, with transport + custody, leaving the
  wrapped act byte-for-byte intact.
- The returned `client_id` is bound via `ShiftResult`; the `client_secret` is
  handled at the edge only and never enters a receipt or projection.
- A test proves the crossing is recorded additively (act `content_hash` unchanged)
  and that the dry-run request and the real request derive from the same builder.
- The L3-vs-grant governance question above is explicitly resolved (keep L3, or
  raise to L4 with a grant), not left implicit.

## Runtime Reality Scan

Scan date: 2026-06-26.

The earlier task list was too conservative about projections. The Dream Machine
does not need a projection runtime invented from zero. It already has projection
runtime pieces in both sovereign halves. The missing part is the membrane-facing
portal tool that can ask those pieces for a view, normalize the response, render
it in chat, and refuse authority it does not own.

Existing projection surfaces:

- LogLine Acts:
  `/Users/ubl-ops/Projetos/Dream-Machine-LogLine-Acts/lab/projections.py`
  implements rebuildable, non-authoritative projection documents with stable and
  dynamic classes, pin metadata, parent projection hashes, `ladder_level`
  `L0-L5`, input hashes, inspection, descent, and verification.
- LogLine CLI:
  `/Users/ubl-ops/Projetos/Dream-Machine-LogLine-Acts/lab/cli.py` exposes
  `lab project all|build|inspect|descend|verify`.
- LogLine process law:
  `/Users/ubl-ops/Projetos/Dream-Machine-LogLine-Acts/processes/projection-build.v1.yml`
  is active, `L1`, and uses the `projection` adapter.
- Envelope Ledger:
  `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/src/projection.ts`
  implements `buildProjection`, creates a `Shift`, stores a `Projection`, and
  records a `ShiftResult`.
- Envelope public API:
  `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/src/board.ts` exposes
  `Board.buildProjection(...)`.
- Envelope verifier:
  `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/src/verify.ts` checks
  projection prefixes, open findings, projection receipts, and hash
  recomputation.
- Processual UI:
  `/Users/ubl-ops/Projetos/Dream-Machine-Processual-UI/agent/tools/runtime_projection.ts`
  implements the first read-only portal tool with a stub/live adapter seam, and
  `/Users/ubl-ops/Projetos/Dream-Machine-Processual-UI/app/components/chat/tool/RuntimeProjection.vue`
  renders the first projection card. The remaining gap is not tool existence;
  it is live adapter correctness, LogLine/Envelope routing, and tests.

Reality conclusion:

```text
Projection runtimes exist.
The first portal projection membrane exists.
It still needs live-source adapters, routing tests, and projection-card tests.
```

Therefore the next implementation task is not "create projections." It is:

```text
Wrap existing LogLine and Envelope projection runtimes behind runtime_projection.
Normalize both into dream-machine-projections.v0.yml.
Render the normalized result in the Processual UI.
Keep the response non-authoritative.
```

## Two Crown Technologies

There are two technologies that must become excellent because they are the
reason this institution exists:

```text
LogLine content-addressed receipts
  best at composability, authority, offline verification, and consequence

Envelope dynamic projections
  best at cognition, observability, navigation, synthesis, and live context
```

They are not competing implementations of the same idea. They are different
machines with different truth conditions.

Decision:

```text
Both stay.
Neither replaces the other.
Hashes win authority.
Projections win perception.
The membrane makes them cooperate without merging their primitives.
```

LogLine content-addressing is better for anything that must be cited, replayed,
verified, signed, composed, or treated as consequence. Its excellence bar is:
canonical bytes, stable hash identity, append-only custody, explicit slot body,
offline verification, signature binding, and hash-level composition.

Envelope dynamic projection is better for anything that must be understood,
summarized, navigated, compared, watched, or re-rendered for a human or model.
Its excellence bar is: source completeness, projection lineage, model/prompt
pinning, ladder-aware refinement, open-finding visibility, freshness,
rebuildability, and clear non-authority.

The portal chief should therefore not ask "which system is true?" It should ask:

```text
What consequence is registered?
What does the current projection see?
What changed since the last projection?
What would need LogLine registration before it becomes consequence?
```

Machine-readable seed:

- `dream-machine-core-technologies.v0.yml`

## 1. LogLine Acts

Role: sovereign consequence.

LogLine owns registered truth, process law, closure, grants, and executor outcome.
It should stay small, hard, canonical, and append-only.

Canonical source set:

- `/Users/ubl-ops/Projetos/Dream-Machine-LogLine-Acts/docs/decisions/0001-logline-native-representation.md`
- `/Users/ubl-ops/Projetos/Dream-Machine-LogLine-Acts/docs/decisions/0002-process-risk-and-governed-autonomy.md`
- `/Users/ubl-ops/Projetos/Dream-Machine-LogLine-Acts/docs/decisions/0003-projections-and-attention.md`

### Already Strong

- Canonical receipt mold with nine string slots:
  `who`, `did`, `this`, `when`, `confirmed_by`, `if_ok`, `if_doubt`,
  `if_not`, `status`.
- JCS/RFC8785 canonicalization and `id = content_hash`.
- Append-only local and Postgres ledger shape.
- Process contracts and evaluator.
- Danger tiers `L0-L5`.
- Queue as rebuildable projection, not authority.
- Executor as the only dispatcher.
- Adapter discipline: dumb leaves, no direct ledger authority.
- L4/L5 grant and passkey signoff doctrine.
- Projection doctrine: projections are non-authoritative and rebuildable.
- Projection runtime already exists:
  `lab/projections.py` builds stable and dynamic projection docs with pin
  metadata, parent projection hashes, ladder levels, input hashes, inspection,
  descent, and verification.
- Projection process already exists:
  `projection-build.v1` routes to the `projection` adapter instead of pretending
  a projection is a receipt.

### Missing Before Ideal Membrane

- Resolve Canyon's canonical target:
  CAS + LogLine registration should supersede standalone `inbox` table unless a
  new decision says otherwise.
- Encode automation `A0-A5` in process contracts, not only doctrine.
- Define the LogLine side of the attention object shape:
  process-triggered obligation, authority requirement, and closure path.
- Decide whether LogLine's current projection specs remain low-level ledger
  snapshots or gain named portal-facing specs for intents such as
  `waiting_on_me`, `process_detail`, and `danger_review`.
- Map LogLine projection docs to `dream-machine-projections.v0.yml`:
  `projection_hash`, `authoritative: false`, `rebuildable: true`,
  `input_hashes`, `parent_projection_hashes`, `ladder_level`, `pin`, and
  freshness.
- Define explicit references to Envelope objects:
  `event_hash`, `source_digest`, `shift_hash`, `proposal_version_hash`,
  `projection_hash`, `finding_id`.
- Define the LogLine receipt proposal package produced by Envelope translation.
- Make explicit that LogLine does not own LLM narrative, projection ladders, or
  cognition workbench state.
- Decide how `projection-build.v1` cites Envelope projection hashes without
  making Envelope projections authoritative.
- Keep ADR-0001's law explicit: LogLine has no ledger-level proposal or
  pre-registration state.
- Keep LogLine-shaped output centered on the invariant nine slots whenever a
  projection leads to consequence; projection metadata must not become new
  runtime anatomy.

### Deliverables

- `logline-jurisdiction.v0.yml`
- `dream-machine-core-technologies.v0.yml`
- `logline-canyon-decision.v0.yml`
- `logline-process-contract-automation.v0.yml`
- `logline-attention-obligation.v0.yml`
- `logline-envelope-reference-fields.v0.yml`
- `logline-receipt-proposal-from-envelope.v0.yml`

## 2. Envelope Ledger

Role: cognition, observability, and projection workbench.

Envelope owns what the runtime sees, condenses, narrates, tests, and proposes.
It should stay rich, dynamic, and LLM-friendly without claiming sovereign
consequence.

Canonical source set:

- `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/docs/board/BOARD SPEC_v0.2.md`
- `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/docs/board/BOARD_DECISIONS_v0.1.md`
- `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/docs/board/BOARD_OBJECTS.md`
- `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/docs/board/BOARD_LIFECYCLE.md`
- `/Users/ubl-ops/Projetos/Dream-Machine-Envelope-Ledger/docs/board/BOARD_VERTICAL_SLICE.md`

Important qualification: these Board documents are structurally strong, but
lexically unsafe at the Dream Machine membrane. The `Shift` / `ShiftResult`
identity model should be preserved. The overloaded vocabulary must be sanitized
before any membrane schema is encoded.

Sanitization status: first pass complete on 2026-06-26. The canonical Envelope
docs now use `Proposal`, `BoardAct`, `Confirmation`, `BoardCommit`, and
`board_committed` vocabulary, with the old unqualified terms retained only in
the explicit ban notice.

### Already Strong

- Event ingestion with `live`, `buffered`, and `evaporated` zones.
- Source digests from event windows.
- Shifts and shift results.
- Proposal versions and lifecycle.
- BoardAct / EnvelopeAct chain, sequence, provenance, confirmation, and audit,
  with explicit BoardCommit fields.
- Findings.
- Narrative projections with blocks, audience, open findings, and sources.
- Verification over chain, receipts, proposal lifecycle, events, findings, and
  projection prefix.
- UI-friendly object model for dynamic projections.
- Projection builder already exists:
  `src/projection.ts` validates `as_of_seq`, creates a `ProjectionSource`,
  records a `Shift`, stores the `Projection`, and writes a `ShiftResult`.
- Public projection API already exists through `Board.buildProjection(...)`.
- Projection verification already exists for prefixes, open findings, missing
  results, orphan outputs, and hash recomputation.

### Missing Before Ideal Membrane

- Review and lock the sanitized Envelope / Board vocabulary before writing
  membrane contracts.
- Propagate the sanitized Proposal / Confirmation / Sealing / BoardCommit
  vocabulary into TypeScript code and tests. The docs are sanitized; the code
  still uses the older Candidate / Admission / Act names.
- State clearly that BoardAct / EnvelopeAct objects are envelope-canon, not
  LogLine consequence.
- Add or map `L5`: Board currently stops at `L4`, while LogLine has `L5`.
- Define a LogLine translation package for proposals and projections.
- Add first-class references back to LogLine objects:
  `content_hash`, `receipt_hash`, `process_id`, `queue_id`, `result_hash`.
- Add or map dynamic projection pin metadata compatible with LogLine projection
  doctrine: model, prompt, params, seed, parent projection hashes, and ladder
  level. Envelope currently has `model_call` references on `Shift`, but not the
  same explicit projection pin shape.
- Define action affordances for projection output:
  what can be shown as a button, what requires approval, and what must route
  through LogLine registration.
- Define how an Envelope proposal becomes a membrane translation package and
  then a LogLine receipt proposal.
- Define which Envelope objects can evaporate and which must remain durable.
- Decide how Envelope projection blocks map to portal response blocks without
  losing `source.act_hashes`, open findings, and shift provenance.
- Preserve wire compatibility during vocabulary migration:
  sanitized docs call the source field `board_act_hashes`, while the current
  Envelope implementation emits `source.act_hashes`. Portal adapters must accept
  both and normalize the semantic ref as `board_act_hash` until a deliberate
  hash-preserving storage/API migration exists.

### Deliverables

- `envelope-sanitization.v0.yml`
- `envelope-jurisdiction.v0.yml`
- `dream-machine-core-technologies.v0.yml`
- `envelope-risk-tier-compatibility.v0.yml`
- `envelope-logline-reference-fields.v0.yml`
- `envelope-projection-pin.v0.yml`
- `envelope-action-affordances.v0.yml`
- `envelope-proposal-to-logline-package.v0.yml`

## 3. Membrane And Processual UI

Role: crossing, rendering, and human intervention.

The membrane owns references, translations, crossing permissions, and conflict
rules. The Processual UI owns conversation, rendering, and human decisions. It
does not own runtime truth.

### Already Strong

- The Vercel/Eve template already supports durable chat threads.
- Dynamic tool parts can render structured cards in the chat stream.
- Human-in-the-loop approval and questions already exist through Eve
  `inputRequest` and `inputResponses`.
- Authorization prompts already appear as parked chat turns.
- Custom tool-card pattern exists via `save_memory`.
- The portal-chief doctrine is already captured in
  `docs/DREAM_MACHINE_PORTAL_UNDERSTANDING.md`.

### Missing Before Ideal Membrane

- Machine-readable ownership map:
  which side owns each concept and which concepts must never be defined twice.
- Machine-readable vocabulary map:
  reserved words, banned unqualified terms, replacements, and jurisdiction
  qualifiers.
- Machine-readable crossing map:
  Envelope to LogLine, LogLine to Envelope, and both to UI.
- Conflict rules:
  LogLine wins on consequence; Envelope wins on narrative/projection shape;
  projections rebuild when inconsistent with authority.
- Projection contract for the portal chief:
  intents, response blocks, source references, freshness, warnings, and
  affordances.
- Runtime tool boundary:
  `runtime_projection` first, then approved runtime actions later.
- Runtime source adapter:
  choose LogLine, Envelope, or mixed projection source; invoke the existing
  projection runtime; normalize the result; and return `cannot_do` limits.
- UI rendering schema:
  projection cards, attention cards, proposal cards, action buttons.
- Eve tool integration:
  keep `agent/tools/runtime_projection.ts` on the existing custom tool pattern,
  keep the chat renderer beside the current `save_memory` tool card, and add
  tests around both.
- Auth identity bridge:
  app user, Supabase user, LAB ID, grants, and Vercel Connect/MCP boundaries.
- Validation schema so future agents can inspect the membrane before acting.

### Deliverables

- `dream-machine-ownership.v0.yml`
- `dream-machine-vocabulary.v0.yml`
- `dream-machine-reference-map.v0.yml`
- `dream-machine-core-technologies.v0.yml`
- `dream-machine-crossing-map.v0.yml`
- `dream-machine-conflict-map.v0.yml`
- `dream-machine-projections.v0.yml`
- `dream-machine-projections.v0.schema.json`
- `dream-machine-actions.v0.yml`
- `dream-machine-portal-chief.v0.md`

## Vocabulary Detox Before Membrane

Status: required before machine-readable membrane.

The current LogLine and Envelope documents are structurally strong, but the
membrane must not inherit overloaded terms that cause jurisdiction drift.

Envelope sanitization comes first. Do not write the membrane over contaminated
vocabulary. Sanitize Envelope first; then define crossing.

Banned unqualified terms:

- `candidate`
- `admission`
- `admitted`
- `act`

Replacement law:

- LogLine does not have candidates.
- LogLine has registration, receipts, activation, grants, closure, and
  consequence.
- Envelope does not have candidates.
- Envelope has proposals, versions, confirmations, Board commits, findings, and
  projections.
- Envelope does not have LogLine Acts.
- Envelope has BoardActs / EnvelopeActs only.
- Board sealed or confirmed state is not LogLine registered consequence.
- UI approval is not LogLine authority.
- A membrane crossing package is not a receipt.

Required renames before schemas:

- `Candidate` -> `Proposal`
- `candidate_version_hash` -> `proposal_version_hash`
- `Admission` -> `Confirmation` / `Sealing` / `BoardCommit`
- `admitted` -> `sealed` / `confirmed` / `board_committed`
- `Act` -> `BoardAct` or `EnvelopeAct` inside Envelope
- `LogLine receipt candidate` -> `LogLine receipt proposal` or
  `translated receipt package`

Validator requirement:

Future membrane validators must fail any schema that uses `candidate`,
`admission`, `admitted`, or `act` without a jurisdiction-qualified owner and an
approved replacement.

## Attention Split

Attention cannot belong to only one side.

```text
Envelope attention
  role: salience
  authoritative: false

LogLine attention
  role: process-triggered obligation
  authoritative: true when registered by process

UI attention
  role: rendered interruption
  authoritative: false
  requires_affordance: true
```

The membrane needs an attention compatibility object because a projection
noticing something is not the same as the system being allowed to interrupt a
human.

## Risk Compatibility

Envelope currently has native risk tiers `L0-L4`. LogLine has `L0-L5`.

This is a membrane issue, not a cosmetic enum mismatch:

```text
Envelope may perceive and narrate L5.
Envelope may not authorize L5.
LogLine owns L5 authorization.
```

The UI must never show an effectful L5 button unless a LogLine grant package and
approval path are present.

## Cross-Cutting Rules

- Do not define the same concept twice.
- LogLine owns consequence.
- Envelope owns cognition and observability.
- The membrane owns crossing permissions.
- The UI owns rendering and human interaction.
- Projections are eyes, not truth.
- BoardActs / EnvelopeActs are envelope-canon unless translated into LogLine
  receipts.
- LogLine receipts are sovereign consequence once registered.
- Buttons are allowed only when backed by a declared affordance.
- Irreversible or dangerous actions must route through LogLine authority and
  approval.
- Projections inconsistent with authority are rebuilt; the system does not argue
  with truth.
- The UI may request, render, ask, approve, and explain.
- The UI may not register receipts, dispatch, close, or remember as authority.

## Readiness Sequence

0. Freeze vocabulary and ban overloaded terms.
1. Declare canonical doc sets for LogLine and Envelope.
2. Sanitize the Envelope / Board docs before membrane encoding:
   `BOARD SPEC`, `BOARD_DECISIONS`, `BOARD_OBJECTS`, `BOARD_LIFECYCLE`, and
   `BOARD_VERTICAL_SLICE`.
3. Write jurisdiction documents for LogLine and Envelope. Complete:
   `logline-jurisdiction.v0.yml`, `envelope-jurisdiction.v0.yml`.
4. Write the first machine-readable ownership map.
5. Write the vocabulary map. Complete: `dream-machine-vocabulary.v0.yml`.
6. Write the reference map between hashes and IDs. Complete:
   `dream-machine-reference-map.v0.yml`.
7. Write the Envelope-to-LogLine translation package. Complete:
   `envelope-proposal-to-logline-package.v0.yml`.
8. Scan existing projection runtimes. Complete:
   LogLine and Envelope both already have projection runtime surfaces; the UI
   does not yet have the portal bridge.
9. Declare the two crown technologies and quality bars. Complete:
   `dream-machine-core-technologies.v0.yml`.
10. Write the projection response contract. Complete:
   `dream-machine-projections.v0.yml`.
11. Write the action affordance contract. Complete:
   `dream-machine-actions.v0.yml`.
12. Add validators for the YAML contracts. Complete:
    `scripts/validate-dream-machine-contracts.mjs` and
    `pnpm contracts:validate`.
13. Harden `runtime_projection` in the Processual UI as a non-authoritative
    portal tool over the existing LogLine and Envelope projection runtimes.
    First tool/card surface exists; live-source correctness remains.
14. Harden the projection card renderer so it uses declared affordances only.
15. Add integration tests proving that the portal can request a projection but
    cannot register, dispatch, mutate either ledger, or authorize L5.

## Final Shape

```text
Dream-Machine-LogLine-Acts
  owns authority, process law, consequence, closure

Dream-Machine-Envelope-Ledger
  owns events, shifts, proposals, findings, dynamic projections

Membrane
  owns references, translations, crossing permissions, conflict rules

Dream-Machine-Processual-UI
  owns conversation, rendering, and human intervention
```

Deployable topology:

```text
Canyon
  Cloudflare Tunnel ingress / public mouth

Golden Bridge
  macOS execution / machine operations / preventive maintenance

Manhattan
  local inference / dynamic projection workbench
```

The ideal membrane is reached when each side can read the other's references
without claiming the other's jurisdiction.
