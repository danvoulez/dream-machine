import assert from "node:assert/strict";
import test from "node:test";
import type { H3Event } from "h3";
import {
  isProjectionAuthOpenAllowed,
  parseRuntimeBearer,
  requireRuntimeTokenForHttp,
  verifyOAuthCrossingAuth,
  verifyProjectionRuntimeAuth,
} from "../server/utils/projection-auth.ts";

function mockEvent(headers: Record<string, string> = {}): H3Event {
  return { node: { req: { headers } } } as H3Event;
}

function statusCode(err: unknown): number | undefined {
  return err && typeof err === "object" && "statusCode" in err
    ? Number((err as { statusCode: number }).statusCode)
    : undefined;
}

function statusMessage(err: unknown): string | undefined {
  return err && typeof err === "object" && "statusMessage" in err
    ? String((err as { statusMessage: string }).statusMessage)
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

test("parseRuntimeBearer extracts bearer token", () => {
  assert.equal(parseRuntimeBearer("Bearer secret-token"), "secret-token");
  assert.equal(parseRuntimeBearer("Bearer   spaced  "), "spaced");
  assert.equal(parseRuntimeBearer(undefined), undefined);
  assert.equal(parseRuntimeBearer("Basic abc"), undefined);
});

test("projection auth: production missing runtime token rejects with config_error", () => {
  withEnv({
    NODE_ENV: "production",
    DREAM_MACHINE_RUNTIME_TOKEN: undefined,
    DREAM_MACHINE_RUNTIME_SHELL_ONLY: undefined,
    DREAM_MACHINE_RUNTIME_DEV_OPEN: undefined,
    DREAM_MACHINE_ACCEPTANCE: undefined,
  }, () => {
    assert.equal(isProjectionAuthOpenAllowed(), false);
    assert.throws(
      () => verifyProjectionRuntimeAuth(mockEvent()),
      (err: unknown) => statusCode(err) === 503 && statusMessage(err) === "config_error",
    );
    assert.throws(
      () => requireRuntimeTokenForHttp(),
      /DREAM_MACHINE_RUNTIME_TOKEN required/,
    );
  });
});

test("projection auth: production requires bearer when token is set", () => {
  withEnv({
    NODE_ENV: "production",
    DREAM_MACHINE_RUNTIME_TOKEN: "prod-secret",
    DREAM_MACHINE_RUNTIME_SHELL_ONLY: undefined,
  }, () => {
    assert.throws(
      () => verifyProjectionRuntimeAuth(mockEvent()),
      (err: unknown) => statusCode(err) === 401,
    );
    assert.throws(
      () => verifyProjectionRuntimeAuth(mockEvent({ authorization: "Bearer wrong" })),
      (err: unknown) => statusCode(err) === 401,
    );
    assert.doesNotThrow(() =>
      verifyProjectionRuntimeAuth(mockEvent({ authorization: "Bearer prod-secret" })),
    );
  });
});

test("projection auth: shell-only mode allows open access without token", () => {
  withEnv({
    NODE_ENV: "production",
    DREAM_MACHINE_RUNTIME_TOKEN: undefined,
    DREAM_MACHINE_RUNTIME_SHELL_ONLY: "1",
  }, () => {
    assert.equal(isProjectionAuthOpenAllowed(), true);
    assert.doesNotThrow(() => verifyProjectionRuntimeAuth(mockEvent()));
    assert.doesNotThrow(() => requireRuntimeTokenForHttp());
  });
});

test("projection auth: acceptance harness allows open access outside production", () => {
  withEnv({
    NODE_ENV: "development",
    DREAM_MACHINE_RUNTIME_TOKEN: undefined,
    DREAM_MACHINE_ACCEPTANCE: "1",
    DREAM_MACHINE_RUNTIME_SHELL_ONLY: undefined,
  }, () => {
    assert.doesNotThrow(() => verifyProjectionRuntimeAuth(mockEvent()));
  });
});

test("projection auth: acceptance flag does not open production", () => {
  withEnv({
    NODE_ENV: "production",
    DREAM_MACHINE_RUNTIME_TOKEN: undefined,
    DREAM_MACHINE_ACCEPTANCE: "1",
  }, () => {
    assert.throws(
      () => verifyProjectionRuntimeAuth(mockEvent()),
      (err: unknown) => statusCode(err) === 503 && statusMessage(err) === "config_error",
    );
  });
});

test("projection auth: test harness allows open access when NODE_ENV is test", () => {
  withEnv({
    NODE_ENV: "test",
    DREAM_MACHINE_RUNTIME_TOKEN: undefined,
  }, () => {
    assert.doesNotThrow(() => verifyProjectionRuntimeAuth(mockEvent()));
  });
});

test("verifyOAuthCrossingAuth fails closed without runtime token", () => {
  withEnv({ DREAM_MACHINE_RUNTIME_TOKEN: undefined }, () => {
    assert.throws(
      () => verifyOAuthCrossingAuth(mockEvent({ authorization: "Bearer anything" })),
      (err: unknown) => statusCode(err) === 503 && statusMessage(err) === "config_error",
    );
  });
});

test("verifyOAuthCrossingAuth rejects missing or wrong bearer", () => {
  withEnv({ DREAM_MACHINE_RUNTIME_TOKEN: "crossing-secret" }, () => {
    assert.throws(
      () => verifyOAuthCrossingAuth(mockEvent()),
      (err: unknown) => statusCode(err) === 401,
    );
    assert.throws(
      () => verifyOAuthCrossingAuth(mockEvent({ authorization: "Bearer wrong" })),
      (err: unknown) => statusCode(err) === 401,
    );
    assert.doesNotThrow(() =>
      verifyOAuthCrossingAuth(mockEvent({ authorization: "Bearer crossing-secret" })),
    );
  });
});