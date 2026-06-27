# Dynamic Projection Motor — design (v0)

Date: 2026-06-27 · Status: design, pending implementation plan · Home: `Dream-Machine-Processual-UI` (membrane / FACE)

The motor is the thing that lets an agent **ask anything about the processes, get a bounded
view assembled on demand, and keep asking** — without drowning. It is the "eyes" the rest of
the Dream Machine has been missing: the projection scaffolding (ladder, pin, loss, diff) exists
in both ledgers, but the *composition* (arbitrary question → assembled view) and the *attention
governor* (bounding the query space) do not. This spec defines them.

The user of this motor is the **LLM agent** (Eve, Sonnet 4.6). Every design choice optimizes
for LLM ergonomics: never guess, never drown, never over-claim from a narrow window.

## 1. Architecture & home

The motor is a read-only TS module in `Dream-Machine-Processual-UI/agent/` (the membrane). The
two kernels (LogLine Python, Envelope TS) stay pure — the motor never mutates them. Three pure,
independently-testable layers:

```
[LogLine: acts + runtime_queue (Py)]  ┐
                                       ├─► readers ─► composer ─► governor ─► Eve (dynamic tools + cards) ─► agent
[Envelope: shifts/findings/proj (TS)] ┘
```

- **Readers** (one per half): read raw variables. `loglineReader` (acts + `runtime_queue`),
  `envelopeReader` (shifts / findings / candidate state / projections). Today via the local
  sqlite bridge; later via the `/projection` HTTP endpoint (T-R1) behind the same interface.
- **Composer**: joins + derives reader output into views. Invents no data; only joins and computes.
- **Governor (attention)**: per step, decides which affordances and how much data the agent sees.

Hard boundary: the motor is strictly read-only. `cannot_do`: register a receipt, dispatch an
executor, mutate either ledger, authorize L5. Anything effectful is surfaced as a *proposal*
that crosses the airlock elsewhere — never executed by the motor (see §8).

## 2. Data model — the missing piece is the ProcessView (per-instance rollup)

The variables already exist on both sides; they are **sufficient but scattered**. The "andamento"
of one process is fragmented across `runtime_queue` (instance state) + the act(s) it produced +
`if_ok` (next step) + open `Finding`s + the `Shift` (who / how long). The motor materializes —
in memory, derived, non-authoritative — the object that does not exist today:

```
ProcessView {
  id                 // content_hash (LogLine) — the proof anchor
  instance           // runtime_queue.queue_id / source_hash
  process_id
  title              // gloss, or "did: this"

  // andamento (state of the running instance)
  state              // runtime_queue.status: queued|claimed|closed|failed|released
  flow { current,    // did / status
         next,       // if_ok
         doubt,      // if_doubt
         fail }      // if_not

  // who / waiting (derived)
  who, confirmed_by
  waiting_on         // derived: human | process | none
  since_ms           // derived: time in current state

  // derived health
  age_ms, attempts, stuck   // stuck = attempts>threshold or since_ms>SLA in a non-terminal state

  // risk
  risk               // danger_tier (contract) / ActSlots.risk

  // observability (Envelope side)
  open_findings []   // Finding{kind,severity} where resolved_at == null
  last_shift { actor, duration_ms, kind }
  event_zones        // counts of live/buffered/evaporated in the source window

  // provenance / proof (the cross-half link the pipe establishes)
  source_refs []     // content_hash ↔ board_act_hash ↔ shift_hash + input_hashes
}
```

Two composed views are built **from** the rollup, not instead of it:
- **cross-cutting**: e.g. "everything waiting on a human", "stuck", "L4+ in flight".
- **ladder**: raw → grouped → candidate, carrying `loss_accounting` as it ascends.

Why a rollup and not new stored columns: the verification found no missing data — only missing
joins and derived fields (age, waiting_on, stuck, per-instance link). Keeping it derived preserves
the kernels' purity and the projection law (non-authoritative, rebuildable from source hashes).

## 3. The Scene — dynamic affordances, intent-driven salience, the triad

A **Scene** is one bounded, reconstructible, intent-moved projection. Its job is to drop the
agent's need to guess to near zero.

### 3.1 Dynamic affordances (`legal_next_moves`) — mandatory

Every Scene return includes the operations legal **from that exact state**, derived from the
projection type, the visible objects, the process contract, and current permissions. The agent
never guesses a command or hallucinates an action. Read-only moves only (effectful ones live in
`proposals`, §8). Examples: `drill_down`, `open_evidence`, `compare_projection`, `ascend`,
`descend`, `explain_loss`, `back_to_parent`, `refresh_with_goal`.

This list is part of the operational contract, not UI decoration. Without it the LLM regresses to
trial-and-error.

