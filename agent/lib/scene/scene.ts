import { createHash } from "node:crypto";
import type { SceneReaders } from "./readers.js";
import { composeProcessViews } from "./compose.js";
import { resolveSalience, rankAndBound, legalMoves, proposals } from "./governor.js";
import { assertSceneOpImplemented } from "./errors.js";
import { parseFilter, applyFilter, groupProcessViews, compareProcessViews } from "./filter.js";
import type {
  SceneRequest,
  SceneResponse,
  SceneRawRows,
  SceneScope,
  SceneWarning,
  ProcessView,
  LossAccounting,
  RiskTier,
} from "../../../shared/tools/scene.js";

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

function lossWithTotal(
  base: LossAccounting,
  totalCandidates: number,
  extraReasons: string[] = [],
): LossAccounting {
  return {
    total_candidates: totalCandidates,
    visible_count: base.visible_count,
    omitted_count: totalCandidates - base.visible_count,
    omitted_reasons: [...extraReasons, ...base.omitted_reasons],
    confidence_limits: base.confidence_limits,
  };
}

function applyOp(
  op: SceneRequest["op"],
  views: ProcessView[],
  profile: ReturnType<typeof resolveSalience>,
  limit: number,
  selection?: SceneRequest["selection"],
): { items: ProcessView[]; loss: LossAccounting; focused: boolean; filtered: boolean } {
  const focusedId = selection?.focus;
  const filterClauses = parseFilter(selection?.filter);
  const filteredPool = filterClauses ? applyFilter(views, filterClauses) : views;
  const isFiltered = Boolean(filterClauses) && filteredPool.length < views.length;

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
      filtered: false,
    };
  }

  if (op === "scene.compare") {
    const subset = filterClauses ? filteredPool : views.slice(0, Math.max(1, Math.floor(views.length / 2)));
    const compared = compareProcessViews(views, subset);
    const ranked = rankAndBound(compared, profile, limit);
    return {
      items: ranked.items,
      loss: lossWithTotal(ranked.loss, views.length, [
        filterClauses ? `compare filter=${selection?.filter}` : "compare default half-split baseline",
      ]),
      focused: false,
      filtered: Boolean(filterClauses),
    };
  }

  if (op === "scene.group") {
    const groupBy = selection?.group_by ?? "process_id";
    const grouped = groupProcessViews(views, groupBy);
    const ranked = rankAndBound(grouped, profile, limit);
    return {
      items: ranked.items,
      loss: lossWithTotal(ranked.loss, views.length, [`grouped by ${groupBy}`]),
      focused: false,
      filtered: false,
    };
  }

  if (op === "scene.filter") {
    const pool = filterClauses ? filteredPool : views;
    const ranked = rankAndBound(pool, profile, limit);
    const excluded = views.length - pool.length;
    return {
      items: ranked.items,
      loss: lossWithTotal(ranked.loss, views.length, [
        ...(filterClauses ? [`filter=${selection?.filter}`, ...(excluded > 0 ? [`${excluded} excluded by filter`] : [])] : ["no filter clause; showing all candidates"]),
      ]),
      focused: false,
      filtered: Boolean(filterClauses),
    };
  }

  if (op === "scene.ascend") {
    const widened = Math.min(limit * 2, 50);
    const ranked = rankAndBound(views, profile, widened);
    return {
      items: ranked.items,
      loss: lossWithTotal(ranked.loss, views.length, [`scene.ascend widened limit to ${widened}`]),
      focused: false,
      filtered: false,
    };
  }

  if (op === "scene.descend") {
    const target = focusedId ?? views[0]?.id;
    const match = target
      ? views.find((v) => v.id === target || v.instance === target)
      : undefined;
    const items = match ? [match] : [];
    return {
      items,
      loss: {
        total_candidates: views.length,
        visible_count: items.length,
        omitted_count: views.length - items.length,
        omitted_reasons: items.length
          ? [`scene.descend focused on ${match!.id}`]
          : ["scene.descend found no item to focus"],
        confidence_limits: items.length
          ? ["Supports claims about this focused item only."]
          : [],
      },
      focused: items.length > 0,
      filtered: false,
    };
  }

  if (op === "scene.back" || op === "scene.refresh") {
    const pool = filterClauses ? filteredPool : views;
    const ranked = rankAndBound(pool, profile, limit);
    return {
      items: ranked.items,
      loss: lossWithTotal(ranked.loss, views.length),
      focused: false,
      filtered: isFiltered,
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
      filtered: false,
    };
  }

  const pool = filterClauses ? filteredPool : views;
  const ranked = rankAndBound(pool, profile, limit);
  return {
    items: ranked.items,
    loss: lossWithTotal(ranked.loss, views.length, isFiltered ? [`filter=${selection?.filter}`] : []),
    focused: false,
    filtered: isFiltered,
  };
}

export async function assembleScene(
  req: SceneRequest,
  readers: SceneReaders,
  opts: AssembleOpts,
): Promise<SceneResponse> {
  assertSceneOpImplemented(req.op);
  const rows = await readers.readRows(req.scope);
  const riskByProcess: Record<string, RiskTier> = {};
  for (const [key, tier] of Object.entries({ ...rows.risk_by_process, ...opts.riskByProcess })) {
    if (tier) riskByProcess[key] = tier;
  }
  const views = composeProcessViews(rows, { now: opts.now, riskByProcess });
  const profile = resolveSalience(req.goal);
  const limit = req.limit ?? 10;
  const { items, loss, focused, filtered } = applyOp(req.op, views, profile, limit, req.selection);

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
      itemCount: items.length,
      candidateCount: views.length,
      filtered,
    }),
    proposals: proposals(items),
    transform,
  };
}