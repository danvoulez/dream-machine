// Dream Machine portal tool: runtime_projection (read-only, non-authoritative).
//
// First runtime tool for the Processual UI portal chief (Triple Task List §5).
// It requests a runtime projection, normalizes it into the portal projection
// response contract (docs/dream-machine-projections.v0.yml), and returns a
// render-ready, non-authoritative view.
//
// Boundary (docs/dream-machine-projections.v0.yml -> tool_boundary):
//   side_effects: false. This tool MUST NOT register receipts, dispatch
//   executors, mutate either ledger, or authorize L5. It only reads and reshapes.
//
// Eve auto-discovers tools in agent/tools/, so creating this file registers it
// (same pattern as agent/tools/save_memory.ts). Unlike save_memory this tool is
// read-only, so it requires no approval.
//
// The single integration seam is `fetchRuntimeProjection`: today it returns a
// deterministic stub so the tool is callable end-to-end; swap that one function
// for live adapters that route to LogLine, Envelope, or a mixed projection
// composer without touching the tool contract or the normalizer.

import { defineTool } from "eve/tools";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { z } from "zod";
import {
  PROJECTION_INTENTS,
  type ProjectionJurisdiction,
  type ProjectionResponse,
  type SourceRefOwner,
} from "../../shared/tools/runtime-projection.js";
import {
  normalizeProjection,
  type RawProjection,
} from "../lib/projection-normalizer.js";

const REQUIRED_CANNOT_DO = ["register_receipt", "dispatch_executor", "authorize_l5"] as const;
const execFileAsync = promisify(execFile);

const inputSchema = z.object({
  intent: z
    .enum(PROJECTION_INTENTS)
    .describe("Which projection the operator is asking for."),
  scope: z
    .string()
    .min(1)
    .describe("What the projection is about: a stream id, process id, content hash, arrival id, or 'all'."),
  filters: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Optional narrowing filters passed through to the runtime."),
  as_of: z
    .string()
    .optional()
    .describe("Optional point-in-time or sequence marker for the projection."),
  audience: z
    .enum(["operator", "newcomer", "auditor"])
    .optional()
    .describe("Projection audience; defaults to operator."),
  max_blocks: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Cap on the number of rendered blocks."),
  include_affordances: z
    .boolean()
    .optional()
    .describe("Whether to include declared action affordances. Default true."),
});

export type RuntimeProjectionInput = z.infer<typeof inputSchema>;

export interface RuntimeProjectionOk {
  ok: true;
  projection: ProjectionResponse;
  notes: string[];
}

export interface RuntimeProjectionError {
  ok: false;
  reason: "projection_unavailable" | "projection_unrenderable";
  errors: { field: string; message: string }[];
  notes: string[];
  cannot_do: string[];
}

export type RuntimeProjectionResult = RuntimeProjectionOk | RuntimeProjectionError;

// --- Integration seam --------------------------------------------------------
// `fetchRuntimeProjection` is the ONE place that talks to the runtime.
//
// Live path: when DREAM_MACHINE_RUNTIME_URL is set it POSTs the request to the
// runtime's `/projection` endpoint and maps the response into the RawProjection
// shape the normalizer consumes. The runtime may answer with a LogLine read
// model, an Envelope projection, or an already-composed mixed projection.
// Optional bearer auth via DREAM_MACHINE_RUNTIME_TOKEN; timeout via
// DREAM_MACHINE_RUNTIME_TIMEOUT_MS.
//
// Fallback path: with no runtime URL configured it returns a clearly-labelled,
// stale read-only stub so the tool still works end-to-end. Either way the output
// is non-authoritative and the normalizer enforces the contract.

const RUNTIME_URL = process.env.DREAM_MACHINE_RUNTIME_URL?.trim();
const RUNTIME_TOKEN = process.env.DREAM_MACHINE_RUNTIME_TOKEN?.trim();
const RUNTIME_TIMEOUT_MS = Number(process.env.DREAM_MACHINE_RUNTIME_TIMEOUT_MS) || 8000;
const PROCESSUAL_UI_ROOT = fileURLToPath(new URL("../../", import.meta.url));
const WORKSPACE_ROOT = dirname(PROCESSUAL_UI_ROOT);
const LOGLINE_ROOT = join(WORKSPACE_ROOT, "Dream-Machine-LogLine-Acts");
const ENVELOPE_ROOT = join(WORKSPACE_ROOT, "Dream-Machine-Envelope-Ledger");
const LOCAL_PROJECTION_SCRIPT = join(PROCESSUAL_UI_ROOT, "scripts/runtime-projection-local.py");

