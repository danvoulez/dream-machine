import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { resolveUiRoot } from "./projection-bridge.js";

const execFileAsync = promisify(execFile);

export type EnvelopeVerifyIssue = {
  kind: string;
  message: string;
};

export type EnvelopeVerifyResult = {
  ok: boolean;
  issues: EnvelopeVerifyIssue[];
};

function resolveSpineRoot(): string {
  return join(dirname(resolveUiRoot()), "Dream-Machine-Envelope-Ledger");
}

/** Run SPINE verify for one stream (subprocess — keeps FACE free of SPINE bundle deps). */
export async function verifyEnvelopeStream(
  dbPath: string,
  streamId: string,
  scope: "receipts" | "all" = "receipts",
): Promise<EnvelopeVerifyResult> {
  const spineRoot = resolveSpineRoot();
  const script = join(spineRoot, "scripts/verify-stream.mjs");
  const distIndex = join(spineRoot, "dist/index.js");
  if (!existsSync(script) || !existsSync(distIndex)) {
    return {
      ok: false,
      issues: [{ kind: "verify_unavailable", message: "SPINE verify runtime unavailable" }],
    };
  }

  try {
    const { stdout } = await execFileAsync("node", [script, dbPath, streamId, scope], {
      cwd: spineRoot,
      timeout: 15_000,
    });
    const parsed = JSON.parse(stdout.trim()) as {
      ok: boolean;
      issues?: Array<{ kind: string; message: string }>;
    };
    return {
      ok: parsed.ok === true,
      issues: (parsed.issues ?? []).map((issue) => ({
        kind: issue.kind,
        message: issue.message,
      })),
    };
  } catch (err) {
    return {
      ok: false,
      issues: [{
        kind: "verify_failed",
        message: err instanceof Error ? err.message : String(err),
      }],
    };
  }
}