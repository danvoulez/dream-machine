import assert from "node:assert/strict";
import test from "node:test";
import {
  bridgeReadSceneRows,
  fetchProjectionRuntime,
  handleProjectionPost,
  hasLocalLedger,
  preferredJurisdiction,
  resolveLoglineDbPath,
} from "../agent/lib/projection-bridge.ts";

test("preferredJurisdiction routes intents to the expected owner", () => {
  assert.equal(preferredJurisdiction("logline_receipt_detail"), "logline");
  assert.equal(preferredJurisdiction("open_findings"), "envelope");
  assert.equal(preferredJurisdiction("overview"), "mixed");
});

test("handleProjectionPost rows mode returns ledger rows from the bridge", async (t) => {
  if (!resolveLoglineDbPath()) {
    t.skip("ledgers not seeded");
    return;
  }
  const rows = await handleProjectionPost({ mode: "rows", scope: { ledger: "lab" } });
  assert.ok(Array.isArray(rows.logline_acts));
  assert.ok(Array.isArray(rows.queue));
  assert.ok(rows.logline_acts.length >= 1);
});

test("bridgeReadSceneRows matches handleProjectionPost rows mode", async (t) => {
  if (!resolveLoglineDbPath()) {
    t.skip("ledgers not seeded");
    return;
  }
  const direct = await bridgeReadSceneRows({ ledger: "lab" });
  const viaHandler = await handleProjectionPost({ mode: "rows", scope: { ledger: "lab" } });
  assert.equal(direct.logline_acts.length, viaHandler.logline_acts.length);
});

test("fetchProjectionRuntime legacy overview uses the shell bridge when no HTTP URL", async (t) => {
  if (!hasLocalLedger()) {
    t.skip("ledgers not seeded");
    return;
  }
  const prevUrl = process.env.DREAM_MACHINE_RUNTIME_URL;
  const prevAuth = process.env.BETTER_AUTH_URL;
  delete process.env.DREAM_MACHINE_RUNTIME_URL;
  delete process.env.BETTER_AUTH_URL;
  try {
    const data = await fetchProjectionRuntime({ intent: "overview", scope: "all" });
    assert.equal(data.intent, "overview");
    assert.ok(Array.isArray(data.blocks));
  } finally {
    if (prevUrl !== undefined) process.env.DREAM_MACHINE_RUNTIME_URL = prevUrl;
    if (prevAuth !== undefined) process.env.BETTER_AUTH_URL = prevAuth;
  }
});