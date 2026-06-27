# Dynamic Projection Motor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the read-only Dynamic Projection Motor — a membrane composer that turns an agent's goal into a bounded, reproducible ProcessView Scene (process state + andamento) over the LogLine and Envelope ledgers, with intent-driven salience, honest loss accounting, and legal next moves.

**Architecture:** A pure TS core in `Dream-Machine-Processual-UI/agent/lib/scene/` — `readers` (read raw rows from both ledgers via the python bridge), `compose` (join rows into ProcessViews), `governor` (rank by goal, bound the window, compute loss + legal moves), `scene` (orchestrate + freshness/warnings). The kernels stay pure; the motor is strictly read-only. Wired to the Eve agent as a tool; supersedes `runtime_projection`'s 10 fixed intents.

**Tech Stack:** TypeScript (ESM, `.ts` with `node:test`), zod (validation), the existing python sqlite bridge (`scripts/runtime-projection-local.py`), Eve tools. Spec: `docs/superpowers/specs/2026-06-27-dynamic-projection-motor-design.md`.

---

## File Structure

- `shared/tools/scene.ts` — **create.** All Scene types: `ProcessView`, `SceneRequest`, `SceneResponse`, `SceneView`, `LossAccounting`, `Freshness`, `LegalNextMove`, `Proposal`, `SceneTransform`, the `SCENE_OPS` const, the `SALIENCE_CRITERIA` vocabulary. One file, types only.
- `agent/lib/scene/compose.ts` — **create.** `composeProcessViews(rows): ProcessView[]` — pure join of raw ledger rows into ProcessViews, including derived fields (age, waiting_on, stuck).
- `agent/lib/scene/governor.ts` — **create.** `resolveSalience(goal): RankingProfile`, `rankAndBound(views, profile, limit): {items, loss}`, `legalMoves(state): LegalNextMove[]`, `proposals(views): Proposal[]`.
- `agent/lib/scene/readers.ts` — **create.** `readLogline(scope)`, `readEnvelope(scope)` — thin wrappers shelling the python bridge `rows` mode; return typed row arrays. Behind a `SceneReaders` interface so the `/projection` endpoint can replace them later.
- `agent/lib/scene/scene.ts` — **create.** `assembleScene(req, readers): SceneResponse` — orchestrates routing → readers → compose → governor → freshness/warnings → transform/hashes.
- `scripts/runtime-projection-local.py` — **modify.** Add a `rows` mode emitting raw ProcessView source rows (acts+queue from logline, findings+candidate+shift from envelope) as JSON.
- `agent/tools/scene.ts` — **create.** Eve tool exposing the Scene ops; read-only; normalizes to `dream-machine-projections.v0`.
- `app/components/chat/tool/Scene.vue` — **create.** Card rendering the view + loss line + legal-move buttons (mirrors `RuntimeProjection.vue`).
- `tests/scene-compose.test.ts`, `tests/scene-governor.test.ts`, `tests/scene-assemble.test.ts` — **create.**
- `scripts/run-tests.mjs` — **create.** Generic runner: esbuild-bundle + `node --test` for every `tests/*.test.ts` (generalizes `scripts/test-runtime-projection.mjs`).
- `package.json` — **modify.** Add `"test": "node scripts/run-tests.mjs"`.

---

## Task 0: Generic test runner

**Files:**
- Create: `scripts/run-tests.mjs`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Write the generic runner**

Create `scripts/run-tests.mjs`:

```js
import { readdirSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const esbuild = join(root, "node_modules/.pnpm/node_modules/.bin/esbuild");
if (!existsSync(esbuild)) throw new Error("esbuild wrapper not found");

const testsDir = join(root, "tests");
const outdir = join(root, ".tmp/tests");
mkdirSync(outdir, { recursive: true });

const files = readdirSync(testsDir).filter((f) => f.endsWith(".test.ts"));
if (files.length === 0) throw new Error("no tests found");

const outfiles = [];
for (const f of files) {
  const outfile = join(outdir, f.replace(/\.ts$/, ".mjs"));
  execFileSync(esbuild, ["--bundle", join(testsDir, f), "--platform=node", "--format=esm", `--outfile=${outfile}`], { cwd: root, stdio: "inherit" });
  outfiles.push(outfile);
}
execFileSync(process.execPath, ["--test", ...outfiles], { cwd: root, stdio: "inherit" });
```

- [ ] **Step 2: Add the script to package.json**

In `package.json` `scripts`, add:

```json
"test": "node scripts/run-tests.mjs",
```

- [ ] **Step 3: Run it to confirm the existing test still passes**

Run: `pnpm test`
Expected: PASS — the existing `tests/projection-normalizer.test.ts` runs and passes via the generic runner.

- [ ] **Step 4: Commit**

```bash
git add scripts/run-tests.mjs package.json
git commit -m "test: generic node:test runner over all tests/*.test.ts"
```

---

## Task 1: Scene types

**Files:**
- Create: `shared/tools/scene.ts`

- [ ] **Step 1: Write the types**

Create `shared/tools/scene.ts`:

