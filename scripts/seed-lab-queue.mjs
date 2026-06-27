#!/usr/bin/env node
/**
 * Seed runtime_queue rows in the sibling LogLine ledger for richer andamento e2e.
 * Uses the legit lab writer (queue_add) — never raw sqlite inserts.
 *
 * Usage: node scripts/seed-lab-queue.mjs
 * Requires: Dream-Machine-LogLine-Acts/.lab/lab.sqlite with logline_acts present.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const UI_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const LOGLINE_ROOT = join(UI_ROOT, "../Dream-Machine-LogLine-Acts");
const LOGLINE_DB = join(LOGLINE_ROOT, ".lab/lab.sqlite");

const TARGETS = [
  { status: "open", process: "memory-register.v1" },
  { did: "inference", process: "inference.v1" },
];

function lab(args) {
  const result = spawnSync("python3", ["-m", "lab.cli", ...args], {
    cwd: LOGLINE_ROOT,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || "lab.cli failed\n");
    process.exit(result.status ?? 1);
  }
  return JSON.parse(result.stdout);
}

function sqliteOne(sql) {
  const result = spawnSync("sqlite3", [LOGLINE_DB, sql], { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || "sqlite3 failed\n");
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
}

if (!existsSync(LOGLINE_DB)) {
  console.error(`skip: ledger missing at ${LOGLINE_DB}`);
  process.exit(0);
}

for (const target of TARGETS) {
  const where = target.status
    ? `status = '${target.status}'`
    : `did = '${target.did}'`;
  const hash = sqliteOne(
    `SELECT content_hash FROM logline_acts WHERE ${where} ORDER BY inserted_at LIMIT 1;`,
  );
  if (!hash) {
    console.error(`skip: no act matching ${JSON.stringify(target)}`);
    continue;
  }
  const item = lab(["queue", "add", hash, "--process", target.process]);
  console.log(`queued ${item.process_id} ← ${hash.slice(0, 12)}… (${item.status})`);
}

const claimed = lab(["queue", "claim", "--worker", "executor"]);
if (claimed) {
  console.log(`claimed ${claimed.queue_id} (${claimed.process_id})`);
}

const count = sqliteOne("SELECT count(*) FROM runtime_queue;");
console.log(`runtime_queue rows: ${count}`);