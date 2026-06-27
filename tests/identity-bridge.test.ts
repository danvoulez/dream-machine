import assert from "node:assert/strict";
import test from "node:test";
import { resolvePortalIdentity } from "../agent/lib/identity-bridge.ts";

test("resolvePortalIdentity maps app principal to lab id via env map", () => {
  const prevMap = process.env.DREAM_MACHINE_LAB_ID_MAP;
  const prevGrants = process.env.DREAM_MACHINE_OPERATOR_GRANTS;
  process.env.DREAM_MACHINE_LAB_ID_MAP = JSON.stringify({ "user-1": "lab:dan" });
  process.env.DREAM_MACHINE_OPERATOR_GRANTS = "grant:observe,grant:scene";
  try {
    const identity = resolvePortalIdentity({
      principalId: "user-1",
      authenticator: "app",
      issuer: "app",
      attributes: { supabase_user_id: "supa-abc" },
    });
    assert.ok(identity);
    assert.equal(identity.lab_id, "lab:dan");
    assert.equal(identity.supabase_user_id, "supa-abc");
    assert.equal(identity.connector_boundary, "app");
    assert.ok(identity.grants.includes("grant:observe"));
    assert.equal(identity.read_only, true);
  } finally {
    if (prevMap !== undefined) process.env.DREAM_MACHINE_LAB_ID_MAP = prevMap;
    else delete process.env.DREAM_MACHINE_LAB_ID_MAP;
    if (prevGrants !== undefined) process.env.DREAM_MACHINE_OPERATOR_GRANTS = prevGrants;
    else delete process.env.DREAM_MACHINE_OPERATOR_GRANTS;
  }
});

test("resolvePortalIdentity returns null without principal", () => {
  assert.equal(resolvePortalIdentity(null), null);
});