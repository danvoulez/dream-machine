// Projection normalizer (Dream Machine Triple Task List §6).
//
// Converts raw Envelope Dynamic Projection / LogLine read-model outputs into the
// portal projection-response shape defined by
//   docs/dream-machine-projections.v0.yml
//   docs/dream-machine-projections.v0.schema.json
//
// Hard rules enforced here (the membrane law for the interaction jurisdiction):
//   - The response is ALWAYS non-authoritative (`authoritative: false`).
//   - Every non-divider block MUST cite at least one source ref.
//   - Mixed-jurisdiction projections group source refs by owner and emit a
//     `mixed_jurisdiction` warning.
//   - Buttons may only be rendered from declared affordances, and an affordance
//     is dropped unless it is backed by source refs and an allowed kind/tier
//     under docs/dream-machine-actions.v0.yml.
//   - `cannot_do` always contains the required limits.
//
// This module is pure: no I/O, no ledger access, no dispatch. It only reshapes
// data it is given.

import {
  AFFORDANCE_KINDS,
  AFFORDANCE_RESULT_MODES,
  type AffordanceKind,
  type DeclaredAffordance,
  PROJECTION_BLOCK_KINDS,
  PROJECTION_INTENTS,
  PROJECTION_WARNING_KINDS,
  type ProjectionBlock,
  type ProjectionBlockKind,
  type ProjectionDiffSummary,
  type ProjectionIntent,
  type ProjectionJurisdiction,
  type ProjectionResponse,
  type ProjectionWarning,
  type ProjectionWarningKind,
  REQUIRED_CANNOT_DO,
  type RiskTier,
  type SourceRef,
  type SourceRefOwner,
  SOURCE_REF_OWNERS,
  STANDARD_CANNOT_DO,
} from "../../shared/tools/runtime-projection.js";

// ---------------------------------------------------------------------------
// Raw runtime input shapes (loose: these come from the runtime over a wire).
// ---------------------------------------------------------------------------

export interface RawSourceRef {
  ref_kind?: string;
  ref?: string;
  owner?: string;
}

export interface RawBlock {
  block_id?: string;
  kind?: string;
  title?: string;
  body?: string;
  source_refs?: Array<string | RawSourceRef>;
  risk_tier?: string;
  authority_route?: {
    owner?: string;
    required_process?: string;
    approval_required?: boolean;
    grants_required?: string[];
  };
  display_priority?: number;
}

export interface RawAffordance {
  affordance_id?: string;
  label?: string;
  kind?: string;
  source_refs?: Array<string | RawSourceRef>;
  risk_tier?: string;
  authority_route?: {
    owner?: string;
    required_process?: string;
    approval_required?: boolean;
    grants_required?: string[];
  };
  result_mode?: string;
  cannot_do?: string[];
}

export interface RawWarning {
  kind?: string;
  message?: string;
  source_refs?: Array<string | RawSourceRef>;
}

export interface RawProjection {
  projection_id?: string;
  intent?: string;
  jurisdiction?: string;
  // Defaulting source owner when a runtime omits it on a ref. Envelope Dynamic
  // Projections default to "envelope"; LogLine read models default to "logline".
  default_owner?: SourceRefOwner;
  freshness?: {
    generated_at?: string;
    as_of?: string | Record<string, string>;
    stale?: boolean;
    ttl_ms?: number;
    rebuild_reason?: string;
  };
  source_refs?: RawSourceRef[];
  blocks?: RawBlock[];
  open_findings?: string[];
  projection_diff?: ProjectionDiffSummary;
  warnings?: RawWarning[];
  affordances?: RawAffordance[];
}

const BLOCK_KIND_SET = new Set<string>(PROJECTION_BLOCK_KINDS);
const WARNING_KIND_SET = new Set<string>(PROJECTION_WARNING_KINDS);
const AFFORDANCE_KIND_SET = new Set<string>(AFFORDANCE_KINDS);
const AFFORDANCE_RESULT_MODE_SET = new Set<string>(AFFORDANCE_RESULT_MODES);
const OWNER_SET = new Set<string>(SOURCE_REF_OWNERS);
const INTENT_SET = new Set<string>(PROJECTION_INTENTS);

// Per docs/dream-machine-actions.v0.yml, each affordance kind has a maximum
// risk tier it may appear at, and L4/L5 must route through LogLine authority.
const AFFORDANCE_MAX_TIER: Record<AffordanceKind, RiskTier> = {
  inspect: "L0",
  explain: "L0",
  request_projection: "L0",
  dismiss_ui_card: "L0",
  answer_attention: "L2",
  prepare_translation_package: "L3",
  submit_receipt_proposal: "L4",
  request_grant: "L5",
};

