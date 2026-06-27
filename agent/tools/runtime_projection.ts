// Dream Machine portal tool: runtime_projection (read-only, non-authoritative).
// DEPRECATED — use the `scene` tool. Enabled only when DREAM_MACHINE_ENABLE_LEGACY_PROJECTION=1.

import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  PROJECTION_INTENTS,
  PORTAL_READ_ONLY_CANNOT_DO,
  type ProjectionJurisdiction,
  type ProjectionResponse,
  type SourceRefOwner,
} from "../../shared/tools/runtime-projection.js";
import {
  fetchProjectionRuntime,
  hasLocalLedger,
  preferredJurisdiction as preferredJurisdictionForIntent,
  resolveRuntimeUrl,
  type LegacyProjectionRequest,
} from "../lib/projection-bridge.js";
import { mapRuntimeProjection } from "../lib/projection-portal.js";
import { normalizeProjection, type RawProjection } from "../lib/projection-normalizer.js";

export { mapRuntimeProjection } from "../lib/projection-portal.js";

const REQUIRED_CANNOT_DO = [...PORTAL_READ_ONLY_CANNOT_DO] as const;

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

export function preferredJurisdiction(input: RuntimeProjectionInput): ProjectionJurisdiction {
  return preferredJurisdictionForIntent(input.intent);
}

function toLegacyRequest(input: RuntimeProjectionInput): LegacyProjectionRequest {
  return {
    intent: input.intent,
    scope: input.scope,
    filters: input.filters ?? null,
    as_of: input.as_of ?? null,
    audience: input.audience ?? "operator",
    max_blocks: input.max_blocks ?? null,
    preferred_jurisdiction: preferredJurisdiction(input),
  };
}

function defaultOwnerFor(jurisdiction: ProjectionJurisdiction): SourceRefOwner {
  if (jurisdiction === "logline") return "logline";
  if (jurisdiction === "envelope") return "envelope";
  return "membrane";
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

async function fetchRuntimeProjection(input: RuntimeProjectionInput): Promise<RawProjection> {
  if (!resolveRuntimeUrl() && !hasLocalLedger()) {
    return stubProjection(input, "no runtime URL configured and no local runtime DB available");
  }
  try {
    const data = await fetchProjectionRuntime(toLegacyRequest(input));
    return mapRuntimeProjection(data, input);
  } catch {
    return stubProjection(input, "projection runtime unavailable");
  }
}

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