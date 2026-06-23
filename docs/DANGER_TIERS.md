# Danger Tiers (L0–L5)

> Executor and human alike must know *why* a process requires a grant.

Every process contract declares a `danger_tier`. The tier is the single axis that decides
whether dangerous-work controls (grant, signoff, budget, sandbox) apply.

## The ladder

| Tier | Meaning | Controls |
|---|---|---|
| **L0** | Local read / projection | none (read-only) |
| **L1** | Local ledger write | append-only ledger discipline |
| **L2** | Local reversible computation | local only, reversible |
| **L3** | External integration, no irreversible effect | adapter must be registered; no grant required |
| **L4** | External **compensable** effect | **grant + passkey signoff + budget + sandbox** |
| **L5** | External **irreversible** effect | as L4, and treated as the strictest gate |

`evaluator.DANGEROUS_TIERS = {"L4", "L5"}` — only these require a grant at activation.

## Current catalog classification

| Process | Tier | Why |
|---|---|---|
| memory-register.v1 | L0 | local ledger receipt |
| attention-raise.v1 | L0 | local doubt surface (contract-only) |
| evidence-closure.v1 | L0 | contract-only |
| github-check.v1 | L0 | contract-only (no door yet — Day 6) |
| notification.v1 | L0* | contract-only today; **becomes L5 irreversible** when wired (Day 2 §20 / Day 6) |
| projection-build.v1 | L1 | rebuildable local projection |
| inference.v1 | L3 | external model call, no irreversible effect |
| route-to-devin.v1 | L3 | external route; **adapter not yet registered** → not runnable until Day 6 |
| worker-run.v1 | L4 | external compensable work |
| workflow-run.v1 | L5 | external irreversible orchestration |

\* `notification.v1` is classified L0 only because it is contract-only with no adapter today;
§20 hardens it to an irreversible (L5) effect before any door exists. Tracked there.

## Enforced by

- `tests/test_grants_danger_tiers.py` pins this matrix and the L4/L5-needs-grant invariant.
- Per-failure enforcement: `tests/test_runtime.py`, `test_grants.py`, `test_signing.py`.
- Matrix report: `reports/day2/grants_l4_l5_matrix.md`.

## Acceptance (§13)

> executor e humano sabem por que um processo exige grant — **met**: the tier is explicit,
> pinned by test, and the only thing that triggers grant/signoff/budget/sandbox controls.
