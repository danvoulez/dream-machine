import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bridgeReadLegacyProjection,
  fetchProjectionRuntime,
  hasLocalLedger,
  resolveEnvelopeDbPath,
  resolveLoglineDbPath,
} from "../agent/lib/projection-bridge.ts";
import { normalizeBridgeProjection } from "../agent/lib/projection-portal.ts";

const UI_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LOGLINE_DB = join(UI_ROOT, "../Dream-Machine-LogLine-Acts/.lab/lab.sqlite");

async function withShellOnly<T>(fn: () => Promise<T>): Promise<T> {
  const prevUrl = process.env.DREAM_MACHINE_RUNTIME_URL;
  const prevAuth = process.env.BETTER_AUTH_URL;
  const prevShellOnly = process.env.DREAM_MACHINE_RUNTIME_SHELL_ONLY;
  delete process.env.DREAM_MACHINE_RUNTIME_URL;
  delete process.env.BETTER_AUTH_URL;
  process.env.DREAM_MACHINE_RUNTIME_SHELL_ONLY = "1";
  try {
    return await fn();
  } finally {
    if (prevUrl !== undefined) process.env.DREAM_MACHINE_RUNTIME_URL = prevUrl;
    else delete process.env.DREAM_MACHINE_RUNTIME_URL;
    if (prevAuth !== undefined) process.env.BETTER_AUTH_URL = prevAuth;
    else delete process.env.BETTER_AUTH_URL;
    if (prevShellOnly !== undefined) process.env.DREAM_MACHINE_RUNTIME_SHELL_ONLY = prevShellOnly;
    else delete process.env.DREAM_MACHINE_RUNTIME_SHELL_ONLY;
  }
}

test("logline_receipt_detail routes to logline jurisdiction", async (t) => {
  if (!existsSync(LOGLINE_DB) || !resolveLoglineDbPath()) {
    t.skip("logline ledger not seeded");
    return;
  }
  const rows = await withShellOnly(() =>
    bridgeReadLegacyProjection({ intent: "logline_receipt_detail", scope: "all" }),
  );
  const normalized = normalizeBridgeProjection(rows, {
    intent: "logline_receipt_detail",
    scope: "all",
  });
  assert.equal(normalized.ok, true);
  assert.equal(normalized.response?.jurisdiction, "logline");
  assert.equal(normalized.response?.authoritative, false);
  assert.ok(normalized.response?.blocks.length >= 1);
});

test("open_findings routes to envelope jurisdiction", async (t) => {
  if (!hasLocalLedger() || !resolveEnvelopeDbPath()) {
    t.skip("envelope ledger not seeded");
    return;
  }
  const rows = await withShellOnly(() =>
    fetchProjectionRuntime({ intent: "open_findings", scope: "all" }),
  );
  const normalized = normalizeBridgeProjection(rows, {
    intent: "open_findings",
    scope: "all",
  });
  assert.equal(normalized.ok, true);
  assert.equal(normalized.response?.jurisdiction, "envelope");
  assert.equal(normalized.response?.authoritative, false);
});

test("overview composes mixed jurisdiction from both ledgers", async (t) => {
  if (!existsSync(LOGLINE_DB) || !resolveLoglineDbPath() || !resolveEnvelopeDbPath()) {
    t.skip("both ledgers required for mixed overview");
    return;
  }
  const rows = await withShellOnly(() =>
    fetchProjectionRuntime({ intent: "overview", scope: "all" }),
  );
  const normalized = normalizeBridgeProjection(rows, {
    intent: "overview",
    scope: "all",
  });
  assert.equal(normalized.ok, true);
  assert.equal(normalized.response?.jurisdiction, "mixed");
  assert.equal(normalized.response?.authoritative, false);
  assert.ok(
    normalized.response?.warnings.some((w) => w.kind === "mixed_jurisdiction"),
    "mixed overview should carry mixed_jurisdiction warning",
  );
});