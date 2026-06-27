import { readdirSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const esbuild = join(root, "node_modules/.pnpm/node_modules/.bin/esbuild");
if (!existsSync(esbuild)) throw new Error("esbuild wrapper not found");

const testsDir = join(root, "tests");
const outdir = join(root, ".tmp/tests");
mkdirSync(outdir, { recursive: true });

const files = readdirSync(testsDir).filter((f) => f.endsWith(".test.ts"));
if (files.length === 0) throw new Error("no tests found");

const outfiles = [];
for (const f of files) {
  const outfile = join(outdir, f.replace(/\.ts$/, ".mjs"));
  execFileSync(esbuild, [
    "--bundle",
    join(testsDir, f),
    "--platform=node",
    "--format=esm",
    "--external:@libsql/client",
    `--outfile=${outfile}`,
  ], { cwd: root, stdio: "inherit" });
  outfiles.push(outfile);
}
const extraArgs = process.argv.slice(2);
execFileSync(process.execPath, ["--test", ...extraArgs, ...outfiles], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, DREAM_MACHINE_UI_ROOT: root },
});