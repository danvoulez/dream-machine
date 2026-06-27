import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { SceneRawRows, SceneScope } from "../../../shared/tools/scene.ts";

const execFileAsync = promisify(execFile);

function resolveUiRoot(): string {
  if (process.env.DREAM_MACHINE_UI_ROOT) return process.env.DREAM_MACHINE_UI_ROOT;
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, "scripts/runtime-projection-local.py"))) return dir;
    dir = dirname(dir);
  }
  return resolve(fileURLToPath(new URL("../../../", import.meta.url)));
}

const UI_ROOT = resolveUiRoot();
const WS_ROOT = dirname(UI_ROOT);
const SCRIPT = join(UI_ROOT, "scripts/runtime-projection-local.py");

export interface SceneReaders {
  readRows(scope: SceneScope): Promise<SceneRawRows>;
}

function loglineDb(): string | undefined {
  const p = process.env.DREAM_MACHINE_LOGLINE_DB ?? join(WS_ROOT, "Dream-Machine-LogLine-Acts/.lab/lab.sqlite");
  return existsSync(p) ? p : undefined;
}
function envelopeDb(): string | undefined {
  const p = process.env.DREAM_MACHINE_ENVELOPE_DB ?? join(WS_ROOT, "Dream-Machine-Envelope-Ledger/.board/board.sqlite");
  return existsSync(p) ? p : undefined;
}

export const bridgeReaders: SceneReaders = {
  async readRows(scope) {
    const { stdout } = await execFileAsync("python3", [
      SCRIPT, "rows", loglineDb() ?? "", envelopeDb() ?? "", JSON.stringify(scope ?? {}),
    ], { timeout: 8000, cwd: UI_ROOT });
    return JSON.parse(stdout) as SceneRawRows;
  },
};