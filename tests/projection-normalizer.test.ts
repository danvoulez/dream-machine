import assert from "node:assert/strict";
import test from "node:test";

import {
  groupSourceRefsByOwner,
  normalizeProjection,
  type RawProjection,
} from "../agent/lib/projection-normalizer.ts";
import { mapRuntimeProjection } from "../agent/lib/projection-portal.ts";
import {
  preferredJurisdiction,
  type RuntimeProjectionInput,
} from "../agent/tools/runtime_projection.ts";

test("rejects authority-claiming projections", () => {
  const result = normalizeProjection({
    intent: "overview",
    jurisdiction: "envelope",
    default_owner: "envelope",
    authoritative: true,
    source_refs: [{ ref_kind: "projection_hash", ref: "env-proj", owner: "envelope" }],
    blocks: [
      {
        kind: "summary",
        title: "Bad projection",
        body: "This should not render.",
        source_refs: ["env-proj"],
      },
    ],
  } as RawProjection & { authoritative: true });

  assert.equal(result.ok, false);
  assert.equal(result.errors[0]?.field, "authoritative");
});

test("drops non-divider blocks without source refs", () => {
  const result = normalizeProjection({
    intent: "overview",
    jurisdiction: "envelope",
    default_owner: "envelope",
    source_refs: [{ ref_kind: "projection_hash", ref: "env-proj", owner: "envelope" }],
    blocks: [
      {
        block_id: "uncited",
        kind: "summary",
        title: "Uncited",
        body: "No refs.",
        source_refs: [],
      },
      {
        block_id: "divider",
        kind: "divider",
        title: "",
        body: "",
        source_refs: [],
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.response?.blocks.length, 1);
  assert.equal(result.response?.blocks[0]?.kind, "divider");
  assert.match(result.notes.join("\n"), /dropped/);
});

test("groups mixed LogLine and Envelope refs without assigning authority to the projection", () => {
  const result = normalizeProjection({
    intent: "danger_review",
    jurisdiction: "mixed",
    default_owner: "envelope",
    source_refs: [
      { ref_kind: "content_hash", ref: "logline-content", owner: "logline" },
      { ref_kind: "projection_hash", ref: "env-proj", owner: "envelope" },
    ],
    blocks: [
      {
        block_id: "summary",
        kind: "summary",
        title: "Mixed",
        body: "Side-by-side only.",
        source_refs: ["logline-content", "env-proj"],
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.response?.authoritative, false);
  assert.equal(result.response?.jurisdiction, "mixed");
  assert.ok(result.response?.warnings.some(w => w.kind === "mixed_jurisdiction"));

  const grouped = groupSourceRefsByOwner(result.response!.source_refs);
  assert.equal(grouped.logline.length, 1);
  assert.equal(grouped.envelope.length, 1);
});

test("drops effectful L4 affordances that do not route through LogLine", () => {
  const result = normalizeProjection({
    intent: "proposal_detail",
    jurisdiction: "envelope",
    default_owner: "envelope",
    source_refs: [{ ref_kind: "proposal_version_hash", ref: "proposal-v1", owner: "envelope" }],
    blocks: [
      {
        block_id: "proposal",
        kind: "proposal",
        title: "Proposal",
        body: "Needs authority route.",
        source_refs: ["proposal-v1"],
      },
    ],
    affordances: [
      {
        affordance_id: "submit",
        label: "Submit",
        kind: "submit_receipt_proposal",
        source_refs: [{ ref_kind: "proposal_version_hash", ref: "proposal-v1", owner: "envelope" }],
        risk_tier: "L4",
        authority_route: {
          owner: "envelope",
          approval_required: true,
          grants_required: [],
        },
        result_mode: "logline_receipt_proposal",
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.response?.affordances.length, 0);
  assert.match(result.notes.join("\n"), /must route through LogLine/);
});

test("keeps L4 affordances when they explicitly route through LogLine", () => {
  const result = normalizeProjection({
    intent: "proposal_detail",
    jurisdiction: "mixed",
    default_owner: "envelope",
    source_refs: [
      { ref_kind: "proposal_version_hash", ref: "proposal-v1", owner: "envelope" },
      { ref_kind: "process_id", ref: "memory-register.v1", owner: "logline" },
    ],
    blocks: [
      {
        block_id: "proposal",
        kind: "proposal",
        title: "Proposal",
        body: "Has authority route.",
        source_refs: ["proposal-v1", "memory-register.v1"],
      },
    ],
    affordances: [
      {
        affordance_id: "submit",
        label: "Submit",
        kind: "submit_receipt_proposal",
        source_refs: [
          { ref_kind: "proposal_version_hash", ref: "proposal-v1", owner: "envelope" },
          { ref_kind: "process_id", ref: "memory-register.v1", owner: "logline" },
        ],
        risk_tier: "L4",
        authority_route: {
          owner: "logline",
          approval_required: true,
          grants_required: ["grant:demo"],
        },
        result_mode: "logline_receipt_proposal",
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.response?.affordances.length, 1);
  assert.equal(result.response?.affordances[0]?.authority_route.owner, "logline");
});

test("routes receipt detail to LogLine and movement questions to Envelope", () => {
  assert.equal(preferredJurisdiction({
    intent: "logline_receipt_detail",
    scope: "abc",
  } as RuntimeProjectionInput), "logline");

  assert.equal(preferredJurisdiction({
    intent: "open_findings",
    scope: "demo",
  } as RuntimeProjectionInput), "envelope");

  assert.equal(preferredJurisdiction({
    intent: "danger_review",
    scope: "demo",
  } as RuntimeProjectionInput), "mixed");
});

test("maps current Envelope source.act_hashes as semantic board_act_hash refs", () => {
  const raw = mapRuntimeProjection({
    projection_hash: "env-proj",
    built_by: "shift-1",
    generated_at: 1700000000000,
    as_of_seq: 1,
    ttl_ms: 60_000,
    stale: true,
    rebuild_reason: "ttl_expired",
    source: {
      act_hashes: ["board-act-1"],
      finding_ids: ["finding-1"],
    },
    narrative: [
      {
        block_id: "n1",
        kind: "summary",
        title: "Now",
        body: "Current state.",
        ref: "board-act-1",
      },
    ],
    open_findings: ["finding-1"],
  }, {
    intent: "overview",
    scope: "demo",
  } as RuntimeProjectionInput);

  assert.equal(raw.jurisdiction, "envelope");
  assert.equal(raw.freshness?.ttl_ms, 60_000);
  assert.equal(raw.freshness?.stale, true);
  assert.equal(raw.freshness?.rebuild_reason, "ttl_expired");
  assert.deepEqual(raw.source_refs?.map(ref => [ref.ref_kind, ref.ref]), [
    ["projection_hash", "env-proj"],
    ["board_act_hash", "board-act-1"],
    ["finding_id", "finding-1"],
    ["shift_hash", "shift-1"],
  ]);
});

test("maps LogLine projection docs as LogLine projection responses", () => {
  const raw = mapRuntimeProjection({
    projection_hash: "logline-proj",
    projection_spec: "lab_current_state",
    sources: ["logline_acts"],
    input_hashes: ["content-1", "content-2"],
    parent_projection_hashes: ["parent-proj"],
    computed_at: "2026-06-27T00:00:00Z",
    counts: { acts: 2 },
  }, {
    intent: "logline_receipt_detail",
    scope: "content-1",
  } as RuntimeProjectionInput);

  assert.equal(raw.jurisdiction, "logline");
  assert.equal(raw.default_owner, "logline");
  assert.equal(raw.projection_id, "logline-proj");
  assert.deepEqual(raw.source_refs?.map(ref => [ref.ref_kind, ref.ref]), [
    ["projection_hash", "logline-proj"],
    ["content_hash", "content-1"],
    ["content_hash", "content-2"],
    ["projection_hash", "parent-proj"],
  ]);
});

test("maps Envelope projection diffs for changes_since", () => {
  const raw = mapRuntimeProjection({
    from_projection_hash: "from-proj",
    to_projection_hash: "to-proj",
    stream_id: "demo",
    from_as_of_seq: 1,
    to_as_of_seq: 2,
    source_refs: {
      added: ["board-act-2"],
      removed: [],
    },
    open_findings: {
      added: ["finding-1"],
      removed: [],
    },
    narrative_blocks: {
      added: ["next"],
      removed: [],
      changed: ["summary"],
    },
    stale_changed: false,
    generated_at_delta_ms: 10,
  }, {
    intent: "changes_since",
    scope: "demo",
  } as RuntimeProjectionInput);

  assert.equal(raw.jurisdiction, "envelope");
  assert.equal(raw.intent, "changes_since");
  assert.equal(raw.open_findings?.[0], "finding-1");
  assert.ok(raw.blocks?.[0]?.body.includes("blocks +1/-0/1 changed"));

  const normalized = normalizeProjection(raw);
  assert.equal(normalized.ok, true);
  assert.equal(normalized.response?.authoritative, false);
  assert.equal(normalized.response?.warnings.some(w => w.kind === "envelope_only"), true);
});
