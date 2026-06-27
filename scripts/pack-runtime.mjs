#!/usr/bin/env node
/**
 * T-P1 pack — verify and seal the one runtime plugin bundle.
 *
 * Usage: node scripts/pack-runtime.mjs [--skip-test]
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const UI_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const MANIFEST_PATH = join(UI_ROOT, "plugin/dream-machine-runtime/manifest.json");
const PACK_DIR = join(UI_ROOT, ".pack");
const PACK_RECEIPT = join(PACK_DIR, "dream-machine-runtime.json");
const skipTest = process.argv.includes("--skip-test");

function sha256File(path) {
  const data = readFileSync(path);
  return createHash("sha256").update(data).digest("hex");
}

function run(label, cmd, args) {
  process.stdout.write(`\n→ ${label}\n`);
  const result = spawnSync(cmd, args, { cwd: UI_ROOT, encoding: "utf8", stdio: "inherit" });
  if (result.status !== 0) {
    process.stderr.write(`pack failed at: ${label}\n`);
    process.exit(result.status ?? 1);
  }
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
process.stdout.write(`Packing ${manifest.name} v${manifest.version} (T-P1)\n`);

const missing = [];
const files = {};
for (const rel of manifest.required_files) {
  const abs = join(UI_ROOT, rel);
  if (!existsSync(abs)) {
    missing.push(rel);
  } else {
    files[rel] = sha256File(abs);
  }
}
if (missing.length) {
  process.stderr.write(`Missing required files:\n${missing.map((f) => `  - ${f}`).join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`  ✓ ${Object.keys(files).length} required files present\n`);

run("install:runtime", "node", ["scripts/install-runtime.mjs"]);
run("contracts:validate", "node", ["scripts/validate-dream-machine-contracts.mjs"]);
if (!skipTest) {
  run("motor tests", "node", ["scripts/run-tests.mjs"]);
}

const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: UI_ROOT, encoding: "utf8" });
const receipt = {
  name: manifest.name,
  version: manifest.version,
  task: manifest.task,
  packed_at: new Date().toISOString(),
  git_commit: git.status === 0 ? git.stdout.trim() : null,
  entrypoints: manifest.entrypoints,
  portal_tools: manifest.portal_tools,
  files,
};

mkdirSync(PACK_DIR, { recursive: true });
writeFileSync(PACK_RECEIPT, `${JSON.stringify(receipt, null, 2)}\n`);

process.stdout.write(`\nPack receipt: ${PACK_RECEIPT}\n`);
process.stdout.write("Runtime plugin pack OK.\n");