```ts
// Read-only Dynamic Projection Motor (Scene) types.
// Spec: docs/superpowers/specs/2026-06-27-dynamic-projection-motor-design.md

export const SCENE_OPS = [
  "scene.open", "scene.drill", "scene.group", "scene.filter",
  "scene.ascend", "scene.descend", "scene.compare", "scene.refresh",
  "scene.back", "scene.explain_loss", "scene.open_evidence",
] as const;
export type SceneOp = (typeof SCENE_OPS)[number];

export const SALIENCE_CRITERIA = [
  "stuck", "waiting_on_human", "risk", "recency", "age", "severity", "blast_radius",
] as const;
export type SalienceCriterion = (typeof SALIENCE_CRITERIA)[number];
export type RankingProfile = SalienceCriterion[]; // ordered, highest-priority first

export type EffectClass = "none" | "reversible" | "compensable" | "irreversible";
export type WaitingOn = "human" | "process" | "none";
export type RiskTier = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";

export type ProcessFlow = { current: string; next: string | null; doubt: string | null; fail: string | null };
export type LastShift = { actor: string; duration_ms: number; kind: string } | null;
export type OpenFinding = { kind: string; severity: string };

export type ProcessView = {
  id: string;            // logline content_hash — proof anchor
  instance: string;      // runtime_queue.queue_id / source_hash
  process_id: string;
  title: string;
  state: string;         // queue status: queued|claimed|closed|failed|released, or "" if no queue row
  flow: ProcessFlow;
  who: string;
  confirmed_by: string;
  waiting_on: WaitingOn;
  since_ms: number;      // time in current state
  age_ms: number;
  attempts: number;
  stuck: boolean;
  risk: RiskTier;
  open_findings: OpenFinding[];
  last_shift: LastShift;
  event_zones: { live: number; buffered: number; evaporated: number };
  source_refs: string[]; // content_hash / board_act_hash / shift_hash
};

export type Freshness = {
  generated_at: string;
  as_of: string;
  stale: boolean;
  ttl_ms: number | null;
  source_watermark: { logline_seq: number; envelope_seq: number };
};

export type SceneView = {
  items: ProcessView[];
  order: string;
  filters: Record<string, unknown>;
  limit: number;
};

export type LossAccounting = {
  total_candidates: number;
  visible_count: number;
  omitted_count: number;
  omitted_reasons: string[];
  confidence_limits: string[];
};

export type LegalNextMove = {
  move: SceneOp;
  label: string;
  reason: string;
  args: Record<string, unknown>;
  effect_class: "none";        // read-only moves are always "none"
  requires_confirmation: false;
};

export type Proposal = {
  intent: string;
  label: string;
  reason: string;
  effect_class: EffectClass;
  airlock: string;
  args: Record<string, unknown>;
};

export type SceneWarning = {
  kind: "partial_source" | "scope_not_found" | "stale" | "mixed_jurisdiction";
  source?: "logline" | "envelope";
  message?: string;
};

export type SceneTransform = {
  source_hashes: string[];
  model: string | null;
  prompt_hash: string | null;
  params_hash: string | null;
  resolved_salience: string[];
  transform_spec_hash: string;
};

export type SceneScope = {
  ledger?: string;
  process?: string;
  process_id?: string;
  content_hash?: string;
  stream_id?: string;
};

export type SceneRequest = {
  op: SceneOp;
  goal?: string;
  scope: SceneScope;
  parent_projection_hash?: string;
  selection?: { filter?: string; group_by?: string; focus?: string };
  as_of?: string;
  limit?: number;
};

export type SceneResponse = {
  projection_hash: string;
  parent_projection_hashes: string[];
  root_scope_hash: string;
  op: SceneOp;
  goal?: string;
  created_at: string;
  freshness: Freshness;
  warnings: SceneWarning[];
  view: SceneView;
  loss_accounting: LossAccounting;
  legal_next_moves: LegalNextMove[];
  proposals: Proposal[];
  transform: SceneTransform;
};

// Raw rows the readers return (the composer's input).
export type LoglineActRow = {
  content_hash: string; who: string; did: string; this: string;
  if_ok: string; if_doubt: string; if_not: string; status: string;
  confirmed_by: string; inserted_at: string;
};
export type QueueRow = {
  queue_id: string; source_hash: string; process_id: string; status: string;
  attempts: number; claimed_by: string | null; created_at: string; updated_at: string;
  result_hash: string | null; last_error: string | null;
};
export type FindingRow = { finding_id: string; kind: string; severity: string; refs: string[]; resolved_at: number | null };
export type ShiftRow = { input_hash: string; actor: string; duration_ms: number; kind: string; closed_at: number };
export type SceneRawRows = {
  logline_acts: LoglineActRow[];
  queue: QueueRow[];
  findings: FindingRow[];
  shifts: ShiftRow[];
  watermark: { logline_seq: number; envelope_seq: number };
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (types compile; no consumers yet).

- [ ] **Step 3: Commit**

```bash
git add shared/tools/scene.ts
git commit -m "feat(scene): Scene/ProcessView types"
```

---

## Task 2: ProcessView composer (derived fields)

**Files:**
- Create: `agent/lib/scene/compose.ts`
- Test: `tests/scene-compose.test.ts`

Constants: `STUCK_ATTEMPTS = 2` (≥ this in a non-terminal state ⇒ stuck); `STUCK_AGE_MS` per tier: L0/L1 = 1h, L2 = 30m, L3 = 15m, L4/L5 = 5m. `NOW` is injected (no `Date.now()` in pure logic — pass a clock) so tests are deterministic.

- [ ] **Step 1: Write the failing test**

Create `tests/scene-compose.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { composeProcessViews } from "../agent/lib/scene/compose.ts";
import type { SceneRawRows } from "../shared/tools/scene.ts";

const NOW = 1_700_000_000_000;

const rows: SceneRawRows = {
  logline_acts: [
    { content_hash: "h1", who: "cos", did: "route", this: "inbox", if_ok: "memory-register.v1", if_doubt: "attention-raise.v1", if_not: "stop", status: "open", confirmed_by: "dan", inserted_at: "2026-06-26T00:00:00.000Z" },
  ],
  queue: [
    { queue_id: "q1", source_hash: "h1", process_id: "inbox-route.v1", status: "claimed", attempts: 3, claimed_by: "cos", created_at: "2026-06-26T00:00:00.000Z", updated_at: "2026-06-26T00:00:00.000Z", result_hash: null, last_error: null },
  ],
  findings: [
    { finding_id: "f1", kind: "attention_anomaly", severity: "warn", refs: ["h1"], resolved_at: null },
    { finding_id: "f2", kind: "old", severity: "info", refs: ["h1"], resolved_at: 123 },
  ],
  shifts: [
    { input_hash: "h1", actor: "cos", duration_ms: 1200, kind: "condensation", closed_at: NOW - 1000 },
  ],
  watermark: { logline_seq: 1, envelope_seq: 1 },
};

