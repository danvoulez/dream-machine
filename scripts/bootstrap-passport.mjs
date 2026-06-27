#!/usr/bin/env node
/**
 * Mint operator passport in LogLine and write content_hash to .env.hybrid.generated.
 *
 * Usage:
 *   node scripts/bootstrap-passport.mjs
 *   node scripts/bootstrap-passport.mjs --who "lab:dan" --this "Dan operator"
 *
 * Requires: Dream-Machine-LogLine-Acts on disk, python3, LAB_DB or KERNEL .lab/lab.sqlite
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const UI_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const WS_ROOT = dirname(UI_ROOT);

function loadWorkspaceEnv() {
  const path = join(WS_ROOT, ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const key = t.slice(0, eq).trim();
    const val = t.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}
loadWorkspaceEnv();
const KERNEL_ROOT = join(WS_ROOT, "Dream-Machine-LogLine-Acts");
const GENERATED_ENV = join(UI_ROOT, ".env.hybrid.generated");

const argv = process.argv.slice(2);
function flag(name, fallback = "") {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
}

const who = flag("--who", "lab.operator");
const thisLabel = flag("--this", "Dream Machine operator passport");

function parseEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    out[t.slice(0, eq)] = t.slice(eq + 1);
  }
  return out;
}

function writeEnv(entries) {
  const header = [
    "# Generated/updated by Dream Machine bootstrap",
    "# passport_hash = LogLine content_hash (sole authoritative identity)",
    "",
  ];
  const lines = [...header];
  for (const [k, v] of Object.entries(entries)) {
    lines.push(v === "" || v === undefined ? `${k}=` : `${k}=${v}`);
  }
  lines.push("");
  writeFileSync(GENERATED_ENV, lines.join("\n"), "utf8");
}

function resolveDb() {
  const explicit = process.env.LAB_DB?.trim();
  if (explicit && existsSync(explicit)) return explicit;
  const labData = "/Lab/data/lab.sqlite";
  if (existsSync(labData)) return labData;
  const local = join(KERNEL_ROOT, ".lab/lab.sqlite");
  if (existsSync(local)) return local;
  return local;
}

if (!existsSync(join(KERNEL_ROOT, "lab/cli.py"))) {
  console.error(`error: KERNEL not found: ${KERNEL_ROOT}`);
  process.exit(1);
}

const db = resolveDb();
const py = spawnSync(
  "python3",
  [
    "-m", "lab.cli", "register",
    "--who", who,
    "--did", "registered",
    "--this", thisLabel,
    "--confirmed_by", "bootstrap-passport",
    "--if_ok", "memory-register.v1",
    "--if_doubt", "attention-raise.v1",
    "--if_not", "stop",
    "--status", "registered",
  ],
  {
    cwd: KERNEL_ROOT,
    encoding: "utf8",
    env: { ...process.env, LAB_DB: db },
  },
);

if (py.status !== 0) {
  console.error(py.stderr || py.stdout);
  process.exit(py.status ?? 1);
}

let receipt;
try {
  receipt = JSON.parse(py.stdout);
} catch {
  console.error("error: could not parse lab.cli output");
  console.error(py.stdout);
  process.exit(1);
}

const passportHash = receipt.id || receipt.hashes?.content_hash;
if (!passportHash || !/^[0-9a-f]{64}$/.test(passportHash)) {
  console.error("error: invalid passport hash from receipt", receipt);
  process.exit(1);
}

const merged = {
  ...parseEnv(GENERATED_ENV),
  DREAM_MACHINE_DEFAULT_PASSPORT_HASH: passportHash,
};

writeEnv(merged);
console.log(`passport_hash: ${passportHash}`);
console.log(`wrote DREAM_MACHINE_DEFAULT_PASSPORT_HASH → ${GENERATED_ENV}`);
console.log("next: pnpm bootstrap:hybrid vercel  (re-push env if needed)");