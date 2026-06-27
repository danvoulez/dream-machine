// Contract: docs/dream-machine-passport.v0.yml — passport identity is content_hash only.

export const PASSPORT_HASH_PATTERN = /^[0-9a-f]{64}$/;

/** Normalize and validate a passport_hash (sha256 hex). Rejects nicknames like lab:dan. */
export function normalizePassportHash(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  return PASSPORT_HASH_PATTERN.test(trimmed) ? trimmed : null;
}