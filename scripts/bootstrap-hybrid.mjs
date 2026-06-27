#!/usr/bin/env node
/**
 * Hybrid deployment bootstrap — audit + automate what the CLIs can do.
 *
 * Usage:
 *   node scripts/bootstrap-hybrid.mjs audit
 *   node scripts/bootstrap-hybrid.mjs secrets
 *   node scripts/bootstrap-hybrid.mjs neon             # neonctl create project + app DB + connection strings
 *   node scripts/bootstrap-hybrid.mjs migrate          # needs DATABASE_URL in .env.hybrid.generated
 *   node scripts/bootstrap-hybrid.mjs vercel           # create/link project + push env
 *   node scripts/bootstrap-hybrid.mjs lab-env          # write LAB runtime.env (local path)
 *   node scripts/bootstrap-hybrid.mjs deploy           # pack:runtime + vercel deploy --prod
 *   node scripts/bootstrap-hybrid.mjs all              # secrets → migrate? → vercel → lab-env
 *
 * Options:
 *   --dry-run          Print actions without executing
 *   --scope TEAM       Vercel team scope (default: minilab)
 *   --project NAME     Vercel project (default: dream-machine-portal)
 *   --lab-env PATH     LAB runtime.env output (default: ./.env.lab.generated)
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const UI_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const WS_ROOT = dirname(UI_ROOT);
const GENERATED_ENV = join(UI_ROOT, ".env.hybrid.generated");

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
const DEFAULT_PROJECT = "dream-machine-portal";
const DEFAULT_NEON_PROJECT = "dream-machine";
const DEFAULT_NEON_DB = "app";
const DEFAULT_SCOPE = "minilab";
const DEFAULT_COCKPIT_URL = `https://${DEFAULT_PROJECT}.vercel.app`;
const RUNTIME_URL = "https://api.lab.minilab.work";

const argv = process.argv.slice(2);
const phase = argv.find((a) => !a.startsWith("-")) ?? "audit";
const dryRun = argv.includes("--dry-run");
const scope = flagValue("--scope") ?? process.env.VERCEL_SCOPE ?? DEFAULT_SCOPE;
const project = flagValue("--project") ?? process.env.VERCEL_PROJECT ?? DEFAULT_PROJECT;
const labEnvPath = flagValue("--lab-env") ?? join(UI_ROOT, ".env.lab.generated");

function flagValue(name) {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

function run(cmd, args, opts = {}) {
  const { cwd = UI_ROOT, input, label = `${cmd} ${args.join(" ")}` } = opts;
  if (dryRun) {
    console.log(`[dry-run] ${label}`);
    return { status: 0, stdout: "", stderr: "" };
  }
  return spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    input,
    stdio: input ? ["pipe", "pipe", "pipe"] : ["inherit", "pipe", "pipe"],
    shell: false,
  });
}

function runOrFail(cmd, args, opts = {}) {
  const result = run(cmd, args, opts);
  if (result.status !== 0) {
    const err = result.stderr?.trim() || result.stdout?.trim() || "unknown error";
    console.error(`error: ${opts.label ?? cmd} failed: ${err}`);
    process.exit(result.status ?? 1);
  }
  return result;
}

function secretB64() {
  return randomBytes(32).toString("base64");
}

function parseEnvFile(path) {
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

function writeEnvFile(path, entries, header) {
  const lines = [header, ""];
  for (const [k, v] of Object.entries(entries)) {
    if (v === undefined || v === "") lines.push(`${k}=`);
    else lines.push(`${k}=${v}`);
  }
  lines.push("");
  const body = lines.join("\n");
  if (dryRun) {
    console.log(`[dry-run] write ${path}`);
    return body;
  }
  writeFileSync(path, body, "utf8");
  return body;
}

function mergeSecrets(existing) {
  const need = ["BETTER_AUTH_SECRET", "INTERNAL_API_SECRET", "DREAM_MACHINE_RUNTIME_TOKEN"];
  const merged = { ...existing };
  for (const key of need) {
    if (!merged[key]) merged[key] = secretB64();
  }
  return merged;
}

function toolOk(cmd, args = ["--version"]) {
  const r = spawnSync(cmd, args, { encoding: "utf8", shell: false });
  return r.status === 0;
}

function vercelWhoami() {
  const r = spawnSync("vercel", ["whoami"], { encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] });
  if (r.status !== 0) return null;
  const line = r.stdout.split("\n").map((s) => s.trim()).find((s) => s && !s.startsWith("Vercel CLI"));
  return line ?? null;
}

function vercelScopeArgs() {
  return scope ? ["--scope", scope] : [];
}

function vercelProjectExists(name) {
  const r = run("vercel", ["project", "inspect", name, ...vercelScopeArgs()], {
    label: "vercel project inspect",
  });
  return r.status === 0;
}

function vercelLinked() {
  return existsSync(join(UI_ROOT, ".vercel", "project.json"));
}

function getGitOriginUrl() {
  const r = spawnSync("git", ["remote", "get-url", "origin"], {
    cwd: UI_ROOT,
    encoding: "utf8",
  });
  return r.status === 0 ? r.stdout.trim() : null;
}

function statusIcon(ok) {
  return ok ? "✓" : "✗";
}

function audit() {
  console.log("Dream Machine hybrid bootstrap — audit\n");

  const checks = [];

  const vercelUser = vercelWhoami();
  checks.push({
    item: "Vercel CLI auth",
    ok: !!vercelUser,
    detail: vercelUser ?? "run: vercel login",
  });

  checks.push({
    item: "Vercel team scope",
    ok: !!vercelUser,
    detail: scope,
  });

  const projExists = vercelProjectExists(project);
  checks.push({
    item: `Vercel project '${project}'`,
    ok: projExists,
    detail: projExists ? "exists" : `run: vercel project add ${project}`,
  });

  const linked = vercelLinked();
  checks.push({
    item: "Local .vercel link",
    ok: linked,
    detail: linked ? "linked" : `run: vercel link --project ${project} --yes`,
  });

  checks.push({
    item: "GitHub CLI",
    ok: toolOk("gh"),
    detail: toolOk("gh") ? "installed" : "brew install gh",
  });

  const remote = getGitOriginUrl();
  checks.push({
    item: "Git origin remote",
    ok: !!remote,
    detail: remote ?? "set origin URL for vercel git connect",
  });

  checks.push({
    item: "openssl",
    ok: toolOk("openssl", ["version"]),
    detail: "secret generation",
  });

  checks.push({
    item: "cloudflared",
    ok: toolOk("cloudflared"),
    detail: toolOk("cloudflared") ? "installed (LAB tunnel)" : "brew install cloudflared",
  });

  checks.push({
    item: "neonctl",
    ok: toolOk("neonctl"),
    detail: toolOk("neonctl")
      ? "installed — can create Neon project via CLI"
      : "optional: brew install neonctl (or paste DATABASE_URL manually)",
  });

  const env = parseEnvFile(GENERATED_ENV);
  checks.push({
    item: ".env.hybrid.generated",
    ok: existsSync(GENERATED_ENV),
    detail: existsSync(GENERATED_ENV) ? GENERATED_ENV : `run: bootstrap-hybrid secrets`,
  });

  checks.push({
    item: "DATABASE_URL",
    ok: !!env.DATABASE_URL,
    detail: env.DATABASE_URL
      ? "set — migrate ready"
      : "paste Neon connection string into .env.hybrid.generated",
  });

  checks.push({
    item: "Shared runtime token",
    ok: !!env.DREAM_MACHINE_RUNTIME_TOKEN,
    detail: env.DREAM_MACHINE_RUNTIME_TOKEN ? "generated" : "run: bootstrap-hybrid secrets",
  });

  const contracts = run("pnpm", ["contracts:validate"], { label: "contracts:validate" });
  checks.push({
    item: "contracts:validate",
    ok: contracts.status === 0,
    detail: contracts.status === 0 ? "pass" : "fix contract errors",
  });

  const pack = run("pnpm", ["pack:runtime", "--skip-tar"], { label: "pack:runtime" });
  checks.push({
    item: "pack:runtime seal",
    ok: pack.status === 0,
    detail: pack.status === 0 ? "pass" : "fix triple-repo seal before prod deploy",
  });

  for (const c of checks) {
    console.log(`  ${statusIcon(c.ok)} ${c.item}`);
    console.log(`      ${c.detail}`);
  }

  const manual = [
    "One-time API tokens (optional headless): VERCEL_TOKEN, NEON_API_KEY, CLOUDFLARE_API_TOKEN+ACCOUNT_ID",
    "One-time browser: cloudflared tunnel login OR vercel login OR vercel connect OAuth approve",
    "SSH key to LAB_HOST for pnpm sync:lab",
  ];

  console.log("\nMinimum manual (see docs/HYBRID_DEPLOYMENT.md):");
  for (const m of manual) console.log(`  • ${m}`);

  const automatable = [
    "pnpm bootstrap:hybrid secrets|neon|integration-neon|migrate|vercel|lab-env|deploy",
    "pnpm bootstrap:passport (LogLine register → content_hash)",
    "pnpm bootstrap:canyon (cloudflared tunnel create + route dns + service install)",
    "LAB_HOST=… pnpm sync:lab + pnpm setup:lab (rsync + golden bridge + runtime)",
    "DREAM_MACHINE_GIT_REMOTE=… pnpm bootstrap:hybrid git-remote",
    "VERCEL_TOKEN / NEON_API_KEY for fully headless CI",
  ];

  console.log("\nAutomatable (this script):");
  for (const a of automatable) console.log(`  • ${a}`);

  const blockers = checks.filter((c) => !c.ok && ["Vercel CLI auth", "DATABASE_URL"].includes(c.item));
  if (blockers.length) {
    console.log("\nNext command:");
    if (!vercelUser) console.log("  vercel login");
    else if (!existsSync(GENERATED_ENV)) console.log("  pnpm bootstrap:hybrid secrets");
    else if (!env.DATABASE_URL) {
      console.log("  # Add DATABASE_URL to .env.hybrid.generated, then:");
      console.log("  pnpm bootstrap:hybrid migrate");
    } else console.log("  pnpm bootstrap:hybrid vercel");
  } else {
    console.log("\nReady for: pnpm bootstrap:hybrid all");
  }
}

function secrets() {
  const existing = parseEnvFile(GENERATED_ENV);
  const merged = mergeSecrets(existing);

  writeEnvFile(GENERATED_ENV, merged, [
    "# Generated by scripts/bootstrap-hybrid.mjs — gitignored via .env.*",
    "# Fill DATABASE_URL from Neon console, then: pnpm bootstrap:hybrid migrate",
    "# Cockpit URL updates after first deploy if Vercel assigns a different hostname.",
  ].join("\n"));

  console.log(`wrote ${GENERATED_ENV}`);
  console.log("  BETTER_AUTH_SECRET, INTERNAL_API_SECRET, DREAM_MACHINE_RUNTIME_TOKEN");
  if (!merged.DATABASE_URL) {
    console.log("\nStill needed: DATABASE_URL=postgresql://…@…/app?sslmode=require");
  }
}

function migrate() {
  const env = parseEnvFile(GENERATED_ENV);
  if (!env.DATABASE_URL) {
    console.error("error: DATABASE_URL missing in .env.hybrid.generated");
    process.exit(1);
  }
  if (dryRun) {
    console.log("[dry-run] DATABASE_URL=… pnpm db:migrate");
    return;
  }
  const migrateUrl = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL;
  const result = spawnSync("pnpm", ["db:migrate"], {
    cwd: UI_ROOT,
    encoding: "utf8",
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: migrateUrl },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
  console.log("Neon migrations applied.");
}

function vercelEnvAdd(name, value, target, sensitive = true) {
  const args = ["env", "add", name, target, "--force"];
  if (sensitive) args.push("--sensitive");
  args.push(...vercelScopeArgs());
  runOrFail("vercel", args, {
    label: `vercel env add ${name} ${target}`,
    input: value,
  });
}

function vercelSetup() {
  const env = parseEnvFile(GENERATED_ENV);
  if (!env.BETTER_AUTH_SECRET || !env.INTERNAL_API_SECRET || !env.DREAM_MACHINE_RUNTIME_TOKEN) {
    console.error("error: run secrets first");
    process.exit(1);
  }

  if (!vercelWhoami()) {
    console.error("error: vercel login required");
    process.exit(1);
  }

  if (!vercelProjectExists(project)) {
    console.log(`creating Vercel project: ${project}`);
    runOrFail("vercel", ["project", "add", project, ...vercelScopeArgs()], {
      label: "vercel project add",
    });
  }

  if (!vercelLinked()) {
    runOrFail(
      "vercel",
      ["link", "--project", project, "--yes", ...vercelScopeArgs()],
      { label: "vercel link" },
    );
  }

  const remote = getGitOriginUrl();
  if (remote) {
    const connect = run("vercel", ["git", "connect", remote, ...vercelScopeArgs()], {
      label: "vercel git connect",
    });
    if (connect.status !== 0) {
      console.log("warn: vercel git connect — connect GitHub in dashboard if this failed");
    }
  }

  const cockpitUrl = env.BETTER_AUTH_URL || DEFAULT_COCKPIT_URL;
  const production = {
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: cockpitUrl,
    NUXT_PUBLIC_SITE_URL: cockpitUrl,
    INTERNAL_API_SECRET: env.INTERNAL_API_SECRET,
    DREAM_MACHINE_RUNTIME_URL: RUNTIME_URL,
    DREAM_MACHINE_RUNTIME_TOKEN: env.DREAM_MACHINE_RUNTIME_TOKEN,
    DREAM_MACHINE_RUNTIME_TIMEOUT_MS: "8000",
  };
  if (env.DATABASE_URL) production.DATABASE_URL = env.DATABASE_URL;
  if (env.DREAM_MACHINE_PASSPORT_MAP) production.DREAM_MACHINE_PASSPORT_MAP = env.DREAM_MACHINE_PASSPORT_MAP;
  if (env.DREAM_MACHINE_DEFAULT_PASSPORT_HASH) {
    production.DREAM_MACHINE_DEFAULT_PASSPORT_HASH = env.DREAM_MACHINE_DEFAULT_PASSPORT_HASH;
  }

  const preview = {
    ...production,
    DREAM_MACHINE_RUNTIME_SHELL_ONLY: "1",
    DREAM_MACHINE_ACCEPTANCE: "1",
  };
  delete preview.DREAM_MACHINE_RUNTIME_URL;

  console.log("pushing Production env…");
  for (const [k, v] of Object.entries(production)) {
    vercelEnvAdd(k, v, "production");
  }

  console.log("pushing Preview env…");
  for (const [k, v] of Object.entries(preview)) {
    vercelEnvAdd(k, v, "preview");
  }

  console.log("\nVercel env pushed. Still manual:");
  console.log("  • AI Gateway OIDC link (Vercel project → AI Gateway)");
  console.log("  • Root directory if monorepo: Dream-Machine-Processual-UI");
  console.log("  • Preview BETTER_AUTH_URL per-branch (or redeploy after first preview)");
}

function labEnv() {
  const env = parseEnvFile(GENERATED_ENV);
  if (!env.DREAM_MACHINE_RUNTIME_TOKEN) {
    console.error("error: run secrets first");
    process.exit(1);
  }

  writeEnvFile(
    labEnvPath,
    {
      DREAM_MACHINE_LOGLINE_DB: "/Lab/data/lab.sqlite",
      DREAM_MACHINE_ENVELOPE_DB: "/Lab/data/board.sqlite",
      DREAM_MACHINE_RUNTIME_TOKEN: env.DREAM_MACHINE_RUNTIME_TOKEN,
      PORT: "3000",
      HOST: "127.0.0.1",
    },
    [
      "# Copy to /Lab/env/runtime.env on LAB 8GB",
      "# Generated by scripts/bootstrap-hybrid.mjs",
    ].join("\n"),
  );

  console.log(`wrote ${labEnvPath}`);
  console.log("on LAB: pnpm setup:lab  (or scripts/setup-lab.sh)");
}

function deploy() {
  runOrFail("pnpm", ["pack:runtime"], { label: "pack:runtime" });
  runOrFail(
    "vercel",
    ["deploy", "--prod", ...vercelScopeArgs()],
    { label: "vercel deploy --prod" },
  );
  console.log("\nAfter deploy: set BETTER_AUTH_URL + NUXT_PUBLIC_SITE_URL to actual production URL if different.");
}

function neonSetup() {
  if (!toolOk("neonctl")) {
    console.error("error: install neonctl — brew install neonctl");
    console.error("  or use Vercel Neon-Managed integration (recommended): vercel.com/marketplace/neon");
    console.error("  then paste DATABASE_URL into .env.hybrid.generated");
    process.exit(1);
  }
  const auth = run("neonctl", ["me", "-o", "json"], { label: "neonctl me" });
  if (auth.status !== 0 && !process.env.NEON_API_KEY) {
    console.error("error: neonctl auth or set NEON_API_KEY");
    process.exit(1);
  }

  let projectId;
  const list = run("neonctl", ["projects", "list", "-o", "json"], { label: "neonctl projects list" });
  if (list.status === 0 && list.stdout) {
    try {
      const projects = JSON.parse(list.stdout);
      const found = projects?.projects?.find((p) => p.name === DEFAULT_NEON_PROJECT);
      if (found) projectId = found.id;
    } catch { /* create below */ }
  }

  if (!projectId) {
    console.log(`creating Neon project: ${DEFAULT_NEON_PROJECT}`);
    const created = runOrFail(
      "neonctl",
      ["projects", "create", "--name", DEFAULT_NEON_PROJECT, "-o", "json"],
      { label: "neonctl projects create" },
    );
    try {
      projectId = JSON.parse(created.stdout)?.project?.id ?? JSON.parse(created.stdout)?.id;
    } catch {
      console.error("error: could not parse neonctl projects create output");
      process.exit(1);
    }
  }

  runOrFail(
    "neonctl",
    ["databases", "create", DEFAULT_NEON_DB, "--project-id", projectId, "-o", "json"],
    { label: "neonctl databases create" },
  );

  const pooled = runOrFail(
    "neonctl",
    ["connection-string", DEFAULT_NEON_DB, "--project-id", projectId, "--pooled", "-o", "json"],
    { label: "neonctl connection-string pooled" },
  );
  const direct = runOrFail(
    "neonctl",
    ["connection-string", DEFAULT_NEON_DB, "--project-id", projectId, "-o", "json"],
    { label: "neonctl connection-string direct" },
  );

  let databaseUrl = "";
  let databaseUrlUnpooled = "";
  try {
    const p = JSON.parse(pooled.stdout);
    const d = JSON.parse(direct.stdout);
    databaseUrl = p.connection_uri ?? p.connection_string ?? "";
    databaseUrlUnpooled = d.connection_uri ?? d.connection_string ?? "";
  } catch {
    databaseUrl = pooled.stdout.trim();
    databaseUrlUnpooled = direct.stdout.trim();
  }

  const existing = parseEnvFile(GENERATED_ENV);
  writeEnvFile(GENERATED_ENV, {
    ...existing,
    DATABASE_URL: databaseUrl,
    DATABASE_URL_UNPOOLED: databaseUrlUnpooled,
    NEON_PROJECT_ID: projectId,
  }, [
    "# Generated/updated by bootstrap-hybrid neon",
    "# Use DATABASE_URL (pooled) on Vercel; DATABASE_URL_UNPOOLED for migrations.",
  ].join("\n"));

  console.log(`wrote DATABASE_URL to ${GENERATED_ENV}`);
  console.log("next: pnpm bootstrap:hybrid migrate && pnpm bootstrap:hybrid vercel");
}

