import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assembleScene } from "../agent/lib/scene/scene.ts";
import { normalizeSceneProjection } from "../agent/lib/scene/normalize.ts";
import { bridgeReaders } from "../agent/lib/scene/readers.ts";
import { normalizeBridgeProjection } from "../agent/lib/projection-portal.ts";
import { fetchProjectionRuntime } from "../agent/lib/projection-bridge.ts";
import sceneTool from "../agent/tools/scene.ts";
import {
  PORTAL_READ_ONLY_CANNOT_DO,
  REQUIRED_CANNOT_DO,
} from "../shared/tools/runtime-projection.ts";
import type { SceneReaders } from "../agent/lib/scene/readers.ts";
import type { SceneRawRows } from "../shared/tools/scene.ts";

const UI_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LOGLINE_DB = join(UI_ROOT, "../Dream-Machine-LogLine-Acts/.lab/lab.sqlite");

const fakeRows: SceneRawRows = {
  logline_acts: [
    {
      content_hash: "h1",
      who: "cos",
      did: "route",
      this: "inbox",
      if_ok: "memory-register.v1",
      if_doubt: "attention-raise.v1",
      if_not: "stop",
      status: "open",
      confirmed_by: "dan",
      inserted_at: "2026-06-26T00:00:00.000Z",
    },
  ],
  queue: [{
    queue_id: "q1",
    source_hash: "h1",
    process_id: "inbox-route.v1",
    status: "claimed",
    attempts: 1,
    claimed_by: "cos",
    created_at: "2026-06-26T00:00:00.000Z",
    updated_at: "2026-06-26T00:00:00.000Z",
    result_hash: null,
    last_error: null,
  }],
  findings: [],
  shifts: [],
  watermark: { logline_seq: 1, envelope_seq: 0 },
};

const fakeReaders: SceneReaders = {
  async readRows() {
    return fakeRows;
  },
};

test("legal_next_moves are always effect_class none", async () => {
  const scene = await assembleScene(
    { op: "scene.open", goal: "waiting on me", scope: { ledger: "lab" }, limit: 5 },
    fakeReaders,
    { now: Date.now() },
  );
  assert.ok(scene.legal_next_moves.length > 0);
  assert.ok(scene.legal_next_moves.every((m) => m.effect_class === "none"));
  assert.ok(scene.proposals.every((p) => p.effect_class !== "none"));
});

test("proposals never appear in normalized affordances", async () => {
  const scene = await assembleScene(
    { op: "scene.open", goal: "precisa de mim", scope: { ledger: "lab" }, limit: 5 },
    fakeReaders,
    { now: Date.now() },
  );
  assert.ok(scene.proposals.length >= 1);
  const normalized = normalizeSceneProjection(scene);
  assert.equal(normalized.ok, true);
  const affordanceIds = normalized.response?.affordances.map((a) => a.affordance_id) ?? [];
  for (const proposal of scene.proposals) {
    assert.ok(!affordanceIds.includes(proposal.intent));
  }
});

test("normalized projections cannot_do includes register_receipt", async () => {
  const scene = await assembleScene(
    { op: "scene.open", scope: { ledger: "lab" }, limit: 3 },
    fakeReaders,
    { now: Date.now() },
  );
  const normalized = normalizeSceneProjection(scene);
  assert.equal(normalized.ok, true);
  for (const limit of REQUIRED_CANNOT_DO) {
    assert.ok(normalized.response?.cannot_do.includes(limit));
  }
});

test("scene tool surfaces cannot_do on success and includes register_receipt", async () => {
  const result = await sceneTool.execute({
    op: "scene.open",
    goal: "overview",
    scope: { ledger: "lab" },
    limit: 3,
  });
  assert.equal(result.ok, true);
  for (const limit of PORTAL_READ_ONLY_CANNOT_DO) {
    assert.ok(result.cannot_do.includes(limit));
  }
});

test("unimplemented Scene ops surface the op in cannot_do", async () => {
  const result = await sceneTool.execute({
    op: "scene.group",
    scope: { ledger: "lab" },
    limit: 10,
  });
  assert.equal(result.ok, false);
  assert.ok(result.cannot_do.includes("scene.group"));
  assert.ok(result.cannot_do.includes("register_receipt"));
});

test("source to card path: real ledger scene normalizes with portal limits", async (t) => {
  if (!existsSync(LOGLINE_DB)) {
    t.skip("ledgers not seeded");
    return;
  }
  const scene = await assembleScene(
    { op: "scene.open", goal: "andamento", scope: { ledger: "lab" }, limit: 5 },
    bridgeReaders,
    { now: Date.now() },
  );
  const normalized = normalizeSceneProjection(scene);
  assert.equal(normalized.ok, true);
  assert.equal(normalized.response?.authoritative, false);
  assert.ok(normalized.response?.blocks.some((b) => b.source_refs.length > 0));

  const legacy = normalizeBridgeProjection(
    await fetchProjectionRuntime({ intent: "overview", scope: "all" }),
    { intent: "overview", scope: "all" },
  );
  assert.equal(legacy.ok, true);
  assert.equal(legacy.response?.authoritative, false);
});