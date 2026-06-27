import type { SceneResponse } from "../../../shared/tools/scene.ts";
import type { ProjectionIntent, SourceRefOwner } from "../../../shared/tools/runtime-projection.ts";
import { normalizeProjection, type RawProjection } from "../projection-normalizer.js";

const OP_INTENT: Partial<Record<SceneResponse["op"], ProjectionIntent>> = {
  "scene.open": "overview",
  "scene.drill": "process_detail",
  "scene.open_evidence": "process_detail",
  "scene.explain_loss": "overview",
  "scene.refresh": "overview",
  "scene.back": "overview",
};

function sceneToRaw(scene: SceneResponse): RawProjection {
  const blocks = scene.view.items.map((item, i) => ({
    block_id: `process_view_${i + 1}`,
    kind: item.stuck ? "attention" : "summary",
    title: item.title,
    body: [
      `state=${item.state || item.flow.current}`,
      `waiting_on=${item.waiting_on}`,
      `risk=${item.risk}`,
      item.flow.next ? `next=${item.flow.next}` : null,
      item.open_findings.length ? `findings=${item.open_findings.map((f) => f.kind).join(",")}` : null,
    ].filter(Boolean).join(" · "),
    source_refs: item.source_refs,
    risk_tier: item.risk,
  }));

  if (scene.loss_accounting.omitted_count > 0) {
    blocks.unshift({
      block_id: "scene_loss_line",
      kind: "warning",
      title: "Loss accounting",
      body: `Vendo ${scene.loss_accounting.visible_count} de ${scene.loss_accounting.total_candidates}. ${scene.loss_accounting.confidence_limits.join(" ")}`,
      source_refs: scene.transform.source_hashes.slice(0, 1),
      risk_tier: "L0",
    });
  }

  const sourceRefs: Array<{ ref_kind: string; ref: string; owner: SourceRefOwner }> = scene.view.items.flatMap((item) =>
    item.source_refs.map((ref) => ({
      ref_kind: ref.length === 64 ? "content_hash" : "ref",
      ref,
      owner: "logline" as const,
    })),
  );

  if (scene.projection_hash) {
    sourceRefs.unshift({ ref_kind: "projection_hash", ref: scene.projection_hash, owner: "membrane" });
  }

  return {
    projection_id: scene.projection_hash,
    intent: OP_INTENT[scene.op] ?? "overview",
    jurisdiction: "mixed",
    default_owner: "membrane",
    freshness: {
      generated_at: scene.freshness.generated_at,
      as_of: scene.freshness.as_of,
      stale: scene.freshness.stale,
      ...(scene.freshness.ttl_ms != null ? { ttl_ms: scene.freshness.ttl_ms } : {}),
    },
    source_refs: sourceRefs,
    blocks,
    open_findings: scene.view.items.flatMap((item) => item.open_findings.map((f) => f.kind)),
    warnings: scene.warnings.map((w) => ({
      kind: w.kind === "scope_not_found" ? "partial_source" : w.kind,
      message: w.message ?? w.kind,
      source_refs: [],
    })),
    affordances: scene.legal_next_moves.map((move) => ({
      affordance_id: move.move,
      label: move.label,
      kind: "inspect",
      source_refs: scene.transform.source_hashes.slice(0, 1).map((ref) => ({
        ref_kind: "content_hash",
        ref,
        owner: "logline",
      })),
      risk_tier: "L0",
      authority_route: { owner: "membrane", approval_required: false, grants_required: [] },
      result_mode: "read_only",
      cannot_do: ["register_receipt", "dispatch_executor", "authorize_l5"],
    })),
  };
}

export function normalizeSceneProjection(scene: SceneResponse) {
  return normalizeProjection(sceneToRaw(scene), { includeAffordances: true });
}