const TIER_RANK: Record<string, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
  L5: 5,
};

export interface NormalizeError {
  field: string;
  message: string;
}

export interface NormalizeResult {
  ok: boolean;
  // Present when ok. Conforms to dream-machine-projections.v0.schema.json.
  response?: ProjectionResponse;
  // Reasons the raw projection was rejected (authority-claiming, no sources…).
  errors: NormalizeError[];
  // Non-fatal notes about what was dropped or downgraded during normalization.
  notes: string[];
}

function normalizeOwner(owner: string | undefined, fallback: SourceRefOwner): SourceRefOwner {
  if (owner && OWNER_SET.has(owner)) {
    return owner as SourceRefOwner;
  }
  return fallback;
}

function refKey(ref: SourceRef): string {
  return `${ref.owner}:${ref.ref_kind}:${ref.ref}`;
}

// Collect every distinct source ref the projection cites, from the top-level
// list plus every block/warning/affordance, defaulting owner per jurisdiction.
function collectSourceRefs(
  raw: RawProjection,
  fallbackOwner: SourceRefOwner,
): { refs: SourceRef[]; byRef: Map<string, SourceRef> } {
  const byRef = new Map<string, SourceRef>();
  const refs: SourceRef[] = [];

  function add(candidate: RawSourceRef | string | undefined) {
    if (candidate === undefined) return;
    if (typeof candidate === "string") {
      const refValue = candidate.trim();
      if (!refValue) return;
      if (refs.some(ref => ref.ref === refValue)) return;
      candidate = { ref: refValue };
    }
    const parsed: RawSourceRef = candidate;
    const refValue = parsed.ref?.trim();
    if (!refValue) return;
    const normalized: SourceRef = {
      ref_kind: parsed.ref_kind?.trim() || "unknown",
      ref: refValue,
      owner: normalizeOwner(parsed.owner, fallbackOwner),
    };
    const key = refKey(normalized);
    if (byRef.has(key)) return;
    byRef.set(key, normalized);
    refs.push(normalized);
  }

  for (const ref of raw.source_refs ?? []) add(ref);
  for (const block of raw.blocks ?? []) {
    for (const ref of block.source_refs ?? []) add(ref);
  }
  for (const warning of raw.warnings ?? []) {
    for (const ref of warning.source_refs ?? []) add(ref);
  }
  for (const aff of raw.affordances ?? []) {
    for (const ref of aff.source_refs ?? []) add(ref);
  }

  return { refs, byRef };
}

// Resolve a block/warning ref (which may be a bare string or an object) to the
// canonical `ref` string used at the response level.
function resolveRefString(
  candidate: string | RawSourceRef,
  byRef: Map<string, SourceRef>,
  fallbackOwner: SourceRefOwner,
): string | undefined {
  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    return trimmed.length ? trimmed : undefined;
  }
  const refValue = candidate.ref?.trim();
  if (!refValue) return undefined;
  // Ensure it exists in the collected map (it should, since collect walked all).
  const key = refKey({
    ref_kind: candidate.ref_kind?.trim() || "unknown",
    ref: refValue,
    owner: normalizeOwner(candidate.owner, fallbackOwner),
  });
  if (!byRef.has(key)) return refValue;
  return refValue;
}

function deriveJurisdiction(refs: SourceRef[], declared: string | undefined): {
  jurisdiction: ProjectionJurisdiction;
  mixed: boolean;
} {
  const owners = new Set(refs.map(r => r.owner).filter(o => o === "logline" || o === "envelope"));
  const hasLogline = owners.has("logline");
  const hasEnvelope = owners.has("envelope");
  const mixed = hasLogline && hasEnvelope;

  if (mixed) {
    return { jurisdiction: "mixed", mixed: true };
  }
  if (declared === "logline" || declared === "envelope" || declared === "membrane" || declared === "mixed") {
    return { jurisdiction: declared, mixed: declared === "mixed" };
  }
  if (hasLogline) return { jurisdiction: "logline", mixed: false };
  if (hasEnvelope) return { jurisdiction: "envelope", mixed: false };
  return { jurisdiction: "membrane", mixed: false };
}

