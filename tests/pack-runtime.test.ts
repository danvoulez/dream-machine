import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const UI_ROOT = process.cwd();
const WS_ROOT = dirname(UI_ROOT);
const MANIFEST = join(UI_ROOT, "plugin/dream-machine-runtime/manifest.json");

test("dream-machine manifest lists every organelle seam file", () => {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as {
    name: string;
    organelles: Record<string, { repo: string; required_files: string[] }>;
    entrypoints: { client: { primary: string } };
  };
  assert.equal(manifest.name, "dream-machine");
  assert.ok(manifest.organelles.face);
  assert.ok(manifest.organelles.kernel);
  assert.ok(manifest.organelles.spine);

  for (const [key, spec] of Object.entries(manifest.organelles)) {
    assert.ok(spec.required_files.length >= 1, `${key} has no required_files`);
    const repoRoot = join(WS_ROOT, spec.repo);
    for (const rel of spec.required_files) {
      assert.ok(existsSync(join(repoRoot, rel)), `${key} missing: ${spec.repo}/${rel}`);
    }
  }
  assert.equal(manifest.entrypoints.client.primary, "fetchProjectionRuntime");
});