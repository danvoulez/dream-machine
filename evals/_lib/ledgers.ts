import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const UI_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const LOGLINE_DB = join(UI_ROOT, "../Dream-Machine-LogLine-Acts/.lab/lab.sqlite");

export function ledgersSeeded(): boolean {
  return existsSync(LOGLINE_DB);
}