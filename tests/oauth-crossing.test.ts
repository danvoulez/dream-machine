import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { canonicalJson, sha256Text } from "../agent/lib/board-json-v0.ts";
import {
  assertOAuthActAnchor,
  buildOAuthAdapterAux,
  buildOAuthCrossingRequest,
  crossOAuthClientRegistration,
  loadOAuthAct,
  redactSupabaseOAuthResponse,
} from "../agent/lib/oauth-crossing.ts";
import { verifyLoglineReceipt } from "../agent/lib/logline-receipt-verify.ts";
import { buildStreamConfigRow } from "../agent/lib/envelope-effect-store.ts";
import { clientMetadata, OAUTH_CLIENT_DANGER_TIER } from "../agent/lib/oauth-client-metadata.ts";
import { resolveUiRoot } from "../agent/lib/projection-bridge.ts";

const UI_ROOT = resolveUiRoot();
const LOGLINE_ROOT = join(dirname(UI_ROOT), "Dream-Machine-LogLine-Acts");

const passportAct = {
  id: "a".repeat(64),
  who: "tester",
  did: "requested_oauth_client",
  this: "LAB Passport",
  when: "2026-06-22T00:00:00Z",
  confirmed_by: "test",
  if_ok: "oauth-client.v1",
  if_doubt: "attention-raise.v1",
  if_not: "stop",
  status: "candidate",
  client_name: "LAB Passport",
  redirect_uris: ["https://passport.minilab.work/auth/callback"],
  client_type: "confidential",
  lab_id: "lab:abc123",
};

test("client_metadata matches LogLine python builder", (t) => {
  if (!existsSync(join(LOGLINE_ROOT, "lab/oauth.py"))) {
    t.skip("LogLine repo missing");
    return;
  }
  const py = spawnSync("python3", ["-c", `
import json, sys
from lab.oauth import client_metadata
from lab.receipt import canonical_json, sha256_text
from lab.oauth import ADMIN_ENDPOINT
act = json.loads(sys.argv[1])
meta = client_metadata(act)
req = {"method": "POST", "endpoint": ADMIN_ENDPOINT, "client_metadata": meta}
print(json.dumps({
  "meta": meta,
  "mh": sha256_text(canonical_json(meta)),
  "rh": sha256_text(canonical_json(req)),
}))
`, JSON.stringify(passportAct)], { cwd: LOGLINE_ROOT, encoding: "utf8" });
  assert.equal(py.status, 0, py.stderr || py.stdout);
  const ref = JSON.parse(py.stdout) as { meta: Record<string, unknown>; mh: string; rh: string };
  const tsMeta = clientMetadata(passportAct);
  const { client_metadata_hash, request_hash } = buildOAuthCrossingRequest(passportAct);
  assert.deepEqual(tsMeta, ref.meta);
  assert.equal(client_metadata_hash, ref.mh);
  assert.equal(request_hash, ref.rh);
});

test("dry-run and execute share buildOAuthCrossingRequest", () => {
  const dry = buildOAuthAdapterAux(passportAct, {}, false);
  const built = buildOAuthCrossingRequest(passportAct);
  assert.equal(dry.request_hash, sha256Text(canonicalJson(built.request as never)));
  assert.equal(dry.client_metadata_hash, sha256Text(canonicalJson(built.meta as never)));
});

test("redactSupabaseOAuthResponse never exposes client_secret", () => {
  const redacted = redactSupabaseOAuthResponse({
    client_id: "cid-1",
    client_secret: "super-secret",
  });
  assert.equal(redacted.client_id, "cid-1");
  assert.ok(!("client_secret" in redacted));
});

test("crossOAuthClientRegistration dry_run is additive and records L3 effect shift", async () => {
  const before = structuredClone(passportAct);
  const result = await crossOAuthClientRegistration({
    act: passportAct,
    execute: false,
    record_envelope: false,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.mode, "dry_run");
  assert.equal(result.act.content_hash, passportAct.id);
  assert.equal(result.act.additive, true);
  assert.deepEqual(passportAct, before);
  assert.equal(result.governance.danger_tier, OAUTH_CLIENT_DANGER_TIER);
  assert.equal(result.envelope.shift.kind, "effect");
  assert.equal(result.envelope.shift.input_hash, passportAct.id);
  assert.equal(result.envelope.shift_result.output_kind, "effect_result");
  assert.ok(result.cannot_do.includes("store_client_secret"));
  assert.ok(!/"client_secret"\s*:/.test(JSON.stringify(result)));
  const aux = result.adapter;
  assert.equal(aux.external_effect, false);
  assert.equal(aux.api_called, false);
});

test("crossing records transport custody to supabase without client_id on dry_run", async () => {
  const result = await crossOAuthClientRegistration({ act: passportAct, record_envelope: false });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.envelope.custody[0]?.to === "supabase");
  assert.equal(result.envelope.client_id, null);
});

test("assertOAuthActAnchor rejects id/content_hash mismatch", () => {
  const anchor = "b".repeat(64);
  assert.equal(
    assertOAuthActAnchor({ ...passportAct, id: anchor }, passportAct.id),
    "act.id does not match requested content_hash anchor",
  );
  assert.equal(assertOAuthActAnchor(passportAct, passportAct.id), null);
});

