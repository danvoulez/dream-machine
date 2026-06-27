// Shared types for the Dream Machine `runtime_projection` portal tool.
//
// These mirror the read-only, non-authoritative projection response contract in
//   docs/dream-machine-projections.v0.yml
//   docs/dream-machine-projections.v0.schema.json
// and the affordance contract in
//   docs/dream-machine-actions.v0.yml
//
// The portal is the interaction jurisdiction. It may request, render, ask,
// explain, and route. It may NOT register receipts, dispatch executors, mutate
// either ledger, or authorize L5. Every value here is observation-only.

export const PROJECTION_INTENTS = [
  "overview",
  "arrival_detail",
  "process_detail",
  "waiting_on_me",
  "open_findings",
  "proposal_detail",
  "board_act_detail",
  "logline_receipt_detail",
  "danger_review",
  "changes_since",
] as const;

export type ProjectionIntent = (typeof PROJECTION_INTENTS)[number];

// Jurisdiction of the projection as a whole. Mixed projections must group their
// source refs by owner (see source_rules.mixed_jurisdiction_grouping).
export const PROJECTION_JURISDICTIONS = [
  "logline",
  "envelope",
  "membrane",
  "mixed",
] as const;

export type ProjectionJurisdiction = (typeof PROJECTION_JURISDICTIONS)[number];

// Owner of a single source ref. `processual_ui` exists so the portal can cite
// its own non-authoritative annotations without ever claiming ledger authority.
export const SOURCE_REF_OWNERS = [
  "logline",
  "envelope",
  "membrane",
  "processual_ui",
] as const;

export type SourceRefOwner = (typeof SOURCE_REF_OWNERS)[number];

export const PROJECTION_BLOCK_KINDS = [
  "summary",
  "source_ref",
  "proposal",
  "board_act",
  "logline_receipt",
  "finding",
  "attention",
  "risk_note",
  "warning",
  "next_step",
  "divider",
] as const;

export type ProjectionBlockKind = (typeof PROJECTION_BLOCK_KINDS)[number];

export const PROJECTION_WARNING_KINDS = [
  "stale_projection",
  "partial_source",
  "mixed_jurisdiction",
  "envelope_only",
  "requires_logline_registration",
  "l5_describe_only",
  "missing_grant",
  "unresolved_finding",
] as const;

export type ProjectionWarningKind = (typeof PROJECTION_WARNING_KINDS)[number];

// Risk tiers. Envelope perceives and narrates up to L5 but never authorizes it;
// LogLine owns L5 authorization. The portal only renders effectful buttons when
// a LogLine grant + approval path is present (see dream-machine-actions.v0.yml).
export const RISK_TIERS = ["L0", "L1", "L2", "L3", "L4", "L5"] as const;

export type RiskTier = (typeof RISK_TIERS)[number];

// Only these affordance kinds may ever become a button. `forbidden_*` kinds and
// anything not listed here must never render an actionable control.
export const AFFORDANCE_KINDS = [
  "inspect",
  "explain",
  "request_projection",
  "prepare_translation_package",
  "submit_receipt_proposal",
  "answer_attention",
  "request_grant",
  "dismiss_ui_card",
] as const;

export type AffordanceKind = (typeof AFFORDANCE_KINDS)[number];

export const AFFORDANCE_RESULT_MODES = [
  "read_only",
  "intent_package",
  "logline_receipt_proposal",
  "requires_logline_registration",
] as const;

export type AffordanceResultMode = (typeof AFFORDANCE_RESULT_MODES)[number];

// The portal can render, ask, and route — but never commit consequence. These
// are the limits every projection response MUST declare in `cannot_do`.
export const STANDARD_CANNOT_DO = [
  "register_receipt",
  "activate_process",
  "dispatch_executor",
  "authorize_l5",
  "mutate_ledger",
  "mutate_logline_ledger",
  "mutate_envelope_ledger",
  "treat_projection_as_truth",
] as const;

// The JSON Schema (cannot_do.contains) hard-requires at least these three.
export const REQUIRED_CANNOT_DO = [
  "register_receipt",
  "dispatch_executor",
  "authorize_l5",
] as const;

export interface SourceRef {
  ref_kind: string;
  ref: string;
  owner: SourceRefOwner;
}

export interface Freshness {
  generated_at: string;
  as_of: string | Record<string, string>;
  stale: boolean;
  ttl_ms?: number;
  rebuild_reason?: string;
}

export interface AuthorityRoute {
  owner: string;
  required_process?: string;
  approval_required: boolean;
  grants_required: string[];
}

export interface ProjectionBlock {
  block_id: string;
  kind: ProjectionBlockKind;
  title: string;
  body: string;
  // Block-level refs cite by `ref` string into the response-level source_refs.
  source_refs: string[];
  risk_tier?: RiskTier | string;
  authority_route?: AuthorityRoute;
  display_priority?: number;
}

export interface ProjectionWarning {
  kind: ProjectionWarningKind;
  message: string;
  source_refs: string[];
}

export interface ProjectionDiffDelta {
  added: string[];
  removed: string[];
}

export interface ProjectionBlockDiffDelta extends ProjectionDiffDelta {
  changed: string[];
}

export interface ProjectionDiffSummary {
  from_projection_hash: string;
  to_projection_hash: string;
  from_as_of_seq?: number;
  to_as_of_seq?: number;
  source_refs: ProjectionDiffDelta;
  open_findings: ProjectionDiffDelta;
  narrative_blocks: ProjectionBlockDiffDelta;
  stale_changed?: boolean;
  generated_at_delta_ms?: number;
}

export interface DeclaredAffordance {
  affordance_id: string;
  label: string;
  kind: AffordanceKind;
  source_refs: SourceRef[];
  risk_tier: RiskTier | string;
  authority_route: AuthorityRoute;
  result_mode: AffordanceResultMode;
  cannot_do: string[];
}

/** Read-only portal boundary — Scene + legacy projection tools must surface these. */
export const PORTAL_READ_ONLY_CANNOT_DO = [
  "register_receipt",
  "dispatch_executor",
  "authorize_l5",
  "mutate_ledger",
] as const;

export interface ProjectionResponse {
  projection_id: string;
  intent: ProjectionIntent;
  jurisdiction: ProjectionJurisdiction;
  // Always false: a projection is an eye, never truth.
  authoritative: false;
  freshness: Freshness;
  source_refs: SourceRef[];
  blocks: ProjectionBlock[];
  open_findings?: string[];
  projection_diff?: ProjectionDiffSummary;
  warnings: ProjectionWarning[];
  affordances: DeclaredAffordance[];
  cannot_do: string[];
}