// Group source refs by owner so a mixed projection never blends LogLine
// consequence refs with Envelope projection refs (source_rules grouping).
export function groupSourceRefsByOwner(refs: SourceRef[]): Record<SourceRefOwner, SourceRef[]> {
  const grouped = {
    logline: [] as SourceRef[],
    envelope: [] as SourceRef[],
    membrane: [] as SourceRef[],
    processual_ui: [] as SourceRef[],
  } satisfies Record<SourceRefOwner, SourceRef[]>;
  for (const ref of refs) grouped[ref.owner].push(ref);
  return grouped;
}

function normalizeBlocks(
  raw: RawProjection,
  byRef: Map<string, SourceRef>,
  fallbackOwner: SourceRefOwner,
  notes: string[],
): ProjectionBlock[] {
  const blocks: ProjectionBlock[] = [];
  let autoIndex = 0;

  for (const rawBlock of raw.blocks ?? []) {
    autoIndex += 1;
    const kind: ProjectionBlockKind = BLOCK_KIND_SET.has(rawBlock.kind ?? "")
      ? (rawBlock.kind as ProjectionBlockKind)
      : "summary";
    if (!BLOCK_KIND_SET.has(rawBlock.kind ?? "")) {
      notes.push(`block ${rawBlock.block_id ?? autoIndex}: unknown kind "${rawBlock.kind}" coerced to "summary"`);
    }

    const refStrings = (rawBlock.source_refs ?? [])
      .map(ref => resolveRefString(ref, byRef, fallbackOwner))
      .filter((value): value is string => typeof value === "string");

    // cite_sources: every non-divider block must cite at least one source ref.
    if (kind !== "divider" && refStrings.length === 0) {
      notes.push(`block ${rawBlock.block_id ?? autoIndex}: dropped (non-divider block with no source ref)`);
      continue;
    }

    const block: ProjectionBlock = {
      block_id: rawBlock.block_id?.trim() || `block_${autoIndex}`,
      kind,
      title: rawBlock.title ?? "",
      body: rawBlock.body ?? "",
      source_refs: refStrings,
    };
    if (rawBlock.risk_tier) block.risk_tier = rawBlock.risk_tier;
    if (rawBlock.authority_route) {
      block.authority_route = {
        owner: rawBlock.authority_route.owner ?? "unknown",
        approval_required: rawBlock.authority_route.approval_required ?? false,
        grants_required: rawBlock.authority_route.grants_required ?? [],
      };
      if (rawBlock.authority_route.required_process) {
        block.authority_route.required_process = rawBlock.authority_route.required_process;
      }
    }
    if (typeof rawBlock.display_priority === "number") {
      block.display_priority = rawBlock.display_priority;
    }
    blocks.push(block);
  }

  return blocks;
}

function normalizeWarnings(
  raw: RawProjection,
  byRef: Map<string, SourceRef>,
  fallbackOwner: SourceRefOwner,
  notes: string[],
): ProjectionWarning[] {
  const warnings: ProjectionWarning[] = [];
  for (const rawWarning of raw.warnings ?? []) {
    if (!WARNING_KIND_SET.has(rawWarning.kind ?? "")) {
      notes.push(`warning: unknown kind "${rawWarning.kind}" dropped`);
      continue;
    }
    const refStrings = (rawWarning.source_refs ?? [])
      .map(ref => resolveRefString(ref, byRef, fallbackOwner))
      .filter((value): value is string => typeof value === "string");
    if (refStrings.length === 0) {
      notes.push(`warning ${rawWarning.kind}: dropped (no source ref)`);
      continue;
    }
    warnings.push({
      kind: rawWarning.kind as ProjectionWarningKind,
      message: rawWarning.message?.trim() || String(rawWarning.kind),
      source_refs: refStrings,
    });
  }
  return warnings;
}

function tierRank(tier: string | undefined): number {
  if (!tier) return 0;
  return TIER_RANK[tier] ?? 0;
}