export function preferredJurisdiction(input: RuntimeProjectionInput): ProjectionJurisdiction {
  switch (input.intent) {
    case "logline_receipt_detail":
      return "logline";
    case "proposal_detail":
    case "board_act_detail":
    case "arrival_detail":
    case "open_findings":
    case "waiting_on_me":
      return "envelope";
    case "overview":
    case "process_detail":
    case "danger_review":
    case "changes_since":
      return "mixed";
    default:
      return "mixed";
  }
}

function defaultOwnerFor(jurisdiction: ProjectionJurisdiction): SourceRefOwner {
  if (jurisdiction === "logline") return "logline";
  if (jurisdiction === "envelope") return "envelope";
  return "membrane";
}

function resolveExistingPath(candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && existsSync(value)) return value;
  }
  return undefined;
}

function resolveLogLineDbPath(): string | undefined {
  return resolveExistingPath([
    process.env.DREAM_MACHINE_LOGLINE_DB,
    process.env.LAB_DB,
    join(LOGLINE_ROOT, ".lab/lab.sqlite"),
    join(LOGLINE_ROOT, ".lab/test.sqlite"),
  ]);
}

function resolveEnvelopeDbPath(): string | undefined {
  return resolveExistingPath([
    process.env.DREAM_MACHINE_ENVELOPE_DB,
    process.env.BOARD_DB,
    join(ENVELOPE_ROOT, ".board/board.sqlite"),
    join(ENVELOPE_ROOT, "board.sqlite"),
    join(ENVELOPE_ROOT, "board_demo.sqlite"),
  ]);
}

function stubProjection(input: RuntimeProjectionInput, reason: string): RawProjection {
  const scopeRef = input.scope.trim() || "all";
  const jurisdiction = preferredJurisdiction(input);
  const owner = defaultOwnerFor(jurisdiction);
  return {
    projection_id: `stub_${input.intent}_${scopeRef}`,
    intent: input.intent,
    jurisdiction,
    default_owner: owner,
    freshness: {
      generated_at: new Date().toISOString(),
      as_of: input.as_of ?? "head",
      stale: true,
      rebuild_reason: `stub source adapter (${reason})`,
    },
    source_refs: [{ ref_kind: "scope", ref: scopeRef, owner }],
    blocks: [
      {
        block_id: "block_summary",
        kind: "summary",
        title: `Projection: ${input.intent}`,
        body:
          `Read-only stub projection for intent "${input.intent}" over scope "${scopeRef}" `
          + `(${reason}). Set DREAM_MACHINE_RUNTIME_URL to read the live LogLine/Envelope runtime. `
          + `This view is observation-only and registers no consequence.`,
        source_refs: [scopeRef],
      },
    ],
    open_findings: [],
    warnings: [],
    affordances: [],
  };
}

async function runLocalProjectionScript(
  mode: "logline" | "envelope",
  dbPath: string,
  input: RuntimeProjectionInput,
): Promise<Record<string, unknown>> {
  const { stdout } = await execFileAsync("python3", [
    LOCAL_PROJECTION_SCRIPT,
    mode,
    dbPath,
    JSON.stringify({
      intent: input.intent,
      scope: input.scope,
      filters: input.filters ?? null,
      as_of: input.as_of ?? null,
      audience: input.audience ?? "operator",
      max_blocks: input.max_blocks ?? null,
    }),
  ], {
    timeout: RUNTIME_TIMEOUT_MS,
    cwd: PROCESSUAL_UI_ROOT,
  });
  const parsed = JSON.parse(stdout) as Record<string, unknown>;
  if (typeof parsed.error === "string" && parsed.error) {
    throw new Error(parsed.error);
  }
  return parsed;
}

function toLocalFallbackNotes(mode: "logline" | "envelope", reason: string): RawProjection["warnings"] {
  return [{
    kind: "partial_source",
    message: `${mode} local adapter: ${reason}`,
    source_refs: [],
  }];
}

