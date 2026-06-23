---
# This document is itself a LogLine-native decision norm: a human-readable body over a
# machine-readable envelope+AUX. In the target model it registers as a `did=decision`
# receipt — JCS/RFC8785-canonical, content-addressed, cited and superseded by hash.
# The file is the SEED; the registered receipt is the truth (LAB FINAL SPEC v0 §5).
who: dan@minilab.work
did: decision
this: logline-native-representation-of-contracts-norms-and-specs
when: "2026-06-23"
confirmed_by: dan@minilab.work
if_ok: norm-active.v1
if_doubt: attention-raise.v1
if_not: stop
status: registered
aux:
  adr_id: ADR-0001
  title: LogLine-native representation of contracts, norms, and specs
  decision_status: accepted
  decision_class: representation
  danger_tier: L0
  supersedes: []
  superseded_by: null
  canon_basis:
    - LogLine Foundation receipt discipline (nine slots + AUX + tuple/content/envelope hash, JCS 8785, append-only)
    - Universal Inbox v3 (Awakening Layer); v4 and v5 to be reconciled
  references:
    - { kind: canon, ref: "LAB FINAL SPEC v0.md §5, §6, §8, §9" }
    - { kind: canon, ref: "LAB LLM-FACING CANON SPEC v0.md" }
    - { kind: canon, ref: "VOCABULARY.md / GENESIS.md / LAB_TOPOLOGY.md" }
    - { kind: standard, name: in-toto attestation framework, note: "envelope + subject(by digest) + predicate; DSSE" }
    - { kind: standard, name: W3C Verifiable Credentials / DIDs, note: "issuer/subject/validity/status vocabulary" }
    - { kind: standard, name: Cedar / OPA, note: "declarative authorization rules (engine optional, never in kernel)" }
    - { kind: standard, name: CUE / JSON Schema, note: "schema + validation for the contract receipt" }
    - { kind: standard, name: Structured-MADR / YAML-ADR, note: "machine-readable decision/rationale fields" }
  tags: [logline-native, content-addressing, jcs-8785, composability, specs-as-records, cadence-of-rules]
---

# ADR-0001 — LogLine-native representation of contracts, norms, and specs

## Purpose

Freeze, in one authoritative place, what we understand about LogLine and the Lab — from the
Foundation canon to the external-standards research — so that both the existing and future
implementation get better and the real bootstrap is *assembly, not invention*.

This document is also a demonstration: it is written in the very form it advocates — a
human-readable body over a machine-readable envelope (the YAML above), meant to register as a
content-addressed `did=decision` receipt.

## Context

The Lab is Dan's private implementation of the LogLine method (the LogLine Foundation is
separate; Dan created it). Everything must be **LogLine-Foundation canon in form and spirit**,
processually grounded in **Universal Inbox v3/v4/v5**. The Lab is generic infrastructure to
organize Dan's life, computers, research, and businesses — not a product for others.

A representation gap was found during Day 2: process contracts live as disk files
(`processes/*.v1.yml`), the *rules that matter* are real fields but the *rationale* is YAML
comments (dropped by the parser), and **nothing registers into the ledger**. For contracts and
norms to be valid and consultable in production (Supabase), they must be receipts, not files.

## What the canon already legislates (the native ground)

From `LAB FINAL SPEC v0.md` and the LLM-facing canon:

- **The receipt is the truth; projections/columns/views are maps** (§5, :224). Therefore
  contracts, norms, and specs must ultimately be *receipts*, with files as seeds.
- **Receipt discipline**: nine stable slots (`who, did, this, when, confirmed_by, if_ok,
  if_doubt, if_not, status`) + **AUX** + **tuple_hash** + **content_hash** + **JCS/RFC8785**
  canonicalization + append-only custody (§5, :228–247). Consequence may not be smuggled into
  forbidden top-level fields (`transport`/`result`/`evidence`); transport belongs to the
  **envelope** boundary (`envelope_hash`).
- **Composability is citation-by-hash**: *"Evidence is records or evidence objects **cited by
  records**"* (:254); evaluation asks *"Are **cited hashes resolvable**?"* (:291); *"**Cite
  before claiming**"* (:1561). Resolvability of cited hashes is already an activation gate.
- **Registration ≠ activation**: everything may register ("the Lab remembers this"); only
  complete records matching a registered process contract activate; evaluation **classifies,
  does not reject** (§6).
- **A process is a contract, not a daemon** (§8, :400). A contract canonically carries:
  process id, class, activation ritual, required slots, required AUX, authority scope, adapter
  target, danger tier, budget policy, grant requirements, evidence obligation, idempotency
  rule, doubt behavior, closure shape, runtime readiness, examples, **version**, and
  **supersession** (:404–423). New capability is added by *adding/updating contracts, schemas,
  adapters, projections — not new daemons* (:433).
- **Closure states** include `fechado, doubted, ghost, retired, superseded` (§9, :460–467) —
  supersession is a first-class lifecycle, i.e. the "cadence of rules".
- **Organs** (GENESIS/TOPOLOGY): Memory = `logline_acts` (authoritative); Hands = `lab` CLI;
  Law = `processes/`; Nervous tree = `runtime/`; Leaves = adapters; Eyes = projections
  (rebuildable, non-authoritative); Imagination = dream-machine (proposes, never authority);
  Body = fleet.
- **Universal Inbox v3 Awakening law**: *"Address canonically if you want to be heard."* —
  selectors notice; only addressed, complete, contract-matching records move.