test("execute rejects inline act without ledger anchor", async () => {
  const result = await crossOAuthClientRegistration({
    act: passportAct,
    execute: true,
    record_envelope: false,
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "invalid_act");
});

test("default crossing requires envelope db for durable evidence", async () => {
  const prior = process.env.DREAM_MACHINE_ENVELOPE_DB;
  process.env.DREAM_MACHINE_ENVELOPE_DB = join(UI_ROOT, ".tmp/missing-envelope.sqlite");
  try {
    const result = await crossOAuthClientRegistration({ act: passportAct });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.reason, "envelope_unavailable");
  } finally {
    if (prior) process.env.DREAM_MACHINE_ENVELOPE_DB = prior;
    else delete process.env.DREAM_MACHINE_ENVELOPE_DB;
  }
});

test("verifyLoglineReceipt accepts minted oauth receipt", (t) => {
  if (!existsSync(join(LOGLINE_ROOT, "lab/receipt.py"))) {
    t.skip("LogLine repo missing");
    return;
  }
  const py = spawnSync("python3", ["-c", `
import json, sys
from lab.receipt import mint
act = mint({
  "who": "tester",
  "did": "requested_oauth_client",
  "this": "LAB Passport",
  "when": "2026-06-22T00:00:00Z",
  "confirmed_by": "test",
  "if_ok": "oauth-client.v1",
  "if_doubt": "attention-raise.v1",
  "if_not": "stop",
  "status": "candidate",
  "client_name": "LAB Passport",
  "redirect_uris": ["https://passport.minilab.work/auth/callback"],
  "client_type": "confidential",
  "lab_id": "lab:abc123",
})
print(json.dumps(act))
`], { cwd: LOGLINE_ROOT, encoding: "utf8" });
  assert.equal(py.status, 0, py.stderr || py.stdout);
  const minted = JSON.parse(py.stdout) as Record<string, unknown>;
  const verified = verifyLoglineReceipt(minted);
  assert.equal(verified.ok, true, verified.message);
});

test("loadOAuthAct rejects tampered ledger receipt", async (t) => {
  if (!existsSync(join(LOGLINE_ROOT, "lab/receipt.py"))) {
    t.skip("LogLine repo missing");
    return;
  }
  const { mkdtempSync, writeFileSync, unlinkSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join: pathJoin } = await import("node:path");
  const dir = mkdtempSync(pathJoin(tmpdir(), "oauth-act-"));
  const dbPath = pathJoin(dir, "lab.sqlite");
  const priorDb = process.env.DREAM_MACHINE_LOGLINE_DB;
  process.env.DREAM_MACHINE_LOGLINE_DB = dbPath;
  try {
    const py = spawnSync("python3", ["-c", `
import json, sqlite3, sys
from lab.receipt import mint
act = mint({
  "who": "tester",
  "did": "requested_oauth_client",
  "this": "LAB Passport",
  "when": "2026-06-22T00:00:00Z",
  "confirmed_by": "test",
  "if_ok": "oauth-client.v1",
  "if_doubt": "attention-raise.v1",
  "if_not": "stop",
  "status": "candidate",
  "client_name": "LAB Passport",
  "redirect_uris": ["https://passport.minilab.work/auth/callback"],
  "client_type": "confidential",
  "lab_id": "lab:abc123",
})
content_hash = act["id"]
act["who"] = "tampered"
conn = sqlite3.connect(sys.argv[1])
conn.execute("CREATE TABLE logline_acts (content_hash TEXT PRIMARY KEY, act TEXT NOT NULL, inserted_at TEXT NOT NULL)")
conn.execute("INSERT INTO logline_acts(content_hash, act, inserted_at) VALUES (?, ?, ?)",
             (content_hash, json.dumps(act), "2026-06-27T00:00:00Z"))
conn.commit()
print(content_hash)
`, dbPath], { cwd: LOGLINE_ROOT, encoding: "utf8" });
    assert.equal(py.status, 0, py.stderr || py.stdout);
    const contentHash = py.stdout.trim();
    const loaded = await loadOAuthAct(contentHash);
    assert.equal(loaded, null);
  } finally {
    if (priorDb) process.env.DREAM_MACHINE_LOGLINE_DB = priorDb;
    else delete process.env.DREAM_MACHINE_LOGLINE_DB;
    try { unlinkSync(dbPath); } catch { /* temp */ }
  }
});

test("crossing verifies envelope receipts after recording", async (t) => {
  const spineRoot = join(dirname(UI_ROOT), "Dream-Machine-Envelope-Ledger");
  if (!existsSync(join(spineRoot, "dist/index.js"))) {
    t.skip("SPINE dist missing");
    return;
  }
  const { mkdtempSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const dir = mkdtempSync(join(tmpdir(), "oauth-env-"));
  const dbPath = join(dir, "envelope.sqlite");
  writeFileSync(dbPath, "");
  const prior = process.env.DREAM_MACHINE_ENVELOPE_DB;
  process.env.DREAM_MACHINE_ENVELOPE_DB = dbPath;
  try {
    const result = await crossOAuthClientRegistration({ act: passportAct, record_envelope: true });
    assert.equal(result.ok, true, !result.ok ? result.message : "");
  } finally {
    if (prior) process.env.DREAM_MACHINE_ENVELOPE_DB = prior;
    else delete process.env.DREAM_MACHINE_ENVELOPE_DB;
  }
});

test("buildStreamConfigRow includes SPINE-compatible config_hash", () => {
  const row = buildStreamConfigRow("membrane.oauth", 1_700_000_000_000);
  assert.equal(row.canonicalization, "board-json-v0");
  assert.equal(row.hash_algorithm, "sha256");
  assert.match(row.config_hash, /^[0-9a-f]{64}$/);
  assert.ok(row.identity_body_json.includes("membrane.oauth"));
});