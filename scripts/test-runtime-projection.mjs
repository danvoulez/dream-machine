import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const esbuild = join(root, "node_modules/.pnpm/node_modules/.bin/esbuild");
const input = join(root, "tests/projection-normalizer.test.ts");
const outdir = join(root, ".tmp/tests");
const outfile = join(outdir, "projection-normalizer.test.mjs");

if (!existsSync(esbuild)) {
  throw new Error("esbuild wrapper not found at node_modules/.pnpm/node_modules/.bin/esbuild");
}

mkdirSync(outdir, { recursive: true });

execFileSync(esbuild, [
  "--bundle",
  input,
  "--platform=node",
  "--format=esm",
  `--outfile=${outfile}`,
], {
  cwd: root,
  stdio: "inherit",
});

execFileSync(process.execPath, ["--test", outfile], {
  cwd: root,
  stdio: "inherit",
});
