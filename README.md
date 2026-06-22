# Dream Machine Lab

[![CI](https://github.com/danvoulez/dream-machine/actions/workflows/ci.yml/badge.svg)](https://github.com/danvoulez/dream-machine/actions/workflows/ci.yml)
[![Python](https://img.shields.io/badge/python-3.11%2B-blue.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/license-Apache--2.0-green.svg)](LICENSE)

A **processual, ledger-backed runtime**. Every arrival is registered into memory;
only complete records that match a registered process contract activate; and all
consequence flows through a shared runtime tree where **selectors choose, the executor
governs, adapters act, projections guide, and LLMs/Dream Machine propose without
becoming authority**.

The core has **zero runtime dependencies** on purpose. Determinism is the product: an
Act's identity *is* the hash of its canonical bytes, so the hashing is true
[RFC 8785 (JCS)](https://www.rfc-editor.org/rfc/rfc8785), proven against the official
conformance vectors.

## Why it exists

A content hash proves **integrity**, not **authorship** or **completion**. This runtime
is built so that language cannot advance state without legitimate closure:

- **No silent drops.** A wake that can't be served becomes a durable `doubted` receipt.
- **No fake completion.** A result receipt that doesn't carry a contract's declared
  evidence is rejected as `evidence_incomplete`, not closed as done.
- **No self-asserted authority.** Dangerous (L4/L5) work requires a registered grant
  *and* a passkey/WebAuthn signoff — an LLM (no enclave, no biometric) cannot forge it.

## Install

```bash
pip install dream-machine-lab            # zero-dependency core + `lab` CLI
pip install "dream-machine-lab[webauthn]"  # + the optional crypto signature layer
```

From source:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[webauthn]"
```

## Quickstart

```bash
lab doctor              # environment + capability report
lab foundation suite    # RFC 8785 receipt conformance vectors (Node reference verifier)
lab dream verify        # Dream Machine schema/invariant checks
lab harness             # Santo André pack vectors
lab fleet audit --root fleet   # fleet / service allowlist audit
```

The conformance corpora live under `tests/fixtures/`; each command defaults there and
accepts `--source <path>` (and `lab fleet audit` accepts `--root <path>`) to override.

## Architecture

```
arrival ─▶ register (everything) ─▶ selector (clock / receiver) ─▶ queue (projection)
                                          │                            │
                                   doubt if unfulfillable        executor (governs)
                                                                       │
                              grant + passkey signoff (L4/L5) ◀────────┤
                                                                       ▼
                                              adapter (dumb leaf) ─▶ result receipt
                                                                       │
                                            evidence obligation enforced before `fechado`
```

Load-bearing invariants:

- **Receipt mold** (`lab/receipt.py`): nine string slots; `transport`/`result`/`evidence`
  forbidden at rest; canonical bytes via vendored RFC 8785; `id` = content hash.
- **Append-only ledger** (`lab/store.py`, `migrations/`): generated slot/AUX columns,
  update/delete blocked even for `service_role`; Postgres mirror with the same rules.
- **Selectors don't execute** (`lab/runtime.py`): the clock and receiver only select and
  queue; the executor re-evaluates before dispatch and writes a separate result act.
- **Authority is registered structure** (`lab/authority.py`, `lab/grants.py`): grants and
  authorities are append-only Acts; L4/L5 fail closed without a verified passkey signoff.
- **Projections / LLMs / Dream Machine are non-authoritative** (`lab/projections.py`,
  `lab/dream.py`): they may propose; they cannot activate processes or create consequence.

## Determinism & security

- **JCS / RFC 8785** — `lab/receipt.py` hashes over canonical bytes from the vendored
  Trail of Bits reference implementation (`lab/_vendor/rfc8785/`), proven byte-for-byte
  against the official conformance vectors in `tests/test_jcs_conformance.py`.
- **Passkey / WebAuthn binding** — the Act's `content_hash` *is* the WebAuthn challenge;
  a verifying assertion proves a hardware + biometric-gated human signed exactly that Act.
  Verification lives in the optional `lab/signing/` boundary; the kernel stays zero-dep
  and degrades honestly (`signature_layer_unavailable`) when the extra is absent.

See [SECURITY.md](SECURITY.md) for the threat model and vulnerability reporting.

## Development

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[webauthn]" pytest
pytest -q               # full suite (test_signing skips without the extra)
lab foundation suite    # conformance audits
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the canon you must not break (don't revert the
canonicalizer, don't fake closure, write tests first).

## Repository layout

| Path | What |
|------|------|
| `lab/` | the runtime package (kernel, zero-dep) |
| `lab/_vendor/` | vendored third-party code (RFC 8785), kept verbatim |
| `lab/signing/` | optional WebAuthn signature-verification boundary |
| `processes/` | process contracts (`*.v1.yml`) + generated catalogs |
| `migrations/` | Postgres ledger DDL (`logline_acts`, realtime, RLS) |
| `schemas/`, `docs/` | canonical schemas and doctrine documents |
| `tests/` | pytest suite + RFC 8785 conformance vectors |
| `tests/fixtures/` | conformance corpora: `santo-andre-vectors/`, `dream-machine/`, `logline-foundation/` |

## License

Apache-2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
