// FACE owns envelope-native → dream-machine-projections.v0 mapping (T-F1).
// Bridge/python returns ledger-native shapes; this module maps them to RawProjection
// before normalizeProjection() — same normalizer path as Scene (sceneToRaw → normalize).

import type { ProjectionIntent } from "../../shared/tools/runtime-projection.js";
import { normalizeProjection, type RawProjection } from "./projection-normalizer.js";

export type ProjectionMapInput = {
  intent: ProjectionIntent;
  scope: string;
  as_of?: string;
};

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
  input: ProjectionMapInput,
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
      source_refs: { added: addedRefs, removed: removedRefs },
      open_findings: { added: addedFindings, removed: removedFindings },
      narrative_blocks: { added: addedBlocks, removed: removedBlocks, changed: changedBlocks },
      stale_changed: typeof data.stale_changed === "boolean" ? data.stale_changed : undefined,
      generated_at_delta_ms: typeof data.generated_at_delta_ms === "number" ? data.generated_at_delta_ms : undefined,
    },
    warnings: [],
    affordances: [],
  };
}

function mapLogLineProjection(
  data: Record<string, unknown>,
  input: ProjectionMapInput,
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

/** Map bridge/python payload (logline, envelope-native, diff, or portal-shaped) → RawProjection. */
export function mapRuntimeProjection(
  data: Record<string, unknown>,
  input: ProjectionMapInput,
): RawProjection {
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

/** Bridge payload → dream-machine-projections.v0 (T-F1 symmetric path with Scene). */
export function normalizeBridgeProjection(
  data: Record<string, unknown>,
  input: ProjectionMapInput,
  options?: { includeAffordances?: boolean; maxBlocks?: number },
) {
  return normalizeProjection(mapRuntimeProjection(data, input), {
    includeAffordances: options?.includeAffordances ?? true,
    maxBlocks: options?.maxBlocks,
  });
}