function vercelIntegrationNeon() {
  if (!vercelWhoami()) {
    console.error("error: vercel login or set VERCEL_TOKEN");
    process.exit(1);
  }
  if (!vercelLinked()) {
    runOrFail(
      "vercel",
      ["link", "--project", project, "--yes", ...vercelScopeArgs()],
      { label: "vercel link" },
    );
  }
  const region = process.env.NEON_REGION || "aws-us-east-1";
  console.log("provisioning Neon via Vercel marketplace integration…");
  const add = run(
    "vercel",
    [
      "integration", "add", "neon",
      "--name", DEFAULT_NEON_PROJECT,
      "--metadata", `region=${region}`,
      "--environment", "production",
      "--environment", "preview",
      "--yes",
      "--format", "json",
    ],
    { label: "vercel integration add neon" },
  );
  if (add.status !== 0) {
    console.log("warn: vercel integration add failed — install Neon from dashboard or use bootstrap:hybrid neon");
    return;
  }
  const pull = run(
    "vercel",
    ["env", "pull", join(UI_ROOT, ".env.vercel.generated"), "--yes", ...vercelScopeArgs()],
    { label: "vercel env pull" },
  );
  if (pull.status === 0 && existsSync(join(UI_ROOT, ".env.vercel.generated"))) {
    const pulled = parseEnvFile(join(UI_ROOT, ".env.vercel.generated"));
    const existing = parseEnvFile(GENERATED_ENV);
    writeEnvFile(GENERATED_ENV, {
      ...existing,
      DATABASE_URL: pulled.DATABASE_URL || existing.DATABASE_URL,
      DATABASE_URL_UNPOOLED: pulled.DATABASE_URL_UNPOOLED || existing.DATABASE_URL_UNPOOLED,
    }, [
      "# Merged from vercel integration add neon + existing secrets",
    ].join("\n"));
    console.log("merged DATABASE_URL from vercel env pull");
  }
}