## What the research confirms (external rediscoveries of our shape)

The external standards are not containers to import — they are confirmation that the LogLine
receipt shape is right, plus vocabulary we can borrow:

- **in-toto attestation framework** (CNCF graduated): DSSE **envelope** + **subject** (by
  cryptographic digest) + typed **predicate**. This is, field-for-field, the LogLine receipt
  (`envelope_hash` + content-addressed subject + AUX payload). We independently reinvented ~80%
  of it; SLSA layers ≈ our danger tiers; in-toto **layout** (required steps + their evidence) ≈
  our contract `evidence_must_include` vs. result records.
- **W3C Verifiable Credentials / DIDs**: a grant *is* a credential (issuer/subject/validity),
  revocation *is* a status entry; authorities *are* DIDs. We already do append-only grants and
  revoke-by-Act; VC/DID lend the AUX vocabulary.
- **Cedar / OPA (policy-as-code)**: declarative `principal/action/resource/context`
  authorization. Borrow the *model* for grant evaluation; keep any *engine* out of the
  zero-dependency kernel (optional boundary only, like `webauthn`).
- **CUE / JSON Schema**: schema + validation for the contract receipt. We already use JSON
  Schema for `receipt.v0`; extend with a contract schema (or CUE if cross-field constraints
  are wanted).
- **Structured-MADR / YAML-ADR / Decision Reasoning Format**: machine-readable
  decision/rationale fields — the cure for rationale-as-comments.

## Decision (the law this record sets)

1. **One shape for everything.** Contracts, norms, specs, grants, evidence, results are all
   **LogLine Acts** — registered in `logline_acts`, JCS-canonical, content-addressed. Files in
   `processes/`, `docs/`, `playbooks/` are **seeds**; the registered receipt is the truth.
2. **Compose by hash.** Records cite their contract / authority / source / evidence / superseded
   norm **by `content_hash`**; "cited hashes resolvable" enforces integrity. Same input/output
   format means one `register → evaluate → cite` machinery serves all of them.
3. **Cadence of rules.** A rule/contract/norm is a receipt; a new version is a new receipt that
   cites and `supersedes` the prior by hash. Append-only evolution; never overwrite. The
   `superseded` closure state is this rhythm.
4. **External standards inform vocabulary, never the container.** Borrow in-toto predicate
   names, VC/DID fields, Cedar's authz model, MADR's decision fields — always as AUX of a
   LogLine Act. The kernel stays zero-dependency.
5. **Rationale is data.** Promote the *why* from comments/prose into structured AUX fields, so
   norms are queryable and registerable, not just human-readable.

## The representation pass (dependency-light, canon-native)

Order chosen so each step compounds and nothing is invented at bootstrap time:

1. **Rule rationale → structured AUX**: a contract receipt carries its own canon
   (`danger_tier, irreversible, requires_signoff, contract_only, rationale, supersedes`),
   MADR-informed — replacing the YAML comments added on Day 2.
2. **Contract-as-receipt JSON Schema**: a sibling to `schemas/logline/receipt.v0.schema.json`
   so contracts validate and mint by JCS hash.
3. **`lab spec register`**: seed file → validate → JCS → mint `did=process-contract` Act →
   append; runtime resolves the catalog **by hash from the ledger**, files as seed. A process
   Act cites its `contract_hash`; the evaluator's "cited hashes resolvable" enforces it.
4. **Norms/decisions as receipts**: this ADR and our docs/playbooks/danger-doctrine become
   `did=decision`/`did=norm` receipts (human Markdown = seed, receipt = truth), cited by
   contracts, superseded by hash.
5. **Vocabularies as cited reference receipts**: danger tiers and the `DOUBT_REASONS`/mold
   families become a canon **vocabulary Act**, cited rather than hardcoded.

This lands on the roadmap where it already belongs: **Day 4** (Projection Spec Registry +
Spec Schema; projections already use a `projection_spec_hash`), **Day 7** (Knowledge Pack /
Bootstrap Book), **Day 8** (genesis registers specs; genesis already carries a `spec_hash`).

## Consequences

- **Better existing implementation**: contracts gain self-describing, registerable canon;
  rationale stops being invisible; the danger/mold vocabularies stop being hardcoded.
- **Better future implementation**: the real bootstrap becomes "register the seeds as receipts
  and resolve by hash" — no bespoke engine to write. Interop with the supply-chain ecosystem
  (in-toto/SLSA tooling) is available if ever wanted, for free, because the shape matches.
- **Cost**: a one-time representation pass; a small risk of over-formalizing — mitigated by
  keeping engines out of the kernel and treating standards as vocabulary only.

## Open questions (to reconcile, not block)

- **Universal Inbox v4 and v5**: this record is grounded mainly in v3 (Awakening) + the FINAL
  SPEC. The v4/v5 process semantics (Dan + crew's interpretation) must be reconciled into the
  contract/norm AUX vocabulary before the registry is frozen.
- **Engine vs. model for grants**: borrow Cedar's model now; decide later whether a policy
  engine ever becomes an optional boundary.
- **CUE vs. JSON Schema** for the contract schema: JSON Schema for consistency now; revisit CUE
  if cross-field constraints grow.

## Status

`registered` / accepted. This is the north-star for the representation pass; supersede by a
later `did=decision` receipt citing this one's hash, never by edit-in-place.