// Affordance filtering (docs/dream-machine-actions.v0.yml). An affordance only
// survives if it has a recognized kind, cites source refs, declares an authority
// route, and stays within the kind's max risk tier. L4/L5 affordances must route
// through LogLine authority (owner=logline) or they are dropped — the portal
// must never render an effectful button the runtime did not authorize.
function normalizeAffordances(
  raw: RawProjection,
  fallbackOwner: SourceRefOwner,
  includeAffordances: boolean,
  notes: string[],
): DeclaredAffordance[] {
  if (!includeAffordances) {
    if ((raw.affordances ?? []).length > 0) {
      notes.push("affordances suppressed (include_affordances=false)");
    }
    return [];
  }

  const result: DeclaredAffordance[] = [];
  for (const rawAff of raw.affordances ?? []) {
    const id = rawAff.affordance_id?.trim();
    const kind = rawAff.kind ?? "";

    if (!id) {
      notes.push("affordance: dropped (missing affordance_id)");
      continue;
    }
    // no_button_without_affordance is enforced by *only* emitting validated
    // affordances; any unrecognized/forbidden kind is dropped outright.
    if (!AFFORDANCE_KIND_SET.has(kind)) {
      notes.push(`affordance ${id}: dropped (kind "${kind}" is not a button-eligible affordance kind)`);
      continue;
    }
    const affKind = kind as AffordanceKind;

    // affordance_requires_source_refs.
    const sourceRefs: SourceRef[] = (rawAff.source_refs ?? [])
      .map((ref): SourceRef | undefined => {
        const parsed: RawSourceRef = typeof ref === "string" ? { ref } : ref;
        const refValue = parsed.ref?.trim();
        if (!refValue) return undefined;
        return {
          ref_kind: parsed.ref_kind?.trim() || "unknown",
          ref: refValue,
          owner: normalizeOwner(parsed.owner, fallbackOwner),
        };
      })
      .filter((value): value is SourceRef => value !== undefined);

    if (sourceRefs.length === 0) {
      notes.push(`affordance ${id}: dropped (no source refs)`);
      continue;
    }

    const tier = rawAff.risk_tier ?? "L0";
    if (tierRank(tier) > tierRank(AFFORDANCE_MAX_TIER[affKind])) {
      notes.push(`affordance ${id}: dropped (risk_tier ${tier} exceeds max ${AFFORDANCE_MAX_TIER[affKind]} for kind ${affKind})`);
      continue;
    }

    const authorityRoute = {
      owner: rawAff.authority_route?.owner ?? "unknown",
      approval_required: rawAff.authority_route?.approval_required ?? false,
      grants_required: rawAff.authority_route?.grants_required ?? [],
    } as DeclaredAffordance["authority_route"];
    if (rawAff.authority_route?.required_process) {
      authorityRoute.required_process = rawAff.authority_route.required_process;
    }

    // l4_l5_requires_logline.
    if (tierRank(tier) >= tierRank("L4") && authorityRoute.owner !== "logline") {
      notes.push(`affordance ${id}: dropped (L4+/${tier} affordance must route through LogLine authority, owner was "${authorityRoute.owner}")`);
      continue;
    }

    const resultMode = rawAff.result_mode ?? "read_only";
    if (!AFFORDANCE_RESULT_MODE_SET.has(resultMode)) {
      notes.push(`affordance ${id}: dropped (result_mode "${resultMode}" is not allowed)`);
      continue;
    }

    result.push({
      affordance_id: id,
      label: rawAff.label?.trim() || id,
      kind: affKind,
      source_refs: sourceRefs,
      risk_tier: tier,
      authority_route: authorityRoute,
      result_mode: resultMode as DeclaredAffordance["result_mode"],
      cannot_do: rawAff.cannot_do?.length
        ? rawAff.cannot_do
        : [...REQUIRED_CANNOT_DO],
    });
  }
  return result;
}

// Build the response-level cannot_do, always including the standard limits plus
// any extra ones the runtime declared. Required limits are guaranteed present.
function buildCannotDo(): string[] {
  const set = new Set<string>(STANDARD_CANNOT_DO);
  for (const required of REQUIRED_CANNOT_DO) set.add(required);
  return [...set];
}

// Decide which jurisdiction/freshness warnings the response must carry, then
// merge them with the runtime-declared warnings (avoiding duplicate kinds).
function deriveDerivedWarnings(
  jurisdiction: ProjectionJurisdiction,
  mixed: boolean,
  stale: boolean,
  refs: SourceRef[],
  openFindings: string[],
  existing: ProjectionWarning[],
): ProjectionWarning[] {
  const derived: ProjectionWarning[] = [];
  const existingKinds = new Set(existing.map(w => w.kind));

  function pushIfNew(kind: ProjectionWarningKind, message: string, sourceRefs: string[]) {
    if (existingKinds.has(kind)) return;
    if (sourceRefs.length === 0) return;
    derived.push({ kind, message, source_refs: sourceRefs });
    existingKinds.add(kind);
  }

  const allRefStrings = refs.map(r => r.ref);

  if (mixed) {
    pushIfNew(
      "mixed_jurisdiction",
      "This projection mixes LogLine consequence sources with Envelope observation sources; refs are grouped by owner and only LogLine refs carry authority.",
      allRefStrings,
    );
  } else if (jurisdiction === "envelope") {
    pushIfNew(
      "envelope_only",
      "This projection is built only from Envelope observation; nothing here is registered LogLine consequence.",
      allRefStrings,
    );
  }

  if (stale) {
    pushIfNew(
      "stale_projection",
      "This projection is marked stale and may not reflect the current runtime state; rebuild before relying on it.",
      allRefStrings,
    );
  }

  if (openFindings.length > 0) {
    pushIfNew(
      "unresolved_finding",
      "This projection cites open findings that have not been resolved or registered as LogLine consequence.",
      openFindings,
    );
  }

  return [...existing, ...derived];
}

