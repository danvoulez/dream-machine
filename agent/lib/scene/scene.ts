import { createHash } from "node:crypto";
import type { SceneReaders } from "./readers.ts";
import { composeProcessViews } from "./compose.ts";
import { resolveSalience, rankAndBound, legalMoves, proposals } from "./governor.ts";
import type {
  SceneRequest,
  SceneResponse,
  SceneRawRows,
  SceneScope,
  SceneWarning,
  ProcessView,
  LossAccounting,
  RiskTier,
} from "../../../shared/tools/scene.ts";

export type AssembleOpts = { now: number; riskByProcess?: Record<string, RiskTier> };

function sha256(obj: unknown): string {
  return "sha256:" + createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

function buildWarnings(rows: SceneRawRows, scope: SceneScope, scopedEmpty: boolean): SceneWarning[] {
  const warnings: SceneWarning[] = [];
  const loglineDbPresent = rows.meta?.logline_db_present ?? rows.watermark.logline_seq > 0;
  const envelopeDbPresent = rows.meta?.envelope_db_present ?? rows.watermark.envelope_seq > 0;
  const loglineUnavailable = !loglineDbPresent;
  const envelopeUnavailable = !envelopeDbPresent;

  if (loglineUnavailable) {
    warnings.push({ kind: "partial_source", source: "logline", message: "logline ledger empty or unavailable" });
  }
  if (envelopeUnavailable) {
    warnings.push({ kind: "partial_source", source: "envelope", message: "envelope ledger empty or unavailable" });
  }
  const scoped = Boolean(scope.content_hash || scope.process_id || scope.process);
  if (scopedEmpty && scoped && loglineDbPresent) {
    warnings.push({
      kind: "scope_not_found",
      message: "scope filter matched no process instances",
    });
  }
  return warnings;
}

function applyOp(
  op: SceneRequest["op"],
  views: ProcessView[],
  profile: ReturnType<typeof resolveSalience>,
  limit: number,
  selection?: SceneRequest["selection"],
): { items: ProcessView[]; loss: LossAccounting; focused: boolean } {
  const focusedId = selection?.focus;

  if (op === "scene.explain_loss") {
    const fullRank = rankAndBound(views, profile, views.length);
    const bounded = rankAndBound(views, profile, limit);
    const visibleIds = new Set(bounded.items.map((v) => v.id));
    const omittedItems = fullRank.items.filter((v) => !visibleIds.has(v.id));
    return {
      items: omittedItems,
      loss: {
        total_candidates: views.length,
        visible_count: omittedItems.length,
        omitted_count: bounded.items.length,
        omitted_reasons: [
          `explaining ${omittedItems.length} item(s) omitted from the ranked view`,
          ...bounded.loss.omitted_reasons,
        ],
        confidence_limits: [
          `Explains omitted items only; the primary ranked view still contains ${bounded.items.length} item(s).`,
        ],
      },
      focused: false,
    };
  }

  if (op === "scene.drill" || op === "scene.open_evidence") {
    const match = focusedId
      ? views.find((v) => v.id === focusedId || v.instance === focusedId)
      : views[0];
    const items = match ? [match] : [];
    return {
      items,
      loss: {
        total_candidates: views.length,
        visible_count: items.length,
        omitted_count: views.length - items.length,
        omitted_reasons: items.length
          ? [`focused on ${match!.id}`]
          : [focusedId ? `focus target ${focusedId} not found` : "no items to focus"],
        confidence_limits: items.length
          ? ["Supports claims about this focused item only."]
          : [],
      },
      focused: items.length > 0,
    };
  }

  const { items, loss } = rankAndBound(views, profile, limit);
  return { items, loss, focused: false };
}

export async function assembleScene(
  req: SceneRequest,
  readers: SceneReaders,
  opts: AssembleOpts,
): Promise<SceneResponse> {
  const rows = await readers.readRows(req.scope);
  const riskByProcess: Record<string, RiskTier> = {
    ...rows.risk_by_process,
    ...opts.riskByProcess,
  };
  const views = composeProcessViews(rows, { now: opts.now, riskByProcess: riskByProcess as Record<string, RiskTier> });
  const profile = resolveSalience(req.goal);
  const limit = req.limit ?? 10;
  const { items, loss, focused } = applyOp(req.op, views, profile, limit, req.selection);

  const scopedEmpty = views.length === 0
    && Boolean(req.scope.content_hash || req.scope.process_id || req.scope.process);
  const warnings = buildWarnings(rows, req.scope, scopedEmpty);

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
  const stale = warnings.some((w) => w.kind === "partial_source");
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
    warnings,
    view,
    loss_accounting: loss,
    legal_next_moves: legalMoves({
      op: req.op,
      hasItems: items.length > 0,
      hasParent: Boolean(req.parent_projection_hash),
      omitted: loss.omitted_count,
      focused,
    }),
    proposals: proposals(items),
    transform,
  };
}