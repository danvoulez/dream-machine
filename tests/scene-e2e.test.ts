import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assembleScene } from "../agent/lib/scene/scene.ts";
import { bridgeReaders } from "../agent/lib/scene/readers.ts";

const UI_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LOGLINE_DB = join(UI_ROOT, "../Dream-Machine-LogLine-Acts/.lab/lab.sqlite");

test("scene.open over the real ledgers returns ProcessViews for the seeded processes", async (t) => {
  if (!existsSync(LOGLINE_DB)) {
    t.skip("ledgers not seeded");
    return;
  }
  const scene = await assembleScene(
    { op: "scene.open", goal: "o que está em andamento", scope: { ledger: "lab" }, limit: 10 },
    bridgeReaders,
    { now: Date.now() },
  );
  assert.ok(scene.loss_accounting.total_candidates >= 1, "expected at least one process in the ledger");
  assert.equal(scene.view.items.length, scene.loss_accounting.visible_count);
  assert.ok(scene.legal_next_moves.length > 0);
  assert.ok(scene.freshness.generated_at);
  if (scene.view.items.some((v) => v.process_id.endsWith(".v1"))) {
    assert.notEqual(scene.view.items.every((v) => v.risk === "L1"), true, "expected contract risk tiers when process_id is known");
  }
  const queueBacked = scene.view.items.filter((v) => v.state === "queued" || v.state === "claimed");
  assert.ok(queueBacked.length >= 1, "expected runtime_queue rows to surface queue/claimed andamento");
  assert.ok(
    queueBacked.some((v) => v.waiting_on === "process" || v.waiting_on === "human"),
    "expected queue-backed items to report waiting_on from lifecycle",
  );
});