### 3.2 Intent-driven salience

Salience has **no fixed global order**. What is salient depends on why the agent is looking. Every
Scene op accepts a natural-language `goal`; the governor uses it to rank, filter, and explain the
view. Natural language in; reproducible spec underneath.

When no `goal` is given, the fallback order applies — and it is *only* a safety default, not
permanent semantics:

```
stuck → waiting_on_human → risk → recency
```

### 3.3 The mandatory triad (every return)

1. **The bounded view** — items, order, filters, scope, limit visible now.
2. **What is NOT being seen** — explicit `loss_accounting`: how many fell outside, why, what order
   was applied, what classes were excluded. Load-bearing: it is the mechanism that stops the agent
   from making whole-universe claims from a narrow window (the Ghost Record sin). No silent caps.
3. **The legal next moves** — valid operations from this state, with minimal args and effect class.

### 3.4 Breadcrumb (custody, not just navigation)

Every return carries its lineage so the agent can ascend / back / compare / reconstruct without
re-deriving from chat memory: `projection_hash`, `parent_projection_hashes`, `root_scope_hash`,
`goal`, `op`, `created_at`.

### 3.5 Scene moves, context does not bloat

Each drill / filter / goal-change produces a **new** projection with lineage to the previous one.
The agent gets a fresh focal window, not an ever-growing pile of everything seen. This protects
the LLM's context window. Rule: *Scene moves. Context does not bloat. Lineage stays recoverable.*

### 3.6 Hybrid input

The op accepts NL intent but always resolves to a structured, hashable operation:

```json
{ "op": "scene.open", "goal": "mostra o que travou e o que precisa de mim",
  "scope": { "ledger": "lab", "process": "inbox" }, "limit": 10 }
```

`goal` drives salience; `op`/`scope`/`limit`/`selection` guarantee reproduction. The whole
transform is pinnable by hash.

## 4. The Scene Governor

Transforms intent + scope + ledger state into a bounded projection with legal next moves. It does
not declare truth; it builds a view, and it never hides that it is working through a window.

Responsibilities: (1) resolve `goal` into salience criteria; (2) select admitted sources via the
readers; (3) apply filters + limit; (4) compute `loss_accounting`; (5) generate `legal_next_moves`;
(6) emit breadcrumb + lineage; (7) pin the result as a reconstructible projection.

### 4.1 Contract

Request:

```json
{
  "op": "scene.open | scene.drill | scene.refresh | scene.back | scene.compare | scene.ascend | scene.descend",
  "goal": "natural language objective (optional)",
  "scope": { "ledger": "lab", "process": "inbox" },
  "parent_projection_hash": "sha256:... (optional)",
  "selection": { "filter": "status=stuck (optional)" },
  "limit": 10
}
```

Response (counts live ONLY in `loss_accounting`; `view.items.length` MUST equal
`loss_accounting.visible_count`; filters/order are declared once, in `view`):

```json
{
  "projection_hash": "sha256:...",
  "parent_projection_hashes": ["sha256:..."],
  "root_scope_hash": "sha256:...",
  "op": "scene.open",
  "goal": "...",
  "created_at": "2026-06-27T00:00:00Z",
  "view": {
    "items": [],
    "order": "intent_directed | fallback:stuck>waiting>risk>recency",
    "filters": {},
    "limit": 10
  },
  "loss_accounting": {
    "total_candidates": 0,
    "visible_count": 0,
    "omitted_count": 0,
    "omitted_reasons": [],
    "confidence_limits": []
  },
  "legal_next_moves": [],
  "proposals": [],
  "transform": {
    "source_hashes": [],
    "model": null,
    "prompt_hash": null,
    "params_hash": null,
    "transform_spec_hash": "sha256:..."
  }
}
```

## 5. Eve integration

The motor reaches the agent through Eve, using the template's richest primitive:

- **Dynamic tools** (`defineDynamic({ events })`): the toolset the agent sees reshapes per Scene
  state. At root it sees `scene.open`; after a `group`, per-group `descend:<group>` tools appear;
  `ascend`/`descend` appear by ladder level. The dynamic toolset **is** the affordance bound — the
  attention governor expressed as which tools exist right now. Eve's durable dynamic-tool metadata
  + deterministic replay aligns with the pin/lineage model (a Scene path replays).
- **Tool result → card**: each Scene response renders as a card (the `RuntimeProjection.vue`
  pattern) showing the view, the loss line, and the legal next moves as buttons.
- **Contract**: Scene responses normalize into `dream-machine-projections.v0` (jurisdiction,
  blocks, source_refs, freshness, warnings, affordances, cannot_do) so the existing portal pipe
  and validators still hold.

## 6. Reproducibility

