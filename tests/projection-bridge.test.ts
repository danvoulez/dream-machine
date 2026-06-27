import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bridgeReadSceneRows,
  handleProjectionPost,
  preferredJurisdiction,
} from "../agent/lib/projection-bridge.ts";

const UI_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LOGLINE_DB = join(UI_ROOT, "../Dream-Machine-LogLine-Acts/.lab/lab.sqlite");

test("preferredJurisdiction routes intents to the expected owner", () => {
  assert.equal(preferredJurisdiction("logline_receipt_detail"), "logline");
  assert.equal(preferredJurisdiction("open_findings"), "envelope");
  assert.equal(preferredJurisdiction("overview"), "mixed");
});

test("handleProjectionPost rows mode returns ledger rows from the bridge", async (t) => {
  if (!existsSync(LOGLINE_DB)) {
    t.skip("ledgers not seeded");
    return;
  }
  const rows = await handleProjectionPost({ mode: "rows", scope: { ledger: "lab" } });
  assert.ok(Array.isArray(rows.logline_acts));
  assert.ok(Array.isArray(rows.queue));
  assert.ok(rows.logline_acts.length >= 1);
});

test("bridgeReadSceneRows matches handleProjectionPost rows mode", async (t) => {
  if (!existsSync(LOGLINE_DB)) {
    t.skip("ledgers not seeded");
    return;
  }
  const direct = await bridgeReadSceneRows({ ledger: "lab" });
  const viaHandler = await handleProjectionPost({ mode: "rows", scope: { ledger: "lab" } });
  assert.equal(direct.logline_acts.length, viaHandler.logline_acts.length);
});