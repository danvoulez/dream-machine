import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSceneProjection } from "../agent/lib/scene/normalize.ts";
import type { SceneResponse } from "../shared/tools/scene.ts";

const baseScene: SceneResponse = {
  projection_hash: "sha256:abc",
  parent_projection_hashes: [],
  root_scope_hash: "sha256:scope",
  op: "scene.open",
  goal: "overview",
  created_at: "2026-06-27T00:00:00.000Z",
  freshness: {
    generated_at: "2026-06-27T00:00:00.000Z",
    as_of: "head",
    stale: false,
    ttl_ms: null,
    source_watermark: { logline_seq: 1, envelope_seq: 1 },
  },
  warnings: [],
  view: {
    items: [{
      id: "a".repeat(64),
      instance: "q1",
      process_id: "memory-register.v1",
      title: "route: inbox",
      state: "claimed",
      flow: { current: "route/open", next: "memory-register.v1", doubt: null, fail: "stop" },
      who: "cos",
      confirmed_by: "dan",
      waiting_on: "human",
      since_ms: 1000,
      age_ms: 2000,
      attempts: 1,
      stuck: false,
      risk: "L0",
      open_findings: [],
      last_shift: null,
      event_zones: { live: 0, buffered: 0, evaporated: 0 },
      source_refs: ["a".repeat(64)],
    }],
    order: "intent_directed: stuck > waiting_on_human",
    filters: {},
    limit: 10,
  },
  loss_accounting: {
    total_candidates: 1,
    visible_count: 1,
    omitted_count: 0,
    omitted_reasons: [],
    confidence_limits: ["Supports claims about these 1 ranked items only, not all 1."],
  },
  legal_next_moves: [{
    move: "scene.refresh",
    label: "Atualizar",
    reason: "refresh",
    args: {},
    effect_class: "none",
    requires_confirmation: false,
  }],
  proposals: [],
  transform: {
    source_hashes: ["a".repeat(64)],
    model: null,
    prompt_hash: null,
    params_hash: null,
    resolved_salience: ["stuck"],
    transform_spec_hash: "sha256:spec",
  },
};

test("normalizeSceneProjection maps Scene to dream-machine-projections.v0", () => {
  const result = normalizeSceneProjection(baseScene);
  assert.equal(result.ok, true);
  assert.equal(result.response?.authoritative, false);
  assert.equal(result.response?.jurisdiction, "mixed");
  assert.ok(result.response?.blocks.length >= 1);
  assert.ok(result.response?.cannot_do.includes("register_receipt"));
});