Every Scene is a pinnable projection. `transform.transform_spec_hash` is the hash of the
deterministic operation (op + scope + selection + limit + resolved salience criteria + ordered
`source_hashes`). Given the same source hashes and transform spec, a Scene re-derives identically.
`goal` (the NL part) is recorded for explanation but the *ranking it resolves to* is captured in
the transform spec so reproduction does not depend on re-interpreting language. This maps onto the
existing `pin` (model/prompt/params/seed) + `input_hashes` + `parent_projection_hashes` fields.

## 7. Invariants

1. Every Scene has a limit.
2. Every Scene declares what fell outside (`loss_accounting`), never silently.
3. Every Scene offers `legal_next_moves`.
4. Every Scene has a `projection_hash` and a `transform_spec_hash`.
5. Every Scene carries `parent_projection_hashes` (may be empty) + breadcrumb.
6. Salience is intent-driven when `goal` is present; the global order is fallback only.
7. `view.items.length == loss_accounting.visible_count`; `total_candidates == visible_count + omitted_count`.
8. Filters and order are declared once (in `view`); other sections reference, never re-declare.
9. No Scene is a source of truth — it is a reconstructible projection; a Scene inconsistent with
   the ledger is rebuilt, not argued with.
10. No Scene executes an external/irreversible effect. Effectful intents go to `proposals` for the airlock.
11. Drill moves focus; it does not accumulate context.

## 8. Non-authority & the airlock boundary

The Scene is read-only. Moves that would cross the membrane (request human approval, route to a
process, create a candidate act, mark waiting) are **not** `legal_next_moves`. They appear in a
separate `proposals` array as *effect intents* the agent can choose to raise — each one must then
pass through the airlock (human/grant/L4-L5 path) and be registered as consequence by the proper
authority. The Scene suggests; it never acts.

```json
"proposals": [
  { "intent": "request_human_approval",
    "label": "Pedir aprovação humana para os itens waiting_on_human",
    "reason": "3 itens aguardam decisão do operador.",
    "effect_class": "reversible",
    "airlock": "human-approval",
    "args": { "target": "waiting_on_human" } }
]
```

`effect_class ∈ none | reversible | compensable | irreversible`. The Scene populates `proposals`;
it never fulfills them.

## 9. Worked example (internally consistent)

Goal: "o que travou e o que precisa de mim", scope `lab.inbox`. 12 candidates, 3 shown, 9 omitted
(`items.length == visible_count == 3`; `total == visible + omitted == 12`):

