# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-06-22

First release: a processual, ledger-backed runtime — append-only ledger, receipt mold,
evaluator, queue, selector/executor split, projection doctrine, and the Dream Machine
boundary, with the determinism and authority guarantees below.

### Added
- **Realtime delivery** — migration `0002_realtime_publication.sql` enables
  `public.logline_acts` in the `supabase_realtime` publication; a runnable WebSocket
  receiver under `runtime/receiver/` (the row is the durable event, realtime is the bell).
- **True RFC 8785 (JCS) canonicalization** — receipt hashing now uses the vendored
  Trail of Bits reference implementation (`lab/_vendor/rfc8785/`, zero-dependency),
  proven byte-for-byte against the official conformance vectors. Replaces a
  `json.dumps(sort_keys=True)` that diverged on number formatting, integer domain, and
  UTF-16 key ordering.
- **Durable attention/doubt** — selectors (`receiver`, `clock`) now write an idempotent
  `doubt` receipt for an addressed-but-unfulfillable tap instead of dropping it silently.
- **Authority & grants (LAB FINAL SPEC §13)** — grants and authorities are registered
  append-only Acts (`lab/grants.py`, `lab/authority.py`); L4/L5 work resolves and verifies
  a grant rather than trusting self-asserted fields, with append-only revocation.
- **Passkey / WebAuthn signature binding** — the optional `[webauthn]` extra
  (`lab/signing/`) verifies a FIDO2 assertion over an Act's `content_hash`; attestation-
  verified enrollment; **all L4/L5 execution requires a verified passkey signoff**
  (fail-closed). The kernel stays zero-dependency and degrades honestly without the extra.
- **Evidence obligations enforced** — the executor verifies a contract's
  `evidence_must_include` against adapter output and writes `evidence_incomplete`
  instead of a fake `fechado` when evidence is missing.
- **RLS + function hardening** — migration `0003` restores RLS (service-role-only) and pins
  the mutation-trigger `search_path`, matching canon.
- **Packaging** — `[build-system]` (hatchling), full project metadata, Apache-2.0
  license, `README`, `SECURITY`, `CONTRIBUTING`, `CODE_OF_CONDUCT`, CI, and issue/PR
  templates. The package is installable; `pip install dream-machine-lab[webauthn]` adds
  the crypto layer.

### Changed
- **Conformance corpora replace `fontes-dm.zip`** — the 16MB / 2466-entry source bundle is
  gone. The 92 files actually consumed are now clean, named fixtures under `tests/fixtures/`
  (`santo-andre-vectors/`, `dream-machine/`, `logline-foundation/`). The `harness`, `dream`,
  and `foundation` readers walk the filesystem; their CLI `--zip` flag is replaced by
  `--source` (defaulting to the fixture dir). CI now pins Node 20 for the Foundation
  reference verifier.

### Removed
- **`lab sources audit` / `lab/sources.py`** — the command existed only to audit the raw
  bundle that no longer exists.

[0.1.0]: https://github.com/danvoulez/dream-machine/releases/tag/v0.1.0
