import { createHash } from "node:crypto";
import type { SceneReaders } from "./readers.ts";
import { composeProcessViews } from "./compose.ts";
import { resolveSalience, rankAndBound, legalMoves, proposals } from "./governor.ts";
import type { SceneRequest, SceneResponse, RiskTier } from "../../../shared/tools/scene.ts";

export type AssembleOpts = { now: number; riskByProcess?: Record<string, RiskTier> };

function sha256(obj: unknown): string {
  return "sha256:" + createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

export async function assembleScene(
  req: SceneRequest,
  readers: SceneReaders,
  opts: AssembleOpts,
): Promise<SceneResponse> {
  const rows = await readers.readRows(req.scope);
  const views = composeProcessViews(rows, { now: opts.now, riskByProcess: opts.riskByProcess ?? {} });
  const profile = resolveSalience(req.goal);
  const limit = req.limit ?? 10;
  const { items, loss } = rankAndBound(views, profile, limit);

  const transformSpec = {
    op: req.op,
    scope: req.scope,
    selection: req.selection ?? null,
    limit,
    profile,
    source_hashes: rows.logline_acts.map((a) => a.content_hash),
  };
  const transform = {
    source_hashes: transformSpec.source_hashes,
    model: null,
    prompt_hash: null,
    params_hash: null,
    resolved_salience: profile,
    transform_spec_hash: sha256(transformSpec),
  };
  const generatedAt = new Date(opts.now).toISOString();
  const stale = rows.watermark.envelope_seq === 0 && rows.shifts.length === 0 && rows.findings.length === 0;
  const view = {
    items,
    order: `intent_directed: ${profile.join(" > ")}`,
    filters: { scope: req.scope, ...(req.selection ?? {}) },
    limit,
  };
  const body = { op: req.op, goal: req.goal, view, loss, transform };

  return {
    projection_hash: sha256(body),
    parent_projection_hashes: req.parent_projection_hash ? [req.parent_projection_hash] : [],
    root_scope_hash: sha256(req.scope),
    op: req.op,
    goal: req.goal,
    created_at: generatedAt,
    freshness: {
      generated_at: generatedAt,
      as_of: req.as_of ?? "head",
      stale,
      ttl_ms: null,
      source_watermark: rows.watermark,
    },
    warnings: stale
      ? [{ kind: "partial_source", source: "envelope", message: "envelope ledger empty or unavailable" }]
      : [],
    view,
    loss_accounting: loss,
    legal_next_moves: legalMoves({
      op: req.op,
      hasItems: items.length > 0,
      hasParent: Boolean(req.parent_projection_hash),
      omitted: loss.omitted_count,
      focused: Boolean(req.selection?.focus),
    }),
    proposals: proposals(items),
    transform,
  };
}