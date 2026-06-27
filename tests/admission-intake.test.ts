import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import type { H3Event } from "h3";
import { resolveUiRoot } from "../agent/lib/projection-bridge.ts";
import { verifyAdmissionIntakeAuth } from "../server/utils/admission-auth.ts";
import {
  ADMISSION_INTAKE_LEDGER_MUTATION,
  handleAdmissionIntake,
  resetAdmissionIntakeRecords,
} from "../server/utils/admission-intake.ts";

const VALID_HASH = "91c381ec1ca35c3414ea7138411e32da0c34c7d10cd8a0769586250c1f4a1441";
const UI_ROOT = resolveUiRoot();

function mockEvent(headers: Record<string, string> = {}): H3Event {
  return { node: { req: { headers } } } as H3Event;
}

function statusCode(err: unknown): number | undefined {
  return err && typeof err === "object" && "statusCode" in err
    ? Number((err as { statusCode: number }).statusCode)
    : undefined;
}

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

function harmlessProposal(overrides: Record<string, unknown> = {}) {
  return {
    kind: "proposal",
    actor: { passport_hash: VALID_HASH, lab_id: "lab:dan" },
    source: { surface: "test" },
    intent: { action: "request_human_approval", reason: "needs decision", payload: { targets: ["q1"] } },
    ...overrides,
  };
}

test("admission: valid passport_hash returns committed:false", () => {
  resetAdmissionIntakeRecords();
  const result = handleAdmissionIntake(harmlessProposal());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.admitted, false);
  assert.equal(result.committed, false);
  assert.equal(result.route_class, "proposal-only");
  assert.match(result.proposal_id, /^[0-9a-f]{64}$/);
  assert.ok(result.cannot_do.includes("register_receipt"));
});

test("admission: lab:dan actor passport_hash rejects", () => {
  const result = handleAdmissionIntake(harmlessProposal({
    actor: { passport_hash: "lab:dan", lab_id: "lab:dan" },
  }));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "invalid_passport");
});

test("admission: malformed passport_hash rejects", () => {
  const result = handleAdmissionIntake(harmlessProposal({
    actor: { passport_hash: "not-a-hash" },
  }));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "invalid_passport");
});

test("admission: register_receipt request rejects", () => {
  const result = handleAdmissionIntake(harmlessProposal({
    intent: { action: "register_receipt", payload: {} },
  }));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "forbidden_operation");
});

test("admission: mutate_ledger request rejects", () => {
  const result = handleAdmissionIntake(harmlessProposal({
    intent: { action: "inspect", payload: { op: "mutate_ledger" } },
  }));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "forbidden_operation");
});

test("admission: close_run request rejects", () => {
  const result = handleAdmissionIntake(harmlessProposal({
    intent: { action: "close_run" },
  }));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "forbidden_operation");
});

test("admission: effect.commit request rejects", () => {
  const result = handleAdmissionIntake(harmlessProposal({
    intent: { action: "effect.commit" },
  }));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "forbidden_operation");
});

test("admission: airlock.commit request rejects", () => {
  const result = handleAdmissionIntake(harmlessProposal({
    intent: { action: "request_approval", payload: { capability: "airlock.commit" } },
  }));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.reason, "forbidden_operation");
});

test("admission: read-only runtime token cannot submit proposal", () => {
  withEnv({
    DREAM_MACHINE_ADMISSION_TOKEN: undefined,
    DREAM_MACHINE_RUNTIME_TOKEN: "read-only-token",
    DREAM_MACHINE_RUNTIME_TOKEN_CLASS: "read",
    NODE_ENV: "production",
  }, () => {
    assert.throws(
      () => verifyAdmissionIntakeAuth(mockEvent({ authorization: "Bearer read-only-token" })),
      (err: unknown) => statusCode(err) === 403,
    );
  });
});

test("admission: proposal token can submit proposal", () => {
  withEnv({
    DREAM_MACHINE_ADMISSION_TOKEN: "proposal-token",
    DREAM_MACHINE_ADMISSION_TOKEN_CLASS: "proposal",
    DREAM_MACHINE_RUNTIME_TOKEN_CLASS: "read",
    NODE_ENV: "production",
  }, () => {
    assert.doesNotThrow(() =>
      verifyAdmissionIntakeAuth(mockEvent({ authorization: "Bearer proposal-token" })),
    );
  });
});

test("admission: intake never calls LogLine append or closure code", () => {
  assert.equal(ADMISSION_INTAKE_LEDGER_MUTATION, false);
  const src = readFileSync(join(UI_ROOT, "server/utils/admission-intake.ts"), "utf8");
  assert.ok(!src.includes("lab/store"));
  assert.ok(!src.includes("Dream-Machine-LogLine-Acts"));
  assert.ok(!src.includes("executor_run_once"));
});