async function fetchLocalLogLineProjection(input: RuntimeProjectionInput): Promise<RawProjection | null> {
  const dbPath = resolveLogLineDbPath();
  if (!dbPath || !existsSync(LOCAL_PROJECTION_SCRIPT)) return null;
  const data = await runLocalProjectionScript("logline", dbPath, input);
  const projection = mapRuntimeProjection(data, input);
  projection.warnings = [...(projection.warnings ?? []), ...toLocalFallbackNotes("logline", dbPath)];
  return projection;
}

async function fetchLocalEnvelopeProjection(input: RuntimeProjectionInput): Promise<RawProjection | null> {
  const dbPath = resolveEnvelopeDbPath();
  if (!dbPath || !existsSync(LOCAL_PROJECTION_SCRIPT)) return null;
  const data = await runLocalProjectionScript("envelope", dbPath, input);
  const projection = mapRuntimeProjection(data, input);
  projection.warnings = [...(projection.warnings ?? []), ...toLocalFallbackNotes("envelope", dbPath)];
  return projection;
}

function mergeMixedProjection(
  input: RuntimeProjectionInput,
  logline: RawProjection | null,
  envelope: RawProjection | null,
): RawProjection | null {
  if (!logline && !envelope) return null;
  if (logline && !envelope) return logline;
  if (envelope && !logline) return envelope;

  return {
    projection_id: `mixed_${input.intent}_${input.scope.trim() || "all"}`,
    intent: input.intent,
    jurisdiction: "mixed",
    default_owner: "membrane",
    freshness: {
      generated_at: new Date().toISOString(),
      as_of: input.as_of ?? "head",
      stale: Boolean(logline?.freshness?.stale || envelope?.freshness?.stale),
    },
    source_refs: [...(logline?.source_refs ?? []), ...(envelope?.source_refs ?? [])],
    blocks: [...(envelope?.blocks ?? []), ...(logline?.blocks ?? [])],
    open_findings: [...(envelope?.open_findings ?? [])],
    warnings: [
      ...(envelope?.warnings ?? []),
      ...(logline?.warnings ?? []),
      {
        kind: "mixed_jurisdiction",
        message: "Local fallback composed envelope and logline read models.",
        source_refs: [],
      },
    ],
    affordances: [],
  };
}

function isLogLineProjection(data: Record<string, unknown>): boolean {
  const sources = Array.isArray(data.sources) ? data.sources.map(String) : [];
  return sources.includes("logline_acts")
    || Array.isArray(data.input_hashes)
    || typeof data.projection_spec === "string";
}

function isProjectionDiff(data: Record<string, unknown>): boolean {
  return typeof data.from_projection_hash === "string"
    && typeof data.to_projection_hash === "string"
    && typeof data.source_refs === "object"
    && typeof data.narrative_blocks === "object";
}