test("composeProcessViews joins queue+act+findings+shift into one ProcessView", () => {
  const views = composeProcessViews(rows, { now: NOW, riskByProcess: { "inbox-route.v1": "L2" } });
  assert.equal(views.length, 1);
  const v = views[0];
  assert.equal(v.id, "h1");
  assert.equal(v.instance, "q1");
  assert.equal(v.process_id, "inbox-route.v1");
  assert.equal(v.state, "claimed");
  assert.deepEqual(v.flow, { current: "route/open", next: "memory-register.v1", doubt: "attention-raise.v1", fail: "stop" });
  assert.equal(v.risk, "L2");
  // only unresolved findings:
  assert.deepEqual(v.open_findings, [{ kind: "attention_anomaly", severity: "warn" }]);
  assert.equal(v.last_shift?.duration_ms, 1200);
  assert.deepEqual(v.source_refs.includes("h1"), true);
});

test("stuck is derived: attempts>=2 in a non-terminal state", () => {
  const views = composeProcessViews(rows, { now: NOW, riskByProcess: { "inbox-route.v1": "L2" } });
  assert.equal(views[0].stuck, true);
});

test("a closed/terminal queue state is never stuck", () => {
  const closed: SceneRawRows = { ...rows, queue: [{ ...rows.queue[0], status: "closed", attempts: 9 }] };
  const views = composeProcessViews(closed, { now: NOW, riskByProcess: { "inbox-route.v1": "L2" } });
  assert.equal(views[0].stuck, false);
});

