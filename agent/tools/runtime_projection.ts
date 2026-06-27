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
// for the live Envelope Dynamic Projection / LogLine read-model adapter without
// touching the tool contract or the normalizer.

import { defineTool } from "eve/tools";
import { z } from "zod";
import {
  PROJECTION_INTENTS,
  type ProjectionResponse,
} from "#shared/tools/runtime-projection.js";
import {
  normalizeProjection,
  type RawProjection,
} from "../lib/projection-normalizer.js";

const REQUIRED_CANNOT_DO = ["register_receipt", "dispatch_executor", "authorize_l5"] as const;

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
// The ONE place that talks to the runtime. Replace the stub body with a call to
// the Envelope Dynamic Projection runtime (preferred for cognition) and/or the
// LogLine read models (for consequence / source verification), then return the
// raw shape below. The normalizer enforces non-authority, source-ref citation,
// jurisdiction grouping, and affordance filtering regardless of the source.
async function fetchRuntimeProjection(input: RuntimeProjectionInput): Promise<RawProjection> {
  const scopeRef = input.scope.trim() || "all";
  return {
    intent: input.intent,
    jurisdiction: "envelope",
    default_owner: "envelope",
    freshness: {
      generated_at: new Date().toISOString(),
      as_of: input.as_of ?? "head",
      stale: false,
      rebuild_reason: "stub source adapter (no live runtime wired yet)",
    },
    source_refs: [{ ref_kind: "scope", ref: scopeRef, owner: "envelope" }],
    blocks: [
      {
        block_id: "block_summary",
        kind: "summary",
        title: `Projection: ${input.intent}`,
        body:
          `Read-only projection for intent "${input.intent}" over scope "${scopeRef}". ` +
          `This view is observation-only and registers no consequence. ` +
          `Wire fetchRuntimeProjection to the live Envelope/LogLine runtime to replace this body.`,
        source_refs: [scopeRef],
      },
    ],
    open_findings: [],
    warnings: [],
    affordances: [],
  };
}
// -----------------------------------------------------------------------------

export default defineTool({
  description:
    "Request a read-only Dream Machine runtime projection (overview, waiting_on_me, open_findings, danger_review, …) and return a non-authoritative, render-ready view with source refs, warnings, declared affordances, and explicit cannot_do limits. Never registers receipts, dispatches executors, mutates a ledger, or authorizes L5.",
  inputSchema,
  async execute(input: RuntimeProjectionInput): Promise<RuntimeProjectionResult> {
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