function mapProjectionDiff(
  data: Record<string, unknown>,
  input: RuntimeProjectionInput,
): RawProjection {
  const sourceRefsDelta = (data.source_refs ?? {}) as { added?: unknown[]; removed?: unknown[] };
  const findingsDelta = (data.open_findings ?? {}) as { added?: unknown[]; removed?: unknown[] };
  const blockDelta = (data.narrative_blocks ?? {}) as { added?: unknown[]; removed?: unknown[]; changed?: unknown[] };
  const fromProjection = String(data.from_projection_hash);
  const toProjection = String(data.to_projection_hash);
  const addedRefs = Array.isArray(sourceRefsDelta.added) ? sourceRefsDelta.added.map(String) : [];
  const removedRefs = Array.isArray(sourceRefsDelta.removed) ? sourceRefsDelta.removed.map(String) : [];
  const addedFindings = Array.isArray(findingsDelta.added) ? findingsDelta.added.map(String) : [];
  const removedFindings = Array.isArray(findingsDelta.removed) ? findingsDelta.removed.map(String) : [];
  const addedBlocks = Array.isArray(blockDelta.added) ? blockDelta.added.map(String) : [];
  const removedBlocks = Array.isArray(blockDelta.removed) ? blockDelta.removed.map(String) : [];
  const changedBlocks = Array.isArray(blockDelta.changed) ? blockDelta.changed.map(String) : [];

  const sourceRefs = [
    { ref_kind: "projection_hash", ref: fromProjection, owner: "envelope" },
    { ref_kind: "projection_hash", ref: toProjection, owner: "envelope" },
    ...addedRefs.map(ref => ({ ref_kind: "source_ref", ref, owner: "envelope" })),
    ...removedRefs.map(ref => ({ ref_kind: "source_ref", ref, owner: "envelope" })),
    ...addedFindings.map(ref => ({ ref_kind: "finding_id", ref, owner: "envelope" })),
    ...removedFindings.map(ref => ({ ref_kind: "finding_id", ref, owner: "envelope" })),
  ];

  return {
    projection_id: `diff_${fromProjection}_${toProjection}`,
    intent: input.intent,
    jurisdiction: "envelope",
    default_owner: "envelope",
    freshness: {
      generated_at: new Date().toISOString(),
      as_of: toProjection,
      stale: false,
    },
    source_refs: sourceRefs,
    blocks: [
      {
        block_id: "changes_since_summary",
        kind: "summary",
        title: "Changes since previous projection",
        body:
          `Sources +${addedRefs.length}/-${removedRefs.length}; `
          + `findings +${addedFindings.length}/-${removedFindings.length}; `
          + `blocks +${addedBlocks.length}/-${removedBlocks.length}/${changedBlocks.length} changed.`,
        source_refs: [fromProjection, toProjection],
      },
    ],
    open_findings: addedFindings,
    projection_diff: {
      from_projection_hash: fromProjection,
      to_projection_hash: toProjection,
      from_as_of_seq: typeof data.from_as_of_seq === "number" ? data.from_as_of_seq : undefined,
      to_as_of_seq: typeof data.to_as_of_seq === "number" ? data.to_as_of_seq : undefined,
      source_refs: {
        added: addedRefs,
        removed: removedRefs,
      },
      open_findings: {
        added: addedFindings,
        removed: removedFindings,
      },
      narrative_blocks: {
        added: addedBlocks,
        removed: removedBlocks,
        changed: changedBlocks,
      },
      stale_changed: typeof data.stale_changed === "boolean" ? data.stale_changed : undefined,
      generated_at_delta_ms: typeof data.generated_at_delta_ms === "number" ? data.generated_at_delta_ms : undefined,
    },
    warnings: [],
    affordances: [],
  };
}

function mapLogLineProjection(
  data: Record<string, unknown>,
  input: RuntimeProjectionInput,
): RawProjection {
  const projectionHash = typeof data.projection_hash === "string" ? data.projection_hash : undefined;
  const inputHashes = Array.isArray(data.input_hashes)
    ? (data.input_hashes as unknown[]).map(String)
    : [];
  const parentProjectionHashes = Array.isArray(data.parent_projection_hashes)
    ? (data.parent_projection_hashes as unknown[]).map(String)
    : [];
  const projectionSpec = typeof data.projection_spec === "string" ? data.projection_spec : input.scope;
  const computedAt = typeof data.computed_at === "string" ? data.computed_at : new Date().toISOString();
  const counts = data.counts && typeof data.counts === "object"
    ? data.counts as Record<string, unknown>
    : undefined;

  const sourceRefs = [
    ...(projectionHash ? [{ ref_kind: "projection_hash", ref: projectionHash, owner: "logline" }] : []),
    ...inputHashes.map(h => ({ ref_kind: "content_hash", ref: h, owner: "logline" })),
    ...parentProjectionHashes.map(h => ({ ref_kind: "projection_hash", ref: h, owner: "logline" })),
  ];
  if (sourceRefs.length === 0) {
    sourceRefs.push({ ref_kind: "scope", ref: input.scope.trim() || "all", owner: "logline" });
  }

  const actsCount = counts && typeof counts.acts === "number" ? counts.acts : inputHashes.length;

  return {
    projection_id: projectionHash ?? `logline_${projectionSpec}`,
    intent: input.intent,
    jurisdiction: "logline",
    default_owner: "logline",
    freshness: {
      generated_at: computedAt,
      as_of: projectionHash ?? input.as_of ?? "head",
      stale: false,
    },
    source_refs: sourceRefs,
    blocks: [
      {
        block_id: "logline_projection_summary",
        kind: input.intent === "logline_receipt_detail" ? "logline_receipt" : "summary",
        title: projectionSpec,
        body: `LogLine read model over ${actsCount} registered act(s). This projection is rebuildable and non-authoritative; consequence remains in content-addressed receipts.`,
        source_refs: sourceRefs.map(ref => ref.ref),
      },
    ],
    open_findings: [],
    warnings: [],
    affordances: [],
  };
}

