import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const UI_ROOT = process.cwd();
const MANIFEST = join(UI_ROOT, "plugin/dream-machine-runtime/manifest.json");

test("dream-machine-runtime manifest lists every required seam file", () => {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
    name: string;
    required_files: string[];
    entrypoints: { client: { primary: string } };
  };
  assert.equal(manifest.name, "dream-machine-runtime");
  assert.ok(manifest.required_files.length >= 8);
  for (const rel of manifest.required_files) {
    assert.ok(existsSync(join(UI_ROOT, rel)), `missing: ${rel}`);
  }
  assert.equal(manifest.entrypoints.client.primary, "fetchProjectionRuntime");
});