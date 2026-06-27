import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const loglineDb = join(root, "../Dream-Machine-LogLine-Acts/.lab/lab.sqlite");
const eveBin = join(root, "node_modules/.bin/eve");

function hasModelCreds() {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim()
    || process.env.VERCEL_OIDC_TOKEN?.trim(),
  );
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < 24) {
  console.error("skip: eve eval requires Node >= 24 (use: mise exec node@24 -- pnpm test:eval)");
  process.exit(0);
}

if (!existsSync(loglineDb)) {
  console.log("skip: seeded LogLine ledger missing");
  process.exit(0);
}

if (!hasModelCreds()) {
  console.log("skip: set AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN for T-P2 agent eval");
  process.exit(0);
}

execFileSync(
  eveBin,
  ["eval", "scene-andamento", "--skip-report", "--timeout", "180000"],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, PORT: process.env.PORT ?? "3000" },
  },
);