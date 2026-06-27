import assert from "node:assert/strict";
import test from "node:test";
import { parseFilter, applyFilter, groupProcessViews, compareProcessViews } from "../agent/lib/scene/filter.ts";
import { assembleScene } from "../agent/lib/scene/scene.ts";
import type { ProcessView, SceneReaders, SceneRawRows } from "../shared/tools/scene.ts";

const NOW = 1_700_000_000_000;

const fakeRows: SceneRawRows = {
  logline_acts: [
    { content_hash: "h1", who: "cos", did: "route", this: "inbox", if_ok: "memory-register.v1", if_doubt: "attention-raise.v1", if_not: "stop", status: "open", confirmed_by: "dan", inserted_at: "2026-06-26T00:00:00.000Z" },
    { content_hash: "h2", who: "cos", did: "infer", this: "x", if_ok: "stop", if_doubt: "attention-raise.v1", if_not: "stop", status: "registered", confirmed_by: "dan", inserted_at: "2026-06-25T00:00:00.000Z" },
  ],
  queue: [
    { queue_id: "q1", source_hash: "h1", process_id: "inbox-route.v1", status: "claimed", attempts: 3, claimed_by: "cos", created_at: "2026-06-26T00:00:00.000Z", updated_at: "2026-06-26T00:00:00.000Z", result_hash: null, last_error: null },
    { queue_id: "q2", source_hash: "h2", process_id: "stop.v1", status: "queued", attempts: 0, claimed_by: null, created_at: "2026-06-25T00:00:00.000Z", updated_at: "2026-06-25T00:00:00.000Z", result_hash: null, last_error: null },
  ],
  findings: [],
  shifts: [],
  watermark: { logline_seq: 2, envelope_seq: 0 },
};

const fakeReaders: SceneReaders = { async readRows() { return fakeRows; } };

function pv(over: Partial<ProcessView>): ProcessView {
  return {
    id: "x", instance: "x", process_id: "p", title: "t", state: "queued",
    flow: { current: "route/open", next: null, doubt: null, fail: null },
    who: "w", confirmed_by: "", waiting_on: "none", since_ms: 0, age_ms: 0,
    attempts: 0, stuck: false, risk: "L1", open_findings: [], last_shift: null,
    event_zones: { live: 0, buffered: 0, evaporated: 0 }, source_refs: ["x"], ...over,
  };
}

test("parseFilter handles stuck and key=value clauses", () => {
  const clauses = parseFilter("stuck,waiting_on=human,process_id=memory-register.v1");
  assert.equal(clauses?.length, 3);
  assert.deepEqual(clauses?.[0], { field: "stuck", value: true });
});

test("applyFilter keeps only matching ProcessViews", () => {
  const views = [
    pv({ id: "a", stuck: true }),
    pv({ id: "b", stuck: false, waiting_on: "human" }),
  ];
  const stuckOnly = applyFilter(views, parseFilter("stuck")!);
  assert.equal(stuckOnly.length, 1);
  assert.equal(stuckOnly[0].id, "a");
});

test("groupProcessViews collapses by process_id", () => {
  const grouped = groupProcessViews([
    pv({ id: "a", process_id: "p1" }),
    pv({ id: "b", process_id: "p1" }),
    pv({ id: "c", process_id: "p2" }),
  ], "process_id");
  assert.equal(grouped.length, 2);
  assert.match(grouped[0].title, /\(2 items\)/);
});

test("compareProcessViews tags symmetric difference", () => {
  const baseline = [pv({ id: "a" }), pv({ id: "b" })];
  const subset = [pv({ id: "b" }), pv({ id: "c" })];
  const compared = compareProcessViews(baseline, subset);
  assert.ok(compared.some((v) => v.title.startsWith("[baseline only]")));
  assert.ok(compared.some((v) => v.title.startsWith("[subset only]")));
  assert.ok(compared.some((v) => v.title.startsWith("[both]")));
});

test("scene.filter narrows the view with selection.filter", async () => {
  const r = await assembleScene({
    op: "scene.filter",
    scope: { ledger: "lab" },
    selection: { filter: "waiting_on=human" },
    limit: 10,
  }, fakeReaders, { now: NOW });
  assert.equal(r.op, "scene.filter");
  assert.ok(r.view.items.every((v) => v.waiting_on === "human"));
});

test("scene.group returns one row per process_id", async () => {
  const r = await assembleScene({
    op: "scene.group",
    scope: { ledger: "lab" },
    selection: { group_by: "process_id" },
    limit: 10,
  }, fakeReaders, { now: NOW });
  assert.equal(r.op, "scene.group");
  assert.ok(r.view.items.length >= 1);
  assert.ok(r.view.items[0].title.includes("process_id="));
});

test("scene.compare and scene.ascend/descend are read-only", async () => {
  const compare = await assembleScene({
    op: "scene.compare",
    scope: { ledger: "lab" },
    selection: { filter: "stuck" },
    limit: 10,
  }, fakeReaders, { now: NOW });
  assert.ok(compare.legal_next_moves.every((m) => m.effect_class === "none"));

  const ascend = await assembleScene({ op: "scene.ascend", scope: { ledger: "lab" }, limit: 5 }, fakeReaders, { now: NOW });
  assert.ok(ascend.view.items.length >= 1);

  const descend = await assembleScene({ op: "scene.descend", scope: { ledger: "lab" }, limit: 10 }, fakeReaders, { now: NOW });
  assert.equal(descend.view.items.length, 1);
});