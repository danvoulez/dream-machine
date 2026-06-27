import assert from "node:assert/strict";
import test from "node:test";
import type { H3Event } from "h3";
import {
  parseRuntimeBearer,
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

test("parseRuntimeBearer extracts bearer token", () => {
  assert.equal(parseRuntimeBearer("Bearer secret-token"), "secret-token");
  assert.equal(parseRuntimeBearer("Bearer   spaced  "), "spaced");
  assert.equal(parseRuntimeBearer(undefined), undefined);
  assert.equal(parseRuntimeBearer("Basic abc"), undefined);
});

test("verifyOAuthCrossingAuth fails closed without runtime token", () => {
  const prior = process.env.DREAM_MACHINE_RUNTIME_TOKEN;
  delete process.env.DREAM_MACHINE_RUNTIME_TOKEN;
  try {
    assert.throws(
      () => verifyOAuthCrossingAuth(mockEvent({ authorization: "Bearer anything" })),
      (err: unknown) => statusCode(err) === 503,
    );
  } finally {
    if (prior) process.env.DREAM_MACHINE_RUNTIME_TOKEN = prior;
  }
});

test("verifyOAuthCrossingAuth rejects missing or wrong bearer", () => {
  const prior = process.env.DREAM_MACHINE_RUNTIME_TOKEN;
  process.env.DREAM_MACHINE_RUNTIME_TOKEN = "crossing-secret";
  try {
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
  } finally {
    if (prior) process.env.DREAM_MACHINE_RUNTIME_TOKEN = prior;
    else delete process.env.DREAM_MACHINE_RUNTIME_TOKEN;
  }
});

test("verifyProjectionRuntimeAuth allows local dev when token unset", () => {
  const prior = process.env.DREAM_MACHINE_RUNTIME_TOKEN;
  delete process.env.DREAM_MACHINE_RUNTIME_TOKEN;
  try {
    assert.doesNotThrow(() => verifyProjectionRuntimeAuth(mockEvent()));
  } finally {
    if (prior) process.env.DREAM_MACHINE_RUNTIME_TOKEN = prior;
  }
});