function setGitRemote() {
  const url = process.env.DREAM_MACHINE_GIT_REMOTE?.trim();
  if (!url) {
    console.error("error: set DREAM_MACHINE_GIT_REMOTE=https://github.com/org/repo.git");
    process.exit(1);
  }
  runOrFail("git", ["remote", "set-url", "origin", url], { label: "git remote set-url" });
  console.log(`origin → ${url}`);
}

function passport() {
  runOrFail("node", [join(UI_ROOT, "scripts/bootstrap-passport.mjs")], { label: "bootstrap-passport" });
}

function canyon() {
  runOrFail("bash", [join(UI_ROOT, "scripts/bootstrap-canyon.sh")], { label: "bootstrap-canyon" });
}

function syncLab() {
  if (!process.env.LAB_HOST) {
    console.error("error: set LAB_HOST=user@lab-host");
    process.exit(1);
  }
  runOrFail("bash", [join(UI_ROOT, "scripts/sync-lab.sh")], { label: "sync-lab" });
}

function all() {
  secrets();
  const env = parseEnvFile(GENERATED_ENV);
  if (!env.DATABASE_URL) {
    if (process.env.USE_VERCEL_NEON_INTEGRATION === "1") vercelIntegrationNeon();
    else if (toolOk("neonctl")) neonSetup();
    else console.log("\nskip neon — USE_VERCEL_NEON_INTEGRATION=1 or neonctl or paste DATABASE_URL");
  }
  const env2 = parseEnvFile(GENERATED_ENV);
  if (env2.DATABASE_URL) migrate();
  vercelSetup();
  labEnv();
  console.log("\n'all' done (cloud partial). Remaining CLI phases:");
  console.log("  pnpm bootstrap:passport     # if not done");
  console.log("  pnpm bootstrap:canyon       # on LAB after cloudflared login or API token");
  console.log("  LAB_HOST=… pnpm sync:lab && ssh $LAB_HOST 'cd /Lab/src/Dream-Machine-Processual-UI && pnpm setup:lab'");
  console.log("  pnpm bootstrap:hybrid deploy");
}

const phases = {
  audit,
  secrets,
  neon: neonSetup,
  "integration-neon": vercelIntegrationNeon,
  migrate,
  vercel: vercelSetup,
  "lab-env": labEnv,
  passport,
  canyon,
  "sync-lab": syncLab,
  "git-remote": setGitRemote,
  deploy,
  all,
};

if (!phases[phase]) {
  console.error(`unknown phase: ${phase}`);
  console.error(`phases: ${Object.keys(phases).join(", ")}`);
  process.exit(1);
}

phases[phase]();