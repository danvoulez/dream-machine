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
  risk_by_process: { "inbox-route.v1": "L2", "memory-register.v1": "L0" },
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