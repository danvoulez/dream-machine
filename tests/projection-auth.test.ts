import assert from "node:assert/strict";
import test from "node:test";
import { parseRuntimeBearer } from "../server/utils/projection-auth.ts";

test("parseRuntimeBearer extracts bearer token", () => {
  assert.equal(parseRuntimeBearer("Bearer secret-token"), "secret-token");
  assert.equal(parseRuntimeBearer("Bearer   spaced  "), "spaced");
  assert.equal(parseRuntimeBearer(undefined), undefined);
  assert.equal(parseRuntimeBearer("Basic abc"), undefined);
});