#!/usr/bin/env node
/**
 * T-P1 runtime plugin install — verify the one packaged projection seam locally.
 *
 * Checks toolchain + ledger paths, validates membrane contracts, optionally seeds
 * the lab queue, and prints the env block for HTTP-first /projection runtime.
 *
 * Usage: node scripts/install-runtime.mjs [--seed]
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const UI_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const WS_ROOT = dirname(UI_ROOT);
const LOGLINE_DB = join(WS_ROOT, "Dream-Machine-LogLine-Acts/.lab/lab.sqlite");
const ENVELOPE_DB = join(WS_ROOT, "Dream-Machine-Envelope-Ledger/.board/board.sqlite");

const seed = process.argv.includes("--seed");

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: UI_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
  return result;
}

function ok(label) {
  process.stdout.write(`  ✓ ${label}\n`);
}

function warn(label) {
  process.stdout.write(`  ⚠ ${label}\n`);
}

function fail(label) {
  process.stderr.write(`  ✗ ${label}\n`);
  process.exitCode = 1;
}

process.stdout.write("Dream Machine runtime plugin install (T-P1)\n\n");

const node = run("node", ["--version"]);
if (node.status === 0) ok(`Node ${node.stdout.trim()}`);
else fail("Node >= 24 required");

const python = run("python3", ["--version"]);
if (python.status === 0) ok(`Python ${python.stdout.trim()}`);
else fail("python3 required for projection shell bridge");

if (existsSync(join(UI_ROOT, "scripts/runtime-projection-local.py"))) {
  ok("projection bridge script present");
} else {
  fail("scripts/runtime-projection-local.py missing");
}

if (existsSync(LOGLINE_DB)) ok(`LogLine ledger: ${LOGLINE_DB}`);
else warn(`LogLine ledger missing — ${LOGLINE_DB}`);

if (existsSync(ENVELOPE_DB)) ok(`Envelope ledger: ${ENVELOPE_DB}`);
else warn(`Envelope ledger missing — run derive-from-logline in Envelope repo`);

const contracts = run("node", ["scripts/validate-dream-machine-contracts.mjs"]);
if (contracts.status === 0) ok("membrane contracts validate");
else fail("pnpm contracts:validate failed");

if (seed && existsSync(LOGLINE_DB)) {
  const seeded = run("node", ["scripts/seed-lab-queue.mjs"]);
  if (seeded.status === 0) ok("lab queue seeded");
  else warn("seed-lab-queue failed (non-fatal)");
}

process.stdout.write("\nRecommended .env (HTTP-first runtime — Manhattan workbench):\n");
process.stdout.write([
  "DREAM_MACHINE_RUNTIME_URL=http://localhost:3000",
  "DREAM_MACHINE_ACCEPTANCE=1",
  "# DREAM_MACHINE_RUNTIME_SHELL_ONLY=1  # force python bridge",
  "# DREAM_MACHINE_LOGLINE_DB=../Dream-Machine-LogLine-Acts/.lab/lab.sqlite",
  "# DREAM_MACHINE_ENVELOPE_DB=../Dream-Machine-Envelope-Ledger/.board/board.sqlite",
  "",
  "Start: pnpm dev",
  "Verify: pnpm test && DREAM_MACHINE_ACCEPTANCE=1 pnpm test:e2e",
  "Pack:   pnpm pack:runtime",
].join("\n"));

process.stdout.write("\n");
if (process.exitCode) {
  process.stderr.write("Install finished with errors.\n");
} else {
  process.stdout.write("Install checks passed.\n");
}