export interface NormalizeOptions {
  includeAffordances?: boolean;
  maxBlocks?: number;
}

/**
 * Normalize a raw runtime projection into the portal projection-response shape.
 *
 * Returns `ok: false` with errors when the raw projection cannot be safely
 * represented (e.g. it claims authority, has no source refs at all, or has no
 * usable intent). The returned response, when ok, conforms to
 * docs/dream-machine-projections.v0.schema.json and is non-authoritative.
 */
export function normalizeProjection(
  raw: RawProjection,
  options: NormalizeOptions = {},
): NormalizeResult {
  const errors: NormalizeError[] = [];
  const notes: string[] = [];
  const includeAffordances = options.includeAffordances ?? true;

  // rebuild_on_conflict / non-authority: a runtime projection that asserts it is
  // authoritative is rejected — the portal never lets a projection outrank Acts.
  if ((raw as { authoritative?: unknown }).authoritative === true) {
    errors.push({
      field: "authoritative",
      message: "projection claims authoritative:true; the portal rejects authority-claiming projections",
    });
  }

  const intent = raw.intent ?? "";
  if (!INTENT_SET.has(intent)) {
    errors.push({
      field: "intent",
      message: `unknown or missing projection intent "${raw.intent}"`,
    });
  }

  const fallbackOwner: SourceRefOwner = raw.default_owner ?? "envelope";
  const { refs, byRef } = collectSourceRefs(raw, fallbackOwner);

  if (refs.length === 0) {
    // Schema requires source_refs minItems:1; a projection with nothing to cite
    // is not renderable as a non-authoritative view.
    errors.push({
      field: "source_refs",
      message: "projection cites no source refs; cannot render a non-authoritative view",
    });
  }

  if (errors.length > 0) {
    return { ok: false, errors, notes };
  }

  const { jurisdiction, mixed } = deriveJurisdiction(refs, raw.jurisdiction);

  let blocks = normalizeBlocks(raw, byRef, fallbackOwner, notes);
  if (typeof options.maxBlocks === "number" && options.maxBlocks >= 0 && blocks.length > options.maxBlocks) {
    notes.push(`blocks truncated from ${blocks.length} to max_blocks=${options.maxBlocks}`);
    blocks = blocks.slice(0, options.maxBlocks);
  }

  const declaredWarnings = normalizeWarnings(raw, byRef, fallbackOwner, notes);
  const openFindings = (raw.open_findings ?? []).map(f => f.trim()).filter(Boolean);
  const warnings = deriveDerivedWarnings(jurisdiction, mixed, raw.freshness?.stale ?? false, refs, openFindings, declaredWarnings);

  const affordances = normalizeAffordances(raw, fallbackOwner, includeAffordances, notes);

  const freshness = {
    generated_at: raw.freshness?.generated_at?.trim() || new Date(0).toISOString(),
    as_of: raw.freshness?.as_of ?? "unknown",
    stale: raw.freshness?.stale ?? false,
  } as ProjectionResponse["freshness"];
  if (typeof raw.freshness?.ttl_ms === "number") freshness.ttl_ms = raw.freshness.ttl_ms;
  if (raw.freshness?.rebuild_reason) freshness.rebuild_reason = raw.freshness.rebuild_reason;

  const response: ProjectionResponse = {
    projection_id: raw.projection_id?.trim() || `proj_${Date.now().toString(36)}`,
    intent: intent as ProjectionIntent,
    jurisdiction,
    authoritative: false,
    freshness,
    source_refs: refs,
    blocks,
    warnings,
    affordances,
    cannot_do: buildCannotDo(),
  };
  if (openFindings.length > 0) {
    response.open_findings = openFindings;
  }
  if (raw.projection_diff) {
    response.projection_diff = raw.projection_diff;
  }

  return { ok: true, response, errors, notes };
}
