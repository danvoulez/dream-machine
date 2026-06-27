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
  assert.equal(r.view.items.length, r.loss_accounting.visible_count);
  assert.equal(r.loss_accounting.total_candidates, r.loss_accounting.visible_count + r.loss_accounting.omitted_count);
  assert.ok(r.legal_next_moves.every((m) => m.effect_class === "none"));
  assert.ok(r.freshness.generated_at);
  assert.ok(typeof r.projection_hash === "string" && r.projection_hash.length > 0);
  assert.deepEqual(Array.isArray(r.parent_projection_hashes), true);
  assert.equal(r.view.items[0].id, "h1");
});

test("same request + same rows = same projection_hash (reproducible)", async () => {
  const req = { op: "scene.open" as const, goal: "o que travou", scope: { ledger: "lab" }, limit: 1 };
  const a = await assembleScene(req, fakeReaders, { now: NOW });
  const b = await assembleScene(req, fakeReaders, { now: NOW });
  assert.equal(a.projection_hash, b.projection_hash);
});

test("degraded reader warns on both missing halves and marks stale", async () => {
  const empty: SceneReaders = { async readRows() { return { logline_acts: [], queue: [], findings: [], shifts: [], watermark: { logline_seq: 0, envelope_seq: 0 } }; } };
  const r = await assembleScene({ op: "scene.open", scope: {}, limit: 10 }, empty, { now: NOW });
  assert.equal(r.view.items.length, 0);
  assert.equal(r.loss_accounting.total_candidates, 0);
  assert.equal(r.freshness.stale, true);
  assert.ok(r.warnings.some((w) => w.source === "logline"));
  assert.ok(r.warnings.some((w) => w.source === "envelope"));
});

test("scene.drill focuses a single item when selection.focus is set", async () => {
  const r = await assembleScene({
    op: "scene.drill",
    scope: { ledger: "lab" },
    selection: { focus: "h2" },
    limit: 10,
  }, fakeReaders, { now: NOW });
  assert.equal(r.view.items.length, 1);
  assert.equal(r.view.items[0].id, "h2");
  assert.ok(r.legal_next_moves.some((m) => m.move === "scene.open_evidence"));
});

test("scene.explain_loss returns omitted items from a bounded open view", async () => {
  const open = await assembleScene({ op: "scene.open", goal: "o que travou", scope: { ledger: "lab" }, limit: 1 }, fakeReaders, { now: NOW });
  assert.equal(open.view.items.length, 1);
  const explained = await assembleScene({ op: "scene.explain_loss", scope: { ledger: "lab" }, limit: 1 }, fakeReaders, { now: NOW });
  assert.ok(explained.view.items.length >= 1);
  assert.ok(explained.loss_accounting.omitted_reasons[0]?.includes("omitted"));
});

test("unknown scope emits scope_not_found when logline db is present but filter is empty", async () => {
  const scoped: SceneReaders = {
    async readRows() {
      return {
        logline_acts: [],
        queue: [],
        findings: [],
        shifts: [],
        watermark: { logline_seq: 0, envelope_seq: 0 },
        meta: { logline_db_present: true, envelope_db_present: true },
      };
    },
  };
  const r = await assembleScene({ op: "scene.open", scope: { content_hash: "missing" }, limit: 10 }, scoped, { now: NOW });
  assert.equal(r.warnings.some((w) => w.kind === "scope_not_found"), true);
});