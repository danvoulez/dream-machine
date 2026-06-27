#!/usr/bin/env node
/**
 * Triple organelle pack — verify and seal KERNEL + SPINE + FACE as one Dream Machine copy.
 *
 * Usage: node scripts/pack-runtime.mjs [--skip-test] [--skip-spine-test]
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const UI_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const WS_ROOT = dirname(UI_ROOT);
const MANIFEST_PATH = join(UI_ROOT, "plugin/dream-machine-runtime/manifest.json");
const PACK_DIR = join(UI_ROOT, ".pack");
const PACK_RECEIPT = join(PACK_DIR, "dream-machine.json");
const PACK_RECEIPT_LEGACY = join(PACK_DIR, "dream-machine-runtime.json");
const skipTest = process.argv.includes("--skip-test");
const skipSpineTest = process.argv.includes("--skip-spine-test");
const skipTar = process.argv.includes("--skip-tar");

function sha256File(path) {
  const data = readFileSync(path);
  return createHash("sha256").update(data).digest("hex");
}

function gitCommit(repoRoot) {
  const git = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
  return git.status === 0 ? git.stdout.trim() : null;
}

function run(label, cmd, args, cwd = UI_ROOT) {
  process.stdout.write(`\n→ ${label}\n`);
  const result = spawnSync(cmd, args, { cwd, encoding: "utf8", stdio: "inherit", shell: false });
  if (result.status !== 0) {
    process.stderr.write(`pack failed at: ${label}\n`);
    process.exit(result.status ?? 1);
  }
}

function auditPreviewSeam() {
  const esbuild = join(UI_ROOT, "node_modules/.pnpm/node_modules/.bin/esbuild");
  if (!existsSync(esbuild)) {
    process.stderr.write("esbuild wrapper not found for preview env audit\n");
    process.exit(1);
  }
  const out = join(UI_ROOT, ".tmp/preview-env-audit.mjs");
  mkdirSync(dirname(out), { recursive: true });
  execFileSync(esbuild, [
    join(UI_ROOT, "scripts/preview-env-audit-entry.mjs"),
    "--bundle",
    "--platform=node",
    "--format=esm",
    `--outfile=${out}`,
  ], { cwd: UI_ROOT, stdio: "pipe" });
  const stdout = execFileSync(process.execPath, [out], { cwd: UI_ROOT, encoding: "utf8" });
  return JSON.parse(stdout.trim());
}

function hashOrganelle(organelleKey, spec) {
  const repoRoot = join(WS_ROOT, spec.repo);
  if (!existsSync(repoRoot)) {
    process.stderr.write(`Missing organelle repo: ${spec.repo}\n`);
    process.exit(1);
  }

  const files = {};
  const missing = [];
  for (const rel of spec.required_files) {
    const abs = join(repoRoot, rel);
    if (!existsSync(abs)) missing.push(`${spec.repo}/${rel}`);
    else files[rel] = sha256File(abs);
  }

  const artifacts = {};
  const missingArtifacts = [];
  for (const rel of spec.ledger_artifacts ?? []) {
    const abs = join(repoRoot, rel);
    if (!existsSync(abs)) missingArtifacts.push(`${spec.repo}/${rel}`);
    else artifacts[rel] = sha256File(abs);
  }

  if (missing.length) {
    process.stderr.write(`Missing required files:\n${missing.map((f) => `  - ${f}`).join("\n")}\n`);
    process.exit(1);
  }

  process.stdout.write(
    `  ✓ ${organelleKey} (${spec.repo}): ${Object.keys(files).length} files`
    + (Object.keys(artifacts).length ? `, ${Object.keys(artifacts).length} ledger artifact(s)` : "")
    + (missingArtifacts.length ? `, ${missingArtifacts.length} ledger artifact(s) absent` : "")
    + "\n",
  );

  return {
    repo: spec.repo,
    role: spec.role,
    path: repoRoot,
    git_commit: gitCommit(repoRoot),
    files,
    ledger_artifacts: artifacts,
    ledger_artifacts_missing: missingArtifacts,
  };
}

function stagePackedFiles(stagingRoot, spec) {
  const repoRoot = join(WS_ROOT, spec.repo);
  const destRoot = join(stagingRoot, spec.repo);
  const copyPaths = [...spec.required_files, ...(spec.ledger_artifacts ?? [])];
  for (const rel of copyPaths) {
    const src = join(repoRoot, rel);
    if (!existsSync(src)) continue;
    const dest = join(destRoot, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
  }
}

function writeTarball(stagingDir, bundleName, tarballPath) {
  run("archive tarball", "tar", ["-czf", tarballPath, "-C", dirname(stagingDir), bundleName]);
  return sha256File(tarballPath);
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
process.stdout.write(`Packing ${manifest.name} v${manifest.version} (${manifest.task})\n`);

const organelles = {};
for (const [key, spec] of Object.entries(manifest.organelles)) {
  organelles[key] = hashOrganelle(key, spec);
}

run("install:runtime", "node", ["scripts/install-runtime.mjs"]);
run("contracts:validate", "node", ["scripts/validate-dream-machine-contracts.mjs"]);

if (!skipTest) {
  run("FACE motor tests", "node", ["scripts/run-tests.mjs"]);

  const kernelVerify = manifest.verify?.kernel?.test;
  if (kernelVerify) {
    const kernelRoot = join(WS_ROOT, manifest.organelles.kernel.repo);
    const relPython = kernelVerify.python ?? "python3";
    const kernelPython = join(kernelRoot, relPython);
    const python = existsSync(kernelPython) ? kernelPython : relPython;
    const pytestArgs = ["-m", kernelVerify.module, ...(kernelVerify.args ?? [])];
    run("KERNEL oauth seam tests", python, pytestArgs, kernelRoot);
  }

  const spineRoot = join(WS_ROOT, manifest.organelles.spine.repo);
  if (manifest.verify?.spine?.build) {
    run("SPINE build", "pnpm", ["build"], spineRoot);
  }
  if (!skipSpineTest && manifest.verify?.spine?.test) {
    run("SPINE tests", "pnpm", ["test"], spineRoot);
  }
}

process.stdout.write("\n→ preview env guard audit\n");
const previewSeam = auditPreviewSeam();
process.stdout.write(`  ✓ ${previewSeam.seam} (${previewSeam.level}): ${previewSeam.checked}\n`);

const receipt = {
  name: manifest.name,
  version: manifest.version,
  task: manifest.task,
  packed_at: new Date().toISOString(),
  workspace_root: WS_ROOT,
  organelles,
  entrypoints: manifest.entrypoints,
  portal_tools: manifest.portal_tools,
  git_commit: organelles.face?.git_commit ?? null,
  files: organelles.face?.files ?? {},
  seams: {
    "preview.seam": previewSeam,
  },
};

mkdirSync(PACK_DIR, { recursive: true });

let archive = null;
if (!skipTar) {
  const bundleName = `${manifest.name}-${manifest.version}`;
  const stagingParent = join(PACK_DIR, "staging");
  const stagingRoot = join(stagingParent, bundleName);
  rmSync(stagingParent, { recursive: true, force: true });
  mkdirSync(stagingRoot, { recursive: true });

  for (const spec of Object.values(manifest.organelles)) {
    stagePackedFiles(stagingRoot, spec);
  }

  const tarballName = `${bundleName}.tar.gz`;
  const tarballPath = join(PACK_DIR, tarballName);
  writeFileSync(join(stagingRoot, "dream-machine.json"), `${JSON.stringify(receipt, null, 2)}\n`);
  const tarballSha = writeTarball(stagingRoot, bundleName, tarballPath);
  archive = {
    path: tarballPath,
    name: tarballName,
    sha256: tarballSha,
    bundle: bundleName,
  };
  receipt.archive = archive;
  process.stdout.write(`  ✓ tarball staged (${Object.keys(manifest.organelles).length} organelles)\n`);
}

const json = `${JSON.stringify(receipt, null, 2)}\n`;
writeFileSync(PACK_RECEIPT, json);
writeFileSync(PACK_RECEIPT_LEGACY, json);

process.stdout.write(`\nPack receipt: ${PACK_RECEIPT}\n`);
process.stdout.write(`Legacy alias:   ${PACK_RECEIPT_LEGACY}\n`);
if (archive) {
  process.stdout.write(`Tarball:        ${archive.path}\n`);
  process.stdout.write(`Tarball sha256: ${archive.sha256}\n`);
}
process.stdout.write("Dream Machine triple pack OK.\n");