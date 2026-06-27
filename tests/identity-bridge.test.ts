import assert from "node:assert/strict";
import test from "node:test";
import { resolvePassportHash, resolvePortalIdentity } from "../agent/lib/identity-bridge.ts";

const VALID_HASH = "91c381ec1ca35c3414ea7138411e32da0c34c7d10cd8a0769586250c1f4a1441";
const OTHER_HASH = "a".repeat(64);

function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => void,
): void {
  const prior = new Map<string, string | undefined>();
  for (const key of Object.keys(vars)) {
    prior.set(key, process.env[key]);
    const value = vars[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    fn();
  } finally {
    for (const [key, value] of prior) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const basePrincipal = {
  principalId: "vercel-user-id",
  authenticator: "app",
  issuer: "app",
} as const;

test("identity: passport map rejects lab:dan as mapped authority", () => {
  withEnv({
    DREAM_MACHINE_PASSPORT_MAP: JSON.stringify({ "vercel-user-id": "lab:dan" }),
    DREAM_MACHINE_DEFAULT_PASSPORT_HASH: undefined,
  }, () => {
    const identity = resolvePortalIdentity(basePrincipal);
    assert.ok(identity);
    assert.equal(identity.passport_hash, null);
    assert.notEqual(identity.passport_hash, "lab:dan");
  });
});

test("identity: passport map rejects malformed hash values", () => {
  withEnv({
    DREAM_MACHINE_PASSPORT_MAP: JSON.stringify({ "vercel-user-id": "not-a-hash" }),
    DREAM_MACHINE_DEFAULT_PASSPORT_HASH: undefined,
  }, () => {
    const identity = resolvePortalIdentity(basePrincipal);
    assert.ok(identity);
    assert.equal(identity.passport_hash, null);
  });
});

test("identity: lab_id gloss without passport map is not authoritative", () => {
  withEnv({
    DREAM_MACHINE_LAB_ID_MAP: JSON.stringify({ "vercel-user-id": "lab:dan" }),
    DREAM_MACHINE_PASSPORT_MAP: undefined,
    DREAM_MACHINE_DEFAULT_PASSPORT_HASH: undefined,
  }, () => {
    const identity = resolvePortalIdentity(basePrincipal);
    assert.ok(identity);
    assert.equal(identity.lab_id, "lab:dan");
    assert.equal(identity.passport_hash, null);
  });
});

test("identity: valid passport map returns passport_hash for session user id", () => {
  withEnv({
    DREAM_MACHINE_PASSPORT_MAP: JSON.stringify({ "vercel-user-id": VALID_HASH }),
  }, () => {
    const identity = resolvePortalIdentity(basePrincipal);
    assert.ok(identity);
    assert.equal(identity.passport_hash, VALID_HASH);
  });
});

test("identity: valid passport map resolves email lookup key", () => {
  withEnv({
    DREAM_MACHINE_PASSPORT_MAP: JSON.stringify({ "dan@voulez.dev": OTHER_HASH }),
  }, () => {
    const identity = resolvePortalIdentity({
      principalId: "opaque-session",
      attributes: { email: "dan@voulez.dev" },
    });
    assert.ok(identity);
    assert.equal(identity.passport_hash, OTHER_HASH);
  });
});

test("identity: valid passport map resolves oauth subject lookup key", () => {
  withEnv({
    DREAM_MACHINE_PASSPORT_MAP: JSON.stringify({ "oauth-sub-123": VALID_HASH }),
  }, () => {
    const identity = resolvePortalIdentity({
      principalId: "session-abc",
      attributes: { sub: "oauth-sub-123" },
    });
    assert.ok(identity);
    assert.equal(identity.passport_hash, VALID_HASH);
  });
});

test("identity: default passport hash is explicit fallback only", () => {
  withEnv({
    DREAM_MACHINE_PASSPORT_MAP: undefined,
    DREAM_MACHINE_DEFAULT_PASSPORT_HASH: VALID_HASH,
  }, () => {
    const identity = resolvePortalIdentity({
      principalId: "unmapped-user",
      authenticator: "app",
    });
    assert.ok(identity);
    assert.equal(identity.passport_hash, VALID_HASH);
    assert.equal(resolvePassportHash({ principalId: "unmapped-user" }), VALID_HASH);
  });
});

test("identity: no mapping and no valid default yields null passport_hash", () => {
  withEnv({
    DREAM_MACHINE_PASSPORT_MAP: undefined,
    DREAM_MACHINE_DEFAULT_PASSPORT_HASH: undefined,
  }, () => {
    const identity = resolvePortalIdentity(basePrincipal);
    assert.ok(identity);
    assert.equal(identity.passport_hash, null);
  });
});

test("resolvePortalIdentity maps app principal to lab id gloss via env map", () => {
  withEnv({
    DREAM_MACHINE_LAB_ID_MAP: JSON.stringify({ "user-1": "lab:dan" }),
    DREAM_MACHINE_OPERATOR_GRANTS: "grant:observe,grant:scene",
    DREAM_MACHINE_PASSPORT_MAP: undefined,
    DREAM_MACHINE_DEFAULT_PASSPORT_HASH: undefined,
  }, () => {
    const identity = resolvePortalIdentity({
      principalId: "user-1",
      authenticator: "app",
      issuer: "app",
      attributes: { supabase_user_id: "supa-abc" },
    });
    assert.ok(identity);
    assert.equal(identity.lab_id, "lab:dan");
    assert.equal(identity.passport_hash, null);
    assert.equal(identity.supabase_user_id, "supa-abc");
    assert.equal(identity.connector_boundary, "app");
    assert.ok(identity.grants.includes("grant:observe"));
    assert.equal(identity.read_only, true);
  });
});

test("resolvePortalIdentity returns null without principal", () => {
  assert.equal(resolvePortalIdentity(null), null);
});