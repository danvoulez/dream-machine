import assert from "node:assert/strict";
import test from "node:test";
import { normalizeBridgeProjection } from "../agent/lib/projection-portal.ts";
import { assembleScene } from "../agent/lib/scene/scene.ts";
import { normalizeSceneProjection } from "../agent/lib/scene/normalize.ts";
import { bridgeReaders } from "../agent/lib/scene/readers.ts";
import { fetchProjectionRuntime, resolveLoglineDbPath } from "../agent/lib/projection-bridge.ts";
import {
  PORTAL_READ_ONLY_CANNOT_DO,
  REQUIRED_CANNOT_DO,
} from "../shared/tools/runtime-projection.ts";

function assertPortalContract(
  label: string,
  projection: {
    authoritative: boolean;
    cannot_do: string[];
    intent: string;
    blocks: unknown[];
  },
) {
  assert.equal(projection.authoritative, false, `${label}: authoritative must be false`);
  for (const limit of REQUIRED_CANNOT_DO) {
    assert.ok(
      projection.cannot_do.includes(limit),
      `${label}: cannot_do must include ${limit}`,
    );
  }
  assert.ok(projection.blocks.length >= 1, `${label}: must render at least one block`);
  assert.ok(projection.intent.length > 0, `${label}: intent required`);
}

test("Scene and legacy overview both normalize to dream-machine-projections.v0", async (t) => {
  if (!resolveLoglineDbPath()) {
    t.skip("ledgers not seeded");
    return;
  }

  const scene = await assembleScene(
    { op: "scene.open", goal: "overview", scope: { ledger: "lab" }, limit: 5 },
    bridgeReaders,
    { now: Date.now() },
  );
  const sceneNorm = normalizeSceneProjection(scene);
  assert.equal(sceneNorm.ok, true);

  const raw = await fetchProjectionRuntime({ intent: "overview", scope: "all" });
  const legacyNorm = normalizeBridgeProjection(raw, { intent: "overview", scope: "all" });
  assert.equal(legacyNorm.ok, true);

  assertPortalContract("scene", sceneNorm.response!);
  assertPortalContract("legacy", legacyNorm.response!);

  for (const limit of PORTAL_READ_ONLY_CANNOT_DO) {
    assert.ok(
      sceneNorm.response!.cannot_do.includes(limit),
      `scene projection cannot_do must include ${limit}`,
    );
    assert.ok(
      legacyNorm.response!.cannot_do.includes(limit),
      `legacy projection cannot_do must include ${limit}`,
    );
  }
});

test("normalizeBridgeProjection maps envelope-native shell output before normalizing", () => {
  const result = normalizeBridgeProjection({
    projection_hash: "env-proj",
    source: { act_hashes: ["board-act-1"] },
    narrative: [{
      block_id: "n1",
      kind: "summary",
      title: "Envelope",
      body: "Observation only.",
      ref: "board-act-1",
    }],
    open_findings: ["finding-1"],
  }, { intent: "open_findings", scope: "demo" });

  assert.equal(result.ok, true);
  assertPortalContract("envelope bridge", result.response!);
  assert.equal(result.response?.jurisdiction, "envelope");
});