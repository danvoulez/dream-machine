import assert from "node:assert/strict";
import test from "node:test";
import { resolveSalience, rankAndBound, legalMoves, proposals } from "../agent/lib/scene/governor.ts";
import type { ProcessView } from "../shared/tools/scene.ts";

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
  assert.equal(items[0].id, "b");
  assert.equal(items.length, 2);
  assert.equal(loss.total_candidates, 3);
  assert.equal(loss.visible_count, 2);
  assert.equal(loss.omitted_count, 1);
  assert.ok(loss.confidence_limits[0].includes("2"));
});

test("rankAndBound never silently truncates: omitted_reasons explains the cut", () => {
  const views = [pv({ id: "a" }), pv({ id: "b" }), pv({ id: "c" })];
  const { loss } = rankAndBound(views, ["recency"], 1);
  assert.equal(loss.omitted_count, 2);
  assert.ok(loss.omitted_reasons.length > 0);
});

test("legalMoves at an open scene with items offers read-only drill/explain/back only", () => {
  const moves = legalMoves({ op: "scene.open", hasItems: true, hasParent: true, omitted: 5, focused: false });
  const names = moves.map((m) => m.move);
  assert.ok(names.includes("scene.drill"));
  assert.ok(names.includes("scene.explain_loss"));
  assert.ok(names.includes("scene.back"));
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