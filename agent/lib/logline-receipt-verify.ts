import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { resolveUiRoot } from "./projection-bridge.js";

export type LoglineReceiptVerifyResult = {
  ok: boolean;
  message: string;
};

function resolveLoglineRoot(): string {
  return join(dirname(resolveUiRoot()), "Dream-Machine-LogLine-Acts");
}

/** Verify a LogLine receipt via the KERNEL mint/verify implementation (subprocess). */
export function verifyLoglineReceipt(act: Record<string, unknown>): LoglineReceiptVerifyResult {
  const loglineRoot = resolveLoglineRoot();
  if (!existsSync(join(loglineRoot, "lab/receipt.py"))) {
    return { ok: false, message: "LogLine receipt verifier unavailable" };
  }

  const py = spawnSync(
    "python3",
    [
      "-c",
      `import json, sys
from lab.receipt import verify
act = json.loads(sys.argv[1])
ok, msg = verify(act)
print(json.dumps({"ok": ok, "message": msg}))`,
      JSON.stringify(act),
    ],
    { cwd: loglineRoot, encoding: "utf8" },
  );

  if (py.status !== 0) {
    return { ok: false, message: py.stderr?.trim() || "receipt verify subprocess failed" };
  }

  try {
    return JSON.parse(py.stdout.trim()) as LoglineReceiptVerifyResult;
  } catch {
    return { ok: false, message: "receipt verify returned invalid JSON" };
  }
}