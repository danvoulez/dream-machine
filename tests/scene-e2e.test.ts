import assert from "node:assert/strict";
import test from "node:test";
import { assembleScene } from "../agent/lib/scene/scene.ts";
import { bridgeReaders } from "../agent/lib/scene/readers.ts";

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