```json
{
  "projection_hash": "sha256:scene_abc",
  "parent_projection_hashes": ["sha256:scene_root"],
  "root_scope_hash": "sha256:lab.inbox",
  "op": "scene.open",
  "goal": "o que travou e o que precisa de mim",
  "created_at": "2026-06-27T12:00:00Z",
  "view": {
    "items": [
      { "id": "sha256:act_001", "instance": "q_88", "process_id": "inbox-route.v1",
        "title": "Inbox routing stalled",
        "state": "claimed",
        "flow": { "current": "route/open", "next": "memory-register.v1", "doubt": "attention-raise.v1", "fail": "stop" },
        "waiting_on": "human", "since_ms": 93000000,
        "age_ms": 93000000, "attempts": 3, "stuck": true,
        "risk": "L2",
        "open_findings": [{ "kind": "attention_anomaly", "severity": "warn" }],
        "last_shift": { "actor": "chief_of_staff", "duration_ms": 1200, "kind": "condensation" },
        "salience_reason": "stuck + waiting_on_human (matches goal)",
        "source_refs": ["sha256:act_001", "sha256:board_001", "sha256:shift_001"] },

      { "id": "sha256:act_014", "instance": "q_91", "process_id": "oauth-client.v1",
        "title": "oauth-client awaiting grant",
        "state": "queued",
        "flow": { "current": "register/open", "next": "memory-register.v1", "doubt": "attention-raise.v1", "fail": "stop" },
        "waiting_on": "human", "since_ms": 5400000,
        "age_ms": 5400000, "attempts": 0, "stuck": false,
        "risk": "L3",
        "open_findings": [],
        "last_shift": { "actor": "dan@minilab.work", "duration_ms": 0, "kind": "observation" },
        "salience_reason": "waiting_on_human + risk L3",
        "source_refs": ["sha256:act_014", "sha256:board_014"] },

      { "id": "sha256:act_022", "instance": "q_77", "process_id": "evidence-closure.v1",
        "title": "evidence-closure failed twice",
        "state": "failed",
        "flow": { "current": "close/open", "next": "memory-register.v1", "doubt": "attention-raise.v1", "fail": "stop" },
        "waiting_on": "process", "since_ms": 260000000,
        "age_ms": 260000000, "attempts": 2, "stuck": true,
        "risk": "L1",
        "open_findings": [{ "kind": "evidence_incomplete", "severity": "error" }],
        "last_shift": { "actor": "executor", "duration_ms": 800, "kind": "execution" },
        "salience_reason": "stuck (failed)",
        "source_refs": ["sha256:act_022"] }
    ],
    "order": "intent_directed: stuck, then waiting_on_human (oldest first)",
    "filters": { "scope": "lab.inbox", "state": ["claimed", "queued", "failed"] },
    "limit": 10
  },
  "loss_accounting": {
    "total_candidates": 12,
    "visible_count": 3,
    "omitted_count": 9,
    "omitted_reasons": ["lower salience for current goal", "completed low-risk items excluded", "limit=10 not reached but goal-ranked cutoff applied"],
    "confidence_limits": ["Supports claims about these 3 goal-ranked items only, not all 12 in lab.inbox."]
  },
  "legal_next_moves": [
    { "move": "drill_down", "label": "Abrir o item travado q_88", "reason": "1 item stuck na view.",
      "args": { "focus": "sha256:act_001" }, "effect_class": "none", "requires_confirmation": false },
    { "move": "explain_loss", "label": "Explicar os 9 omitidos", "reason": "Vendo 3 de 12.",
      "args": { "projection_hash": "sha256:scene_abc" }, "effect_class": "none", "requires_confirmation": false },
    { "move": "back_to_parent", "label": "Voltar", "reason": "Subir um nível.",
      "args": { "projection_hash": "sha256:scene_root" }, "effect_class": "none", "requires_confirmation": false }
  ],
  "proposals": [
    { "intent": "request_human_approval", "label": "Pedir decisão humana para q_88 e q_91",
      "reason": "2 itens waiting_on_human.", "effect_class": "reversible", "airlock": "human-approval",
      "args": { "targets": ["q_88", "q_91"] } }
  ],
  "transform": {
    "source_hashes": ["sha256:logline_slice_inbox", "sha256:queue_slice_inbox", "sha256:envelope_findings_inbox"],
    "model": "local-ranker",
    "prompt_hash": "sha256:scene_ranker_prompt",
    "params_hash": "sha256:params",
    "transform_spec_hash": "sha256:scene_transform_v0"
  }
}
```

## 10. Acceptance criteria

A Scene response is valid when it: contains `view`, `loss_accounting`, `legal_next_moves`,
`projection_hash`, `parent_projection_hashes` (possibly empty), and `transform.transform_spec_hash`;
states the order applied; reports `total_candidates`, `visible_count`, `omitted_count` with
`visible_count == view.items.length` and `total_candidates == visible_count + omitted_count`;
never claims about the whole universe without declaring scope; never lists a move the current state
disallows; never executes an external effect (effectful intents only in `proposals`).

## 11. Testing

- **Composer unit tests**: ProcessView rollup joins queue+acts+findings+shift correctly; derived
  fields (age, waiting_on, stuck) computed from known fixtures; provenance link (content_hash ↔
  board_act_hash) preserved.
- **Governor unit tests**: intent-driven ranking changes order for different goals; fallback order
  used when no goal; `loss_accounting` arithmetic invariant (§7) holds; no silent truncation
  (omitted always accounted); `legal_next_moves` only legal-from-state.
- **Reproducibility test**: same source hashes + transform spec → identical `projection_hash`.
- **Boundary test**: no Scene response ever contains an effectful `legal_next_moves`; effectful
  intents appear only in `proposals`; `cannot_do` holds.
- **Eve integration test**: a Scene op through the dynamic tool returns a contract-valid projection
  that renders as a card; the agent can drill via the returned legal moves.
- **End-to-end (ties to T-P2)**: open the UI → ask "what's stuck and waiting on me?" → the agent
  gets a correct, bounded ProcessView against the real seeded ledgers and can drill.

## 12. Out of scope (v0)

- The `/projection` HTTP endpoint (T-R1) — v0 uses the local bridge readers behind the reader
  interface; the endpoint swaps in later without changing the composer/governor.
- The airlock implementation itself (effect crossing) — v0 only *emits* proposals; fulfilling them
  is the OAuth-crossing / effect work (T-R2), separate.
- Persisting Scenes to a store — v0 Scenes are in-memory derived projections, pinned by hash;
  durable Scene storage is a later concern if needed.

## 13. Open questions

- The exact default SLA / `stuck` thresholds (age, attempts) per danger tier — propose per-tier
  defaults in the plan, confirm with Dan.
- Whether `ascend`/`descend` ladder steps reuse the Envelope `diffProjections` for `compare`, or
  the composer computes deltas over ProcessViews directly.