test("waiting_on derives human when status open and confirmed_by present", () => {
  const views = composeProcessViews(rows, { now: NOW, riskByProcess: {} });
  assert.equal(views[0].waiting_on, "human");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `composeProcessViews` not found.

- [ ] **Step 3: Write the composer**

Create `agent/lib/scene/compose.ts`:

```ts
import type { SceneRawRows, ProcessView, RiskTier, WaitingOn, OpenFinding } from "../../../shared/tools/scene.ts";

const TERMINAL = new Set(["closed", "released"]);
const STUCK_ATTEMPTS = 2;
const STUCK_AGE_MS: Record<RiskTier, number> = {
  L0: 3_600_000, L1: 3_600_000, L2: 1_800_000, L3: 900_000, L4: 300_000, L5: 300_000,
};

export type ComposeOpts = { now: number; riskByProcess: Record<string, RiskTier> };

function ms(iso: string): number { return Date.parse(iso); }

function deriveWaiting(status: string, confirmedBy: string, queueState: string): WaitingOn {
  if (TERMINAL.has(queueState)) return "none";
  if (status === "open" && confirmedBy) return "human";
  if (queueState === "queued" || queueState === "claimed") return "process";
  return "none";
}

export function composeProcessViews(rows: SceneRawRows, opts: ComposeOpts): ProcessView[] {
  const findingsByRef = new Map<string, OpenFinding[]>();
  for (const f of rows.findings) {
    if (f.resolved_at !== null) continue;
    for (const ref of f.refs) {
      const list = findingsByRef.get(ref) ?? [];
      list.push({ kind: f.kind, severity: f.severity });
      findingsByRef.set(ref, list);
    }
  }
  const shiftByHash = new Map(rows.shifts.map((s) => [s.input_hash, s]));
  const queueByHash = new Map(rows.queue.map((q) => [q.source_hash, q]));

  return rows.logline_acts.map((act) => {
    const q = queueByHash.get(act.content_hash);
    const queueState = q?.status ?? "";
    const risk = opts.riskByProcess[q?.process_id ?? ""] ?? "L1";
    const sinceMs = q ? opts.now - ms(q.updated_at) : opts.now - ms(act.inserted_at);
    const ageMs = opts.now - ms(act.inserted_at);
    const attempts = q?.attempts ?? 0;
    const stuck = !TERMINAL.has(queueState) && queueState !== "" &&
      (attempts >= STUCK_ATTEMPTS || sinceMs > STUCK_AGE_MS[risk]);
    const shift = shiftByHash.get(act.content_hash) ?? null;
    return {
      id: act.content_hash,
      instance: q?.queue_id ?? act.content_hash,
      process_id: q?.process_id ?? act.if_ok ?? "unknown",
      title: act.this ? `${act.did}: ${act.this}` : act.did,
      state: queueState,
      flow: {
        current: `${act.did}/${act.status}`,
        next: act.if_ok || null,
        doubt: act.if_doubt || null,
        fail: act.if_not || null,
      },
      who: act.who,
      confirmed_by: act.confirmed_by,
      waiting_on: deriveWaiting(act.status, act.confirmed_by, queueState),
      since_ms: sinceMs,
      age_ms: ageMs,
      attempts,
      stuck,
      risk,
      open_findings: findingsByRef.get(act.content_hash) ?? [],
      last_shift: shift ? { actor: shift.actor, duration_ms: shift.duration_ms, kind: shift.kind } : null,
      event_zones: { live: 0, buffered: 0, evaporated: 0 },
      source_refs: [act.content_hash, ...(shift ? [shift.input_hash] : [])].filter((v, i, a) => a.indexOf(v) === i),
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS (4 compose tests).

- [ ] **Step 5: Commit**

```bash
git add agent/lib/scene/compose.ts tests/scene-compose.test.ts
git commit -m "feat(scene): ProcessView composer with derived age/waiting/stuck"
```

---

## Task 3: Governor — salience resolver

**Files:**
- Create: `agent/lib/scene/governor.ts`
- Test: `tests/scene-governor.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/scene-governor.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { resolveSalience } from "../agent/lib/scene/governor.ts";

test("goal mentioning travado/stuck ranks stuck first", () => {
  assert.deepEqual(resolveSalience("o que travou?")[0], "stuck");
});

test("goal mentioning approval/aprovação ranks waiting_on_human first", () => {
  assert.deepEqual(resolveSalience("o que precisa da minha aprovação")[0], "waiting_on_human");
});

test("goal mentioning risk ranks risk first", () => {
  assert.deepEqual(resolveSalience("qual risco pode escapar")[0], "risk");
});

test("no goal returns the fallback profile", () => {
  assert.deepEqual(resolveSalience(undefined), ["stuck", "waiting_on_human", "risk", "recency"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `resolveSalience` not found.

- [ ] **Step 3: Write the resolver**

Create `agent/lib/scene/governor.ts` (resolver section):

```ts
import type { RankingProfile, SalienceCriterion } from "../../../shared/tools/scene.ts";

const FALLBACK: RankingProfile = ["stuck", "waiting_on_human", "risk", "recency"];

// Deterministic keyword → criterion mapping. The agent (an LLM) supplies the
// intelligence in `goal`; this only routes it. No model call.
const HINTS: Array<{ re: RegExp; crit: SalienceCriterion }> = [
  { re: /trav|stuck|parad|emperr|fail|falh/i, crit: "stuck" },
  { re: /aprova|approval|esperando|waiting|precisa de mim|minha/i, crit: "waiting_on_human" },
  { re: /risc|risk|perig|danger|escap|blast/i, crit: "risk" },
  { re: /mud|chang|recent|ontem|hoje|novo|delta/i, crit: "recency" },
  { re: /antig|old|age|idade|tempo/i, crit: "age" },
  { re: /sever|grav|critical|cr[ií]tic/i, crit: "severity" },
];

export function resolveSalience(goal: string | undefined): RankingProfile {
  if (!goal || !goal.trim()) return [...FALLBACK];
  const hit: SalienceCriterion[] = [];
  for (const { re, crit } of HINTS) {
    if (re.test(goal) && !hit.includes(crit)) hit.push(crit);
  }
  if (hit.length === 0) return [...FALLBACK];
  // append fallback criteria not already chosen, for tie-breaking
  for (const c of FALLBACK) if (!hit.includes(c)) hit.push(c);
  return hit;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add agent/lib/scene/governor.ts tests/scene-governor.test.ts
git commit -m "feat(scene): deterministic intent-driven salience resolver"
```

---

## Task 4: Governor — rank, bound, and loss accounting

**Files:**
- Modify: `agent/lib/scene/governor.ts`
- Modify: `tests/scene-governor.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `tests/scene-governor.test.ts`:

```ts
import { rankAndBound } from "../agent/lib/scene/governor.ts";
import type { ProcessView } from "../shared/tools/scene.ts";

function pv(over: Partial<ProcessView>): ProcessView {
  return {
    id: "x", instance: "x", process_id: "p", title: "t", state: "queued",
    flow: { current: "c", next: null, doubt: null, fail: null },
    who: "w", confirmed_by: "", waiting_on: "none", since_ms: 0, age_ms: 0,
    attempts: 0, stuck: false, risk: "L1", open_findings: [], last_shift: null,
    event_zones: { live: 0, buffered: 0, evaporated: 0 }, source_refs: ["x"], ...over,
  };
}

test("rankAndBound: stuck-first profile surfaces stuck within the limit and accounts the rest", () => {
  const views = [
    pv({ id: "a", stuck: false, waiting_on: "none" }),
    pv({ id: "b", stuck: true }),
    pv({ id: "c", stuck: false, waiting_on: "human" }),
  ];
  const { items, loss } = rankAndBound(views, ["stuck", "waiting_on_human", "risk", "recency"], 2);
  assert.equal(items[0].id, "b");          // stuck first
  assert.equal(items.length, 2);           // limit honored
  assert.equal(loss.total_candidates, 3);
  assert.equal(loss.visible_count, 2);
  assert.equal(loss.omitted_count, 1);     // invariant: total == visible + omitted
  assert.ok(loss.confidence_limits[0].includes("2"));
});

test("rankAndBound never silently truncates: omitted_reasons explains the cut", () => {
  const views = [pv({ id: "a" }), pv({ id: "b" }), pv({ id: "c" })];
  const { loss } = rankAndBound(views, ["recency"], 1);
  assert.equal(loss.omitted_count, 2);
  assert.ok(loss.omitted_reasons.length > 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `rankAndBound` not found.

- [ ] **Step 3: Implement rankAndBound**

Append to `agent/lib/scene/governor.ts`:

```ts
import type { ProcessView, LossAccounting, SalienceCriterion } from "../../../shared/tools/scene.ts";

const RISK_RANK: Record<string, number> = { L0: 0, L1: 1, L2: 2, L3: 3, L4: 4, L5: 5 };

function score(v: ProcessView, crit: SalienceCriterion): number {
  switch (crit) {
    case "stuck": return v.stuck ? 1 : 0;
    case "waiting_on_human": return v.waiting_on === "human" ? 1 : 0;
    case "risk": return RISK_RANK[v.risk] ?? 0;
    case "recency": return v.age_ms; // larger age = older; for recency we invert below
    case "age": return v.age_ms;
    case "severity": return v.open_findings.some((f) => f.severity === "error") ? 2 : v.open_findings.length ? 1 : 0;
    case "blast_radius": return v.open_findings.length + (RISK_RANK[v.risk] ?? 0);
    default: return 0;
  }
}

export function rankAndBound(
  views: ProcessView[],
  profile: SalienceCriterion[],
  limit: number,
): { items: ProcessView[]; loss: LossAccounting } {
  const ranked = [...views].sort((a, b) => {
    for (const crit of profile) {
      let sa = score(a, crit);
      let sb = score(b, crit);
      if (crit === "recency") { sa = -sa; sb = -sb; } // most recent (smallest age) first
      if (sb !== sa) return sb - sa;
    }
    return 0;
  });
  const items = ranked.slice(0, limit);
  const omitted = ranked.length - items.length;
  const loss: LossAccounting = {
    total_candidates: views.length,
    visible_count: items.length,
    omitted_count: omitted,
    omitted_reasons: omitted > 0
      ? [`limit=${limit}`, `lower salience for profile [${profile.join(", ")}]`]
      : [],
    confidence_limits: [
      `Supports claims about these ${items.length} ranked items only, not all ${views.length}.`,
    ],
  };
  return { items, loss };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add agent/lib/scene/governor.ts tests/scene-governor.test.ts
git commit -m "feat(scene): rank + bound + honest loss accounting"
```

---

## Task 5: Governor — legal moves and proposals

**Files:**
- Modify: `agent/lib/scene/governor.ts`
- Modify: `tests/scene-governor.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `tests/scene-governor.test.ts`:

```ts
import { legalMoves, proposals } from "../agent/lib/scene/governor.ts";

test("legalMoves at an open scene with items offers read-only drill/explain/back only", () => {
  const moves = legalMoves({ op: "scene.open", hasItems: true, hasParent: true, omitted: 5, focused: false });
  const names = moves.map((m) => m.move);
  assert.ok(names.includes("scene.drill"));
  assert.ok(names.includes("scene.explain_loss"));
  assert.ok(names.includes("scene.back"));
  // every move is read-only:
  assert.ok(moves.every((m) => m.effect_class === "none" && m.requires_confirmation === false));
});

test("explain_loss only offered when something was omitted", () => {
  const moves = legalMoves({ op: "scene.open", hasItems: true, hasParent: false, omitted: 0, focused: false });
  assert.ok(!moves.map((m) => m.move).includes("scene.explain_loss"));
});

test("proposals surface effectful intents for waiting_on_human items, never as legal moves", () => {
  const ps = proposals([pv({ waiting_on: "human", instance: "q9" })]);
  assert.equal(ps.length, 1);
  assert.equal(ps[0].intent, "request_human_approval");
  assert.ok(ps[0].effect_class !== "none");
  assert.equal(ps[0].airlock, "human-approval");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `legalMoves`/`proposals` not found.

- [ ] **Step 3: Implement legalMoves + proposals**

Append to `agent/lib/scene/governor.ts`:

```ts
import type { LegalNextMove, Proposal } from "../../../shared/tools/scene.ts";

export type SceneState = {
  op: string; hasItems: boolean; hasParent: boolean; omitted: number; focused: boolean;
};

export function legalMoves(s: SceneState): LegalNextMove[] {
  const m: LegalNextMove[] = [];
  const add = (move: LegalNextMove["move"], label: string, reason: string, args: Record<string, unknown> = {}) =>
    m.push({ move, label, reason, args, effect_class: "none", requires_confirmation: false });

  if (s.hasItems && !s.focused) add("scene.drill", "Abrir um item", "Há itens na view.");
  if (s.hasItems) add("scene.group", "Agrupar", "Resumir por dimensão.");
  add("scene.refresh", "Atualizar com novo objetivo", "Reconsultar com outro goal.");
  if (s.omitted > 0) add("scene.explain_loss", `Explicar os ${s.omitted} omitidos`, "A view é parcial.", { projection_hash: "self" });
  if (s.focused) add("scene.open_evidence", "Ver a prova", "Abrir os source refs do item.");
  if (s.hasParent) add("scene.back", "Voltar", "Subir um nível.");
  return m;
}

export function proposals(views: ProcessView[]): Proposal[] {
  const waiting = views.filter((v) => v.waiting_on === "human");
  if (waiting.length === 0) return [];
  return [{
    intent: "request_human_approval",
    label: `Pedir decisão humana para ${waiting.length} item(s)`,
    reason: `${waiting.length} item(s) waiting_on_human.`,
    effect_class: "reversible",
    airlock: "human-approval",
    args: { targets: waiting.map((v) => v.instance) },
  }];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add agent/lib/scene/governor.ts tests/scene-governor.test.ts
git commit -m "feat(scene): legal next moves (read-only) + effectful proposals to airlock"
```

---

## Task 6: Python bridge — `rows` mode

**Files:**
- Modify: `scripts/runtime-projection-local.py`

- [ ] **Step 1: Add a `rows` mode**

In `scripts/runtime-projection-local.py`, add a branch so `python3 scripts/runtime-projection-local.py rows <loglineDb> <envelopeDb> <jsonInput>` prints a `SceneRawRows`-shaped JSON: query `logline_acts` (content_hash, who, did, this, if_ok, if_doubt, if_not, status, confirmed_by, inserted_at) and `runtime_queue` from the logline DB; `findings` (finding_id, kind, severity, refs from refs_json, resolved_at) and `shifts` (input_hash, actor, duration_ms, kind, closed_at) from the envelope DB if it exists; `watermark` = max seq each side. Read-only connections (`mode=ro`). On a missing DB, emit that side as `[]` and set the watermark seq to 0 (degraded, not an error).

```python
# add near the existing main dispatch:
def scene_rows(logline_db, envelope_db, request):
    import json, sqlite3
    out = {"logline_acts": [], "queue": [], "findings": [], "shifts": [],
           "watermark": {"logline_seq": 0, "envelope_seq": 0}}
    if logline_db and os.path.exists(logline_db):
        db = read_only_connect(logline_db)
        out["logline_acts"] = [dict(r) for r in db.execute(
            "SELECT content_hash, who, did, this, if_ok, if_doubt, if_not, status, confirmed_by, inserted_at "
            "FROM logline_acts ORDER BY inserted_at")]
        try:
            out["queue"] = [dict(r) for r in db.execute(
                "SELECT queue_id, source_hash, process_id, status, attempts, claimed_by, created_at, updated_at, result_hash, last_error "
                "FROM runtime_queue")]
        except sqlite3.OperationalError:
            out["queue"] = []
        out["watermark"]["logline_seq"] = len(out["logline_acts"])
        db.close()
    if envelope_db and os.path.exists(envelope_db):
        db = read_only_connect(envelope_db)
        try:
            out["findings"] = [
                {"finding_id": r["finding_id"], "kind": r["kind"], "severity": r["severity"],
                 "refs": json.loads(r["refs_json"]) if r["refs_json"] else [], "resolved_at": r["resolved_at"]}
                for r in db.execute("SELECT finding_id, kind, severity, refs_json, resolved_at FROM findings")]
        except sqlite3.OperationalError:
            out["findings"] = []
        try:
            out["shifts"] = [dict(r) for r in db.execute(
                "SELECT input_hash, actor, duration_ms, kind, closed_at FROM shifts")]
            out["watermark"]["envelope_seq"] = len(out["shifts"])
        except sqlite3.OperationalError:
            out["shifts"] = []
        db.close()
    return out
```

Wire it into the arg dispatch: when `sys.argv[1] == "rows"`, call `scene_rows(sys.argv[2], sys.argv[3], json.loads(sys.argv[4]))` and `print(json.dumps(...))`.

- [ ] **Step 2: Run it against the seeded DBs**

Run:
```bash
python3 scripts/runtime-projection-local.py rows \
  ../Dream-Machine-LogLine-Acts/.lab/lab.sqlite \
  ../Dream-Machine-Envelope-Ledger/.board/board.sqlite '{}' | python3 -m json.tool | head -20
```
Expected: JSON with `logline_acts` (4), `queue`, `findings`, `shifts`, `watermark`. (Re-seed via `derive-from-logline.mjs` first if `.board` is absent.)

- [ ] **Step 3: Commit**

```bash
git add scripts/runtime-projection-local.py
git commit -m "feat(bridge): rows mode emitting SceneRawRows for the composer"
```

---

## Task 7: Readers (thin bridge wrappers)

**Files:**
- Create: `agent/lib/scene/readers.ts`
- Test: `tests/scene-assemble.test.ts` (reader interface used via a fake here; real reader is integration-only)

- [ ] **Step 1: Define the interface + real reader**

Create `agent/lib/scene/readers.ts`:

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { SceneRawRows, SceneScope } from "../../../shared/tools/scene.ts";

const execFileAsync = promisify(execFile);
const UI_ROOT = resolve(fileURLToPath(new URL("../../../", import.meta.url)));
const WS_ROOT = dirname(UI_ROOT);
const SCRIPT = join(UI_ROOT, "scripts/runtime-projection-local.py");

export interface SceneReaders {
  readRows(scope: SceneScope): Promise<SceneRawRows>;
}

function loglineDb(): string | undefined {
  const p = process.env.DREAM_MACHINE_LOGLINE_DB ?? join(WS_ROOT, "Dream-Machine-LogLine-Acts/.lab/lab.sqlite");
  return existsSync(p) ? p : undefined;
}
function envelopeDb(): string | undefined {
  const p = process.env.DREAM_MACHINE_ENVELOPE_DB ?? join(WS_ROOT, "Dream-Machine-Envelope-Ledger/.board/board.sqlite");
  return existsSync(p) ? p : undefined;
}

export const bridgeReaders: SceneReaders = {
  async readRows(scope) {
    const { stdout } = await execFileAsync("python3", [
      SCRIPT, "rows", loglineDb() ?? "", envelopeDb() ?? "", JSON.stringify(scope ?? {}),
    ], { timeout: 8000, cwd: UI_ROOT });
    return JSON.parse(stdout) as SceneRawRows;
  },
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add agent/lib/scene/readers.ts
git commit -m "feat(scene): bridge readers behind a SceneReaders interface"
```

---

## Task 8: assembleScene (orchestration + freshness + hashing)

**Files:**
- Create: `agent/lib/scene/scene.ts`
- Test: `tests/scene-assemble.test.ts`

- [ ] **Step 1: Write the failing test (with a fake reader — no DB)**

Create `tests/scene-assemble.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { assembleScene } from "../agent/lib/scene/scene.ts";
import type { SceneReaders } from "../agent/lib/scene/readers.ts";
import type { SceneRawRows } from "../shared/tools/scene.ts";

const NOW = 1_700_000_000_000;
const fakeRows: SceneRawRows = {
  logline_acts: [
    { content_hash: "h1", who: "cos", did: "route", this: "inbox", if_ok: "memory-register.v1", if_doubt: "attention-raise.v1", if_not: "stop", status: "open", confirmed_by: "dan", inserted_at: "2026-06-26T00:00:00.000Z" },
    { content_hash: "h2", who: "cos", did: "infer", this: "x", if_ok: "stop", if_doubt: "attention-raise.v1", if_not: "stop", status: "registered", confirmed_by: "dan", inserted_at: "2026-06-25T00:00:00.000Z" },
  ],
  queue: [{ queue_id: "q1", source_hash: "h1", process_id: "inbox-route.v1", status: "claimed", attempts: 3, claimed_by: "cos", created_at: "2026-06-26T00:00:00.000Z", updated_at: "2026-06-26T00:00:00.000Z", result_hash: null, last_error: null }],
  findings: [], shifts: [], watermark: { logline_seq: 2, envelope_seq: 0 },
};
const fakeReaders: SceneReaders = { async readRows() { return fakeRows; } };

test("assembleScene returns a contract-valid Scene with the triad + freshness + breadcrumb", async () => {
  const r = await assembleScene({ op: "scene.open", goal: "o que travou", scope: { ledger: "lab" }, limit: 1 },
    fakeReaders, { now: NOW });
  assert.equal(r.op, "scene.open");
  assert.equal(r.view.items.length, r.loss_accounting.visible_count);             // invariant 7
  assert.equal(r.loss_accounting.total_candidates, r.loss_accounting.visible_count + r.loss_accounting.omitted_count);
  assert.ok(r.legal_next_moves.every((m) => m.effect_class === "none"));          // invariant 13
  assert.ok(r.freshness.generated_at);                                            // invariant 12
  assert.ok(typeof r.projection_hash === "string" && r.projection_hash.length > 0);
  assert.deepEqual(Array.isArray(r.parent_projection_hashes), true);
  assert.equal(r.view.items[0].id, "h1");                                         // stuck-first by goal
});

test("same request + same rows = same projection_hash (reproducible)", async () => {
  const req = { op: "scene.open" as const, goal: "o que travou", scope: { ledger: "lab" }, limit: 1 };
  const a = await assembleScene(req, fakeReaders, { now: NOW });
  const b = await assembleScene(req, fakeReaders, { now: NOW });
  assert.equal(a.projection_hash, b.projection_hash);
});

test("degraded reader (empty envelope) sets stale + a partial_source warning is allowed; empty scope yields empty view", async () => {
  const empty: SceneReaders = { async readRows() { return { logline_acts: [], queue: [], findings: [], shifts: [], watermark: { logline_seq: 0, envelope_seq: 0 } }; } };
  const r = await assembleScene({ op: "scene.open", scope: {}, limit: 10 }, empty, { now: NOW });
  assert.equal(r.view.items.length, 0);
  assert.equal(r.loss_accounting.total_candidates, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`
Expected: FAIL — `assembleScene` not found.

- [ ] **Step 3: Implement assembleScene**

Create `agent/lib/scene/scene.ts`:

```ts
import { createHash } from "node:crypto";
import type { SceneReaders } from "./readers.ts";
import { composeProcessViews } from "./compose.ts";
import { resolveSalience, rankAndBound, legalMoves, proposals } from "./governor.ts";
import type { SceneRequest, SceneResponse, RiskTier } from "../../../shared/tools/scene.ts";

export type AssembleOpts = { now: number; riskByProcess?: Record<string, RiskTier> };

function sha256(obj: unknown): string {
  return "sha256:" + createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

export async function assembleScene(
  req: SceneRequest,
  readers: SceneReaders,
  opts: AssembleOpts,
): Promise<SceneResponse> {
  const rows = await readers.readRows(req.scope);
  const views = composeProcessViews(rows, { now: opts.now, riskByProcess: opts.riskByProcess ?? {} });
  const profile = resolveSalience(req.goal);
  const limit = req.limit ?? 10;
  const { items, loss } = rankAndBound(views, profile, limit);

  const transformSpec = { op: req.op, scope: req.scope, selection: req.selection ?? null, limit, profile,
    source_hashes: rows.logline_acts.map((a) => a.content_hash) };
  const transform = {
    source_hashes: transformSpec.source_hashes,
    model: null, prompt_hash: null, params_hash: null,
    resolved_salience: profile,
    transform_spec_hash: sha256(transformSpec),
  };
  const generatedAt = new Date(opts.now).toISOString();
  const stale = rows.watermark.envelope_seq === 0 && rows.shifts.length === 0 && rows.findings.length === 0;
  const view = { items, order: `intent_directed: ${profile.join(" > ")}`, filters: { scope: req.scope, ...(req.selection ?? {}) }, limit };
  const body = { op: req.op, goal: req.goal, view, loss, transform };

  return {
    projection_hash: sha256(body),
    parent_projection_hashes: req.parent_projection_hash ? [req.parent_projection_hash] : [],
    root_scope_hash: sha256(req.scope),
    op: req.op,
    goal: req.goal,
    created_at: generatedAt,
    freshness: { generated_at: generatedAt, as_of: req.as_of ?? "head", stale, ttl_ms: null, source_watermark: rows.watermark },
    warnings: stale ? [{ kind: "partial_source", source: "envelope", message: "envelope ledger empty or unavailable" }] : [],
    view,
    loss_accounting: loss,
    legal_next_moves: legalMoves({ op: req.op, hasItems: items.length > 0, hasParent: Boolean(req.parent_projection_hash), omitted: loss.omitted_count, focused: Boolean(req.selection?.focus) }),
    proposals: proposals(items),
    transform,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test`
Expected: PASS (all scene-assemble tests).

- [ ] **Step 5: Commit**

```bash
git add agent/lib/scene/scene.ts tests/scene-assemble.test.ts
git commit -m "feat(scene): assembleScene orchestration with reproducible hashing + freshness"
```

---

## Task 9: Eve tool

**Files:**
- Create: `agent/tools/scene.ts`

- [ ] **Step 1: Write the tool**

Create `agent/tools/scene.ts` (follows the `runtime_projection.ts` pattern; read-only, no approval):

```ts
import { defineTool } from "eve/tools";
import { z } from "zod";
import { SCENE_OPS } from "../../shared/tools/scene.js";
import { assembleScene } from "../lib/scene/scene.js";
import { bridgeReaders } from "../lib/scene/readers.js";

const inputSchema = z.object({
  op: z.enum(SCENE_OPS).describe("The Scene operation. Start with scene.open."),
  goal: z.string().optional().describe("Natural-language objective; drives salience (e.g. 'what is stuck and waiting on me')."),
  scope: z.record(z.string(), z.unknown()).default({}).describe("What the Scene is about: { ledger, process, process_id, content_hash, stream_id }."),
  parent_projection_hash: z.string().optional(),
  selection: z.object({ filter: z.string().optional(), group_by: z.string().optional(), focus: z.string().optional() }).optional(),
  as_of: z.string().optional(),
  limit: z.number().int().positive().max(50).optional(),
});

export default defineTool({
  description:
    "Read-only Dynamic Projection Scene over the LogLine + Envelope ledgers. Ask with a `goal`; get a bounded ProcessView (process state + andamento), honest loss accounting, and the legal next moves to drill. Never registers receipts, dispatches, mutates a ledger, or authorizes L5 — effectful intents come back as `proposals` for the airlock.",
  inputSchema,
  async execute(input) {
    try {
      const scene = await assembleScene(input as never, bridgeReaders, { now: Date.now() });
      return { ok: true as const, scene };
    } catch (err) {
      return { ok: false as const, reason: "projection_unavailable" as const,
        errors: [{ field: "runtime", message: err instanceof Error ? err.message : String(err) }],
        cannot_do: ["register_receipt", "dispatch_executor", "authorize_l5", "mutate_ledger"] };
    }
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Manual smoke (real bridge, seeded DBs)**

Re-seed if needed: `( cd ../Dream-Machine-Envelope-Ledger && node scripts/derive-from-logline.mjs )`. Then in the Eve dev runtime (`pnpm dev`), have the agent call the `scene` tool with `{ op: "scene.open", goal: "o que travou e o que precisa de mim" }` and confirm a non-empty ProcessView with legal_next_moves comes back.

- [ ] **Step 4: Commit**

```bash
git add agent/tools/scene.ts
git commit -m "feat(scene): Eve read-only Scene tool"
```

---

## Task 10: Retire the 10 fixed intents (T-P1 consolidation)

**Files:**
- Modify: `agent/tools/runtime_projection.ts`
- Modify: `agent/lib/base-instructions.ts`

- [ ] **Step 1: Point the agent at the Scene tool**

In `agent/lib/base-instructions.ts`, add a line instructing the agent: for any question about processes/state/andamento, use the `scene` tool (start `scene.open` with a `goal`), and follow the returned `legal_next_moves`; treat `proposals` as suggestions that require the airlock.

- [ ] **Step 2: Deprecate the fixed-intent tool**

In `agent/tools/runtime_projection.ts`, change the tool `description` to mark it deprecated in favor of `scene`, and (optional) gate its registration behind an env flag so the agent sees one projection surface. Do not delete the mappers/normalizer — `scene` reuses them.

- [ ] **Step 3: Typecheck + tests**

Run: `pnpm typecheck && pnpm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add agent/tools/runtime_projection.ts agent/lib/base-instructions.ts
git commit -m "feat(scene): make Scene the single projection surface; deprecate fixed intents"
```

---

## Task 11: UI card

**Files:**
- Create: `app/components/chat/tool/Scene.vue`

- [ ] **Step 1: Build the card**

Create `app/components/chat/tool/Scene.vue` mirroring `RuntimeProjection.vue`: render `scene.view.items` (title, state, waiting_on, stuck badge, risk), a prominent **loss line** ("Vendo N de M — ordenado por …"), the `legal_next_moves` as buttons, and `proposals` visually separated as "requer airlock". Bind buttons to re-invoke the `scene` tool with the move's `op` + `args`.

- [ ] **Step 2: Smoke in dev**

Run: `pnpm dev`, trigger a `scene` call, confirm the card renders the view, the loss line, and the move buttons; clicking a move issues the next `scene` op.

- [ ] **Step 3: Commit**

```bash
git add app/components/chat/tool/Scene.vue
git commit -m "feat(scene): Scene card with view, loss line, and move buttons"
```

---

## Task 12: End-to-end (the system done receipt, T-P2)

**Files:**
- Create: `tests/scene-e2e.test.ts`

- [ ] **Step 1: Write the e2e test against the real seeded ledgers**

Create `tests/scene-e2e.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { assembleScene } from "../agent/lib/scene/scene.ts";
import { bridgeReaders } from "../agent/lib/scene/readers.ts";

// Requires the seeded ledgers: LogLine .lab/lab.sqlite (4 acts) and Envelope
// .board/board.sqlite (run derive-from-logline.mjs first). Skips if absent.
test("scene.open over the real ledgers returns ProcessViews for the seeded processes", async () => {
  let scene;
  try {
    scene = await assembleScene({ op: "scene.open", goal: "o que está em andamento", scope: { ledger: "lab" }, limit: 10 }, bridgeReaders, { now: Date.now() });
  } catch (err) {
    console.log("skip: ledgers not seeded —", (err as Error).message);
    return;
  }
  assert.ok(scene.loss_accounting.total_candidates >= 1, "expected at least one process in the ledger");
  assert.equal(scene.view.items.length, scene.loss_accounting.visible_count);
  assert.ok(scene.legal_next_moves.length > 0);
  assert.ok(scene.freshness.generated_at);
});
```

- [ ] **Step 2: Seed + run**

Run:
```bash
( cd ../Dream-Machine-Envelope-Ledger && node scripts/derive-from-logline.mjs )
pnpm test
```
Expected: PASS — the e2e finds the seeded processes (or prints `skip:` if a ledger is missing).

- [ ] **Step 3: Commit**

```bash
git add tests/scene-e2e.test.ts
git commit -m "test(scene): end-to-end over the real seeded ledgers (T-P2)"
```

---

## Out of scope (v0) — do NOT build here

- The `/projection` HTTP endpoint (T-R1): readers stay on the python bridge behind `SceneReaders`.
- The airlock fulfillment (T-R2): the Scene only emits `proposals`; nothing fulfills them.
- Eve **dynamic-tool** reshaping (`defineDynamic`): v0 ships ONE `scene` tool whose `legal_next_moves` guide the agent; converting moves into per-state dynamic tools is a follow-up once the loop is proven.
- Durable Scene storage, pagination cursors (`scene.more`), full `as_of` time-travel depth, `scene.group`/`scene.compare` execution beyond the move stubs — land after the core loop is green.

## Notes for the implementer

- The composer/governor are **pure** — never call `Date.now()` inside them; the clock is injected (`opts.now`). This keeps tests deterministic and hashes reproducible.
- Read-only is a hard invariant: `legal_next_moves` are always `effect_class: "none"`; anything effectful is a `proposal`. A test asserts this — do not weaken it.
- `event_zones` is stubbed to zeros in v0 (the bridge `rows` mode does not yet count event zones); wire real counts when the envelope event reader lands.
- Verify the Envelope `findings`/`shifts` table/column names against `src/store/migrate.ts` before finalizing the bridge `rows` SQL; adjust column names if they differ.
