import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function resolveUiRoot(): string {
  if (process.env.DREAM_MACHINE_UI_ROOT) return process.env.DREAM_MACHINE_UI_ROOT;
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, "scripts/runtime-projection-local.py"))) return dir;
    dir = dirname(dir);
  }
  return join(dirname(fileURLToPath(import.meta.url)), "../..");
}

const UI_ROOT = resolveUiRoot();
export const LOGLINE_DB = join(UI_ROOT, "../Dream-Machine-LogLine-Acts/.lab/lab.sqlite");

export function ledgersSeeded(): boolean {
  return existsSync(LOGLINE_DB);
}