// Map an Envelope Projection (BOARD_OBJECTS §10) — or an already-portal-shaped
// payload — into RawProjection. Tolerant of partial runtime responses.
export function mapRuntimeProjection(
  data: Record<string, unknown>,
  input: RuntimeProjectionInput,
): RawProjection {
  // If the runtime already speaks the portal contract, pass it through and let
  // the normalizer validate it.
  if (typeof data.intent === "string" && Array.isArray(data.blocks)) {
    return data as unknown as RawProjection;
  }
  if (isProjectionDiff(data)) {
    return mapProjectionDiff(data, input);
  }
  if (data.projection_diff && typeof data.projection_diff === "object") {
    const diff = data.projection_diff as Record<string, unknown>;
    if (isProjectionDiff(diff)) {
      return mapProjectionDiff(diff, input);
    }
  }
  if (isLogLineProjection(data)) {
    return mapLogLineProjection(data, input);
  }

  const projectionHash = typeof data.projection_hash === "string" ? data.projection_hash : undefined;
  const source = (data.source ?? {}) as Record<string, unknown>;
  const sanitizedBoardActHashes = Array.isArray(source.board_act_hashes)
    ? (source.board_act_hashes as unknown[]).map(String)
    : [];
  const legacyActHashes = Array.isArray(source.act_hashes)
    ? (source.act_hashes as unknown[]).map(String)
    : [];
  const boardActHashes = sanitizedBoardActHashes.length > 0 ? sanitizedBoardActHashes : legacyActHashes;
  const findingIds = Array.isArray(source.finding_ids)
    ? (source.finding_ids as unknown[]).map(String)
    : [];
  const openFindings = Array.isArray(data.open_findings)
    ? (data.open_findings as unknown[]).map(String)
    : [];
  const narrative = Array.isArray(data.narrative)
    ? (data.narrative as Record<string, unknown>[])
    : [];

  const fallbackRef = projectionHash ?? boardActHashes[0] ?? input.scope.trim() ?? "all";

  const sourceRefs: Array<{ ref_kind: string; ref: string; owner: string }> = [
    ...(projectionHash ? [{ ref_kind: "projection_hash", ref: projectionHash, owner: "envelope" }] : []),
    ...boardActHashes.map(h => ({ ref_kind: "board_act_hash", ref: h, owner: "envelope" })),
    ...findingIds.map(f => ({ ref_kind: "finding_id", ref: f, owner: "envelope" })),
  ];
  if (typeof data.built_by === "string") {
    sourceRefs.push({ ref_kind: "shift_hash", ref: data.built_by, owner: "envelope" });
  }
  if (sourceRefs.length === 0) {
    sourceRefs.push({ ref_kind: "scope", ref: String(fallbackRef), owner: "envelope" });
  }

  const generatedAtMs = typeof data.generated_at === "number" ? data.generated_at : undefined;
  const generatedAtString = typeof data.generated_at === "string" ? data.generated_at : undefined;
  const asOfSeq = typeof data.as_of_seq === "number" ? data.as_of_seq : undefined;
  const ttlMs = typeof data.ttl_ms === "number" ? data.ttl_ms : undefined;
  const stale = typeof data.stale === "boolean" ? data.stale : false;
  const rebuildReason = typeof data.rebuild_reason === "string" ? data.rebuild_reason : undefined;

  return {
    projection_id: projectionHash ?? `envelope_${input.intent}_${input.scope.trim() || "all"}`,
    intent: input.intent,
    jurisdiction: "envelope",
    default_owner: "envelope",
    freshness: {
      generated_at: generatedAtString ?? (generatedAtMs ? new Date(generatedAtMs).toISOString() : new Date().toISOString()),
      as_of: asOfSeq !== undefined ? String(asOfSeq) : (input.as_of ?? "head"),
      stale,
      ...(ttlMs !== undefined ? { ttl_ms: ttlMs } : {}),
      ...(rebuildReason ? { rebuild_reason: rebuildReason } : {}),
    },
    source_refs: sourceRefs,
    blocks: narrative.map((b, i) => ({
      block_id: typeof b.block_id === "string" ? b.block_id : `block_${i + 1}`,
      kind: b.kind === "gap" ? "finding" : (typeof b.kind === "string" ? b.kind : "summary"),
      title: typeof b.title === "string" ? b.title : "",
      body: typeof b.body === "string" ? b.body : "",
      source_refs: [typeof b.ref === "string" && b.ref ? b.ref : String(fallbackRef)],
      risk_tier: typeof b.risk === "string" ? b.risk : undefined,
    })),
    open_findings: openFindings,
    warnings: [],
    affordances: [],
  };
}

