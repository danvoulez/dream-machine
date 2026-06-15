import { existsSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import Database from "better-sqlite3";

const dbPath = join(process.cwd(), ".data", "auth.sqlite");

function hasUserTable() {
  if (!existsSync(dbPath)) {
    return false;
  }

  try {
    const db = new Database(dbPath, { readonly: true });
    const row = db.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = 'user'
    `).get();
    db.close();
    return !!row;
  }
  catch {
    return false;
  }
}

if (!hasUserTable()) {
  mkdirSync(dirname(dbPath), { recursive: true });

  const result = spawnSync(
    "pnpm",
    ["auth:migrate"],
    {
      cwd: process.cwd(),
      stdio: "pipe",
      env: { ...process.env, CI: "true" },
      input: "y\n",
    },
  );

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    console.error("[ensure-auth-db] Better Auth migration failed.\n", output);
    process.exit(result.status ?? 1);
  }

  console.log("[ensure-auth-db] Better Auth schema ready.");
}
