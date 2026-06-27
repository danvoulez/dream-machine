import assert from "node:assert/strict";
import test from "node:test";
import {
  PreviewEnvConfigError,
  assertPreviewEnvSafe,
  auditPreviewEnv,
  validatePreviewEnv,
} from "../server/utils/preview-env-guard.ts";

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

test("preview: airlock commit token rejects on VERCEL_ENV=preview", () => {
  withEnv({
    VERCEL_ENV: "preview",
    DREAM_MACHINE_AIRLOCK_COMMIT_TOKEN: "secret",
  }, () => {
    const violations = validatePreviewEnv();
    assert.ok(violations.some((v) => v.env === "DREAM_MACHINE_AIRLOCK_COMMIT_TOKEN"));
    assert.throws(() => assertPreviewEnvSafe(), PreviewEnvConfigError);
  });
});

test("preview: runtime write token rejects on VERCEL_ENV=preview", () => {
  withEnv({
    VERCEL_ENV: "preview",
    DREAM_MACHINE_RUNTIME_WRITE_TOKEN: "secret",
  }, () => {
    const violations = validatePreviewEnv();
    assert.ok(violations.some((v) => v.env === "DREAM_MACHINE_RUNTIME_WRITE_TOKEN"));
    assert.throws(() => assertPreviewEnvSafe(), PreviewEnvConfigError);
  });
});

test("preview: runtime token without TOKEN_CLASS=read rejects", () => {
  withEnv({
    VERCEL_ENV: "preview",
    DREAM_MACHINE_RUNTIME_TOKEN: "preview-live-read",
    DREAM_MACHINE_RUNTIME_SHELL_ONLY: undefined,
  }, () => {
    const violations = validatePreviewEnv();
    assert.ok(violations.some((v) => v.code === "runtime_token_missing_class"));
    assert.throws(() => assertPreviewEnvSafe(), PreviewEnvConfigError);
  });
});

test("preview: runtime token with TOKEN_CLASS=read passes", () => {
  withEnv({
    VERCEL_ENV: "preview",
    DREAM_MACHINE_RUNTIME_TOKEN: "preview-live-read",
    DREAM_MACHINE_RUNTIME_TOKEN_CLASS: "read",
    DREAM_MACHINE_RUNTIME_URL: "https://api.lab.minilab.work",
  }, () => {
    assert.deepEqual(validatePreviewEnv(), []);
    assert.doesNotThrow(() => assertPreviewEnvSafe());
    const audit = auditPreviewEnv();
    assert.equal(audit.ok, true);
    assert.equal(audit.level, "HARD");
  });
});

test("preview: shell-only passes without runtime token", () => {
  withEnv({
    VERCEL_ENV: "preview",
    DREAM_MACHINE_RUNTIME_SHELL_ONLY: "1",
    DREAM_MACHINE_ACCEPTANCE: "1",
    DREAM_MACHINE_RUNTIME_TOKEN: undefined,
    DREAM_MACHINE_RUNTIME_TOKEN_CLASS: undefined,
  }, () => {
    assert.deepEqual(validatePreviewEnv(), []);
    assert.doesNotThrow(() => assertPreviewEnvSafe());
  });
});

test("preview: TOKEN_CLASS=write rejects even without runtime token", () => {
  withEnv({
    VERCEL_ENV: "preview",
    DREAM_MACHINE_RUNTIME_TOKEN_CLASS: "write",
  }, () => {
    assert.ok(validatePreviewEnv().some((v) => v.code === "runtime_token_forbidden_class"));
  });
});

test("preview: production deploy is not blocked by preview guard", () => {
  withEnv({
    VERCEL_ENV: "production",
    DREAM_MACHINE_RUNTIME_WRITE_TOKEN: "prod-write",
    DREAM_MACHINE_AIRLOCK_COMMIT_TOKEN: "prod-airlock",
    DREAM_MACHINE_RUNTIME_TOKEN: "prod-runtime",
    DREAM_MACHINE_RUNTIME_TOKEN_CLASS: "write",
  }, () => {
    assert.deepEqual(validatePreviewEnv(), []);
    assert.doesNotThrow(() => assertPreviewEnvSafe());
    const audit = auditPreviewEnv();
    assert.equal(audit.level, "N/A");
    assert.equal(audit.ok, true);
  });
});