async function fetchRuntimeProjection(input: RuntimeProjectionInput): Promise<RawProjection> {
  if (!RUNTIME_URL) {
    const jurisdiction = preferredJurisdiction(input);
    if (jurisdiction === "logline") {
      const local = await fetchLocalLogLineProjection(input);
      if (local) return local;
    } else if (jurisdiction === "envelope") {
      const local = await fetchLocalEnvelopeProjection(input);
      if (local) return local;
    } else {
      const [logline, envelope] = await Promise.all([
        fetchLocalLogLineProjection(input).catch(() => null),
        fetchLocalEnvelopeProjection(input).catch(() => null),
      ]);
      const merged = mergeMixedProjection(input, logline, envelope);
      if (merged) return merged;
    }
    return stubProjection(input, "no DREAM_MACHINE_RUNTIME_URL configured and no local runtime DB available");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RUNTIME_TIMEOUT_MS);
  try {
    const res = await fetch(`${RUNTIME_URL.replace(/\/+$/, "")}/projection`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(RUNTIME_TOKEN ? { authorization: `Bearer ${RUNTIME_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        intent: input.intent,
        scope: input.scope,
        preferred_jurisdiction: preferredJurisdiction(input),
        filters: input.filters ?? null,
        as_of: input.as_of ?? null,
        audience: input.audience ?? "operator",
        max_blocks: input.max_blocks ?? null,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`runtime responded ${res.status} ${res.statusText}`);
    }
    const data = (await res.json()) as Record<string, unknown>;
    return mapRuntimeProjection(data, input);
  } finally {
    clearTimeout(timer);
  }
}
// -----------------------------------------------------------------------------

const LEGACY_PROJECTION_ENABLED = process.env.DREAM_MACHINE_ENABLE_LEGACY_PROJECTION === "1";

export default defineTool({
  description:
    "DEPRECATED — use the `scene` tool instead. Legacy read-only projection with fixed intents (overview, waiting_on_me, open_findings, …). Only active when DREAM_MACHINE_ENABLE_LEGACY_PROJECTION=1.",
  inputSchema,
  async execute(input: RuntimeProjectionInput): Promise<RuntimeProjectionResult> {
    if (!LEGACY_PROJECTION_ENABLED) {
      return {
        ok: false,
        reason: "projection_unavailable",
        errors: [{ field: "tool", message: "runtime_projection is deprecated; use the scene tool with scene.open and a goal." }],
        notes: [],
        cannot_do: [...REQUIRED_CANNOT_DO],
      };
    }
    let raw: RawProjection;
    try {
      raw = await fetchRuntimeProjection(input);
    } catch (err) {
      return {
        ok: false,
        reason: "projection_unavailable",
        errors: [{ field: "runtime", message: err instanceof Error ? err.message : String(err) }],
        notes: [],
        cannot_do: [...REQUIRED_CANNOT_DO],
      };
    }

    const result = normalizeProjection(raw, {
      includeAffordances: input.include_affordances ?? true,
      maxBlocks: input.max_blocks,
    });

    if (!result.ok || !result.response) {
      return {
        ok: false,
        reason: "projection_unrenderable",
        errors: result.errors,
        notes: result.notes,
        cannot_do: [...REQUIRED_CANNOT_DO],
      };
    }

    return { ok: true, projection: result.response, notes: result.notes };
  },
});
