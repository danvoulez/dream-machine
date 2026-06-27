import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectionJurisdiction } from "../../shared/tools/runtime-projection.js";
import type { SceneRawRows, SceneScope } from "../../shared/tools/scene.js";

const execFileAsync = promisify(execFile);

export const PROJECTION_BRIDGE_TIMEOUT_MS =
  Number(process.env.DREAM_MACHINE_RUNTIME_TIMEOUT_MS) || 8000;

export function resolveUiRoot(): string {
  if (process.env.DREAM_MACHINE_UI_ROOT) return process.env.DREAM_MACHINE_UI_ROOT;
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, "scripts/runtime-projection-local.py"))) return dir;
    dir = dirname(dir);
  }
  return resolve(fileURLToPath(new URL("../../", import.meta.url)));
}

const UI_ROOT = resolveUiRoot();
const WS_ROOT = dirname(UI_ROOT);
const SCRIPT = join(UI_ROOT, "scripts/runtime-projection-local.py");

function resolveExistingPath(candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && existsSync(value)) return value;
  }
  return undefined;
}

export function resolveLoglineDbPath(): string | undefined {
  return resolveExistingPath([
    process.env.DREAM_MACHINE_LOGLINE_DB,
    process.env.LAB_DB,
    join(WS_ROOT, "Dream-Machine-LogLine-Acts/.lab/lab.sqlite"),
    join(WS_ROOT, "Dream-Machine-LogLine-Acts/.lab/test.sqlite"),
  ]);
}

export function resolveEnvelopeDbPath(): string | undefined {
  return resolveExistingPath([
    process.env.DREAM_MACHINE_ENVELOPE_DB,
    process.env.BOARD_DB,
    join(WS_ROOT, "Dream-Machine-Envelope-Ledger/.board/board.sqlite"),
    join(WS_ROOT, "Dream-Machine-Envelope-Ledger/board.sqlite"),
    join(WS_ROOT, "Dream-Machine-Envelope-Ledger/board_demo.sqlite"),
  ]);
}

async function runPython(args: string[]): Promise<Record<string, unknown>> {
  const { stdout } = await execFileAsync("python3", args, {
    timeout: PROJECTION_BRIDGE_TIMEOUT_MS,
    cwd: UI_ROOT,
  });
  const parsed = JSON.parse(stdout) as Record<string, unknown>;
  if (typeof parsed.error === "string" && parsed.error) {
    throw new Error(parsed.error);
  }
  return parsed;
}

export async function bridgeReadSceneRows(scope: SceneScope): Promise<SceneRawRows> {
  const parsed = await runPython([
    SCRIPT,
    "rows",
    resolveLoglineDbPath() ?? "",
    resolveEnvelopeDbPath() ?? "",
    JSON.stringify(scope ?? {}),
  ]);
  const { error: _ignored, ...rows } = parsed;
  return rows as SceneRawRows;
}

export type LegacyProjectionRequest = {
  intent: string;
  scope: string;
  filters?: Record<string, unknown> | null;
  as_of?: string | null;
  audience?: string;
  max_blocks?: number | null;
  preferred_jurisdiction?: ProjectionJurisdiction;
};

export function preferredJurisdiction(intent: string): ProjectionJurisdiction {
  switch (intent) {
    case "logline_receipt_detail":
      return "logline";
    case "proposal_detail":
    case "board_act_detail":
    case "arrival_detail":
    case "open_findings":
    case "waiting_on_me":
      return "envelope";
    default:
      return "mixed";
  }
}

function legacyScriptPayload(request: LegacyProjectionRequest): string {
  return JSON.stringify({
    intent: request.intent,
    scope: request.scope,
    filters: request.filters ?? null,
    as_of: request.as_of ?? null,
    audience: request.audience ?? "operator",
    max_blocks: request.max_blocks ?? null,
  });
}

async function bridgeReadLogline(request: LegacyProjectionRequest): Promise<Record<string, unknown>> {
  const dbPath = resolveLoglineDbPath();
  if (!dbPath) throw new Error("logline ledger unavailable");
  return runPython([SCRIPT, "logline", dbPath, legacyScriptPayload(request)]);
}

async function bridgeReadEnvelope(request: LegacyProjectionRequest): Promise<Record<string, unknown>> {
  const dbPath = resolveEnvelopeDbPath();
  if (!dbPath) throw new Error("envelope ledger unavailable");
  return runPython([SCRIPT, "envelope", dbPath, legacyScriptPayload(request)]);
}

function mergeMixedLegacy(
  request: LegacyProjectionRequest,
  logline: Record<string, unknown> | null,
  envelope: Record<string, unknown> | null,
): Record<string, unknown> {
  if (!logline && !envelope) {
    throw new Error("no local runtime DB available for mixed projection");
  }
  const scopeRef = request.scope.trim() || "all";
  const blocks = [
    ...(Array.isArray(envelope?.blocks) ? envelope.blocks : []),
    ...(Array.isArray(logline?.blocks) ? logline.blocks : []),
  ];
  const sourceRefs = [
    ...(Array.isArray(envelope?.source_refs) ? envelope.source_refs : []),
    ...(Array.isArray(logline?.source_refs) ? logline.source_refs : []),
  ];
  const warnings = [
    ...(Array.isArray(envelope?.warnings) ? envelope.warnings : []),
    ...(Array.isArray(logline?.warnings) ? logline.warnings : []),
    {
      kind: "mixed_jurisdiction",
      message: "Composed envelope and logline read models.",
      source_refs: [],
    },
  ];
  return {
    projection_id: `mixed_${request.intent}_${scopeRef}`,
    intent: request.intent,
    jurisdiction: "mixed",
    default_owner: "membrane",
    freshness: {
      generated_at: new Date().toISOString(),
      as_of: request.as_of ?? "head",
      stale: Boolean(
        (logline?.freshness as { stale?: boolean } | undefined)?.stale
        || (envelope?.freshness as { stale?: boolean } | undefined)?.stale,
      ),
    },
    source_refs: sourceRefs,
    blocks,
    open_findings: Array.isArray(envelope?.open_findings) ? envelope.open_findings : [],
    warnings,
    affordances: [],
  };
}

export async function bridgeReadLegacyProjection(
  request: LegacyProjectionRequest,
): Promise<Record<string, unknown>> {
  const jurisdiction = request.preferred_jurisdiction ?? preferredJurisdiction(request.intent);
  if (jurisdiction === "logline") {
    return bridgeReadLogline(request);
  }
  if (jurisdiction === "envelope") {
    return bridgeReadEnvelope(request);
  }
  const [logline, envelope] = await Promise.all([
    bridgeReadLogline(request).catch(() => null),
    bridgeReadEnvelope(request).catch(() => null),
  ]);
  return mergeMixedLegacy(request, logline, envelope);
}

export type ProjectionPostBody =
  | { mode: "rows"; scope?: SceneScope }
  | (LegacyProjectionRequest & { mode?: undefined });

export function isRowsProjectionBody(body: unknown): body is { mode: "rows"; scope?: SceneScope } {
  return Boolean(body && typeof body === "object" && (body as { mode?: string }).mode === "rows");
}

export async function handleProjectionPost(body: ProjectionPostBody): Promise<Record<string, unknown>> {
  if (isRowsProjectionBody(body)) {
    const rows = await bridgeReadSceneRows(body.scope ?? {});
    return rows as unknown as Record<string, unknown>;
  }
  if (!body.intent || !body.scope) {
    throw new Error("projection request requires intent and scope (or mode: rows)");
  }
  return bridgeReadLegacyProjection(body);
}