// T-F5: portal identity bridge — app session ↔ passport_hash ↔ display gloss.
// Read-only mapping; never grants authority from the membrane.

import { normalizePassportHash } from "./passport-hash.js";

export type AuthPrincipal = {
  principalId: string;
  principalType?: string;
  issuer?: string;
  authenticator?: string;
  attributes?: Record<string, unknown>;
};

export type PortalIdentity = {
  app_user_id: string;
  /** Sole authoritative actor identity — 64-char content hash only. */
  passport_hash: string | null;
  /** Display / legacy gloss only — never authority. */
  lab_id: string | null;
  supabase_user_id: string | null;
  grants: string[];
  connector_boundary: "app" | "vercel_connect" | "eve_local" | "unknown";
  read_only: true;
};

function parsePassportMap(): Record<string, string> {
  const raw = process.env.DREAM_MACHINE_PASSPORT_MAP?.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const hash = normalizePassportHash(value);
      if (hash) out[key] = hash;
    }
    return out;
  } catch {
    return {};
  }
}

function parseLabIdMap(): Record<string, string> {
  const raw = process.env.DREAM_MACHINE_LAB_ID_MAP?.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function identityLookupKeys(auth: AuthPrincipal): string[] {
  const keys: string[] = [];
  if (auth.principalId?.trim()) keys.push(auth.principalId.trim());
  const attrs = auth.attributes ?? {};
  for (const field of ["supabase_user_id", "sub", "email"] as const) {
    const value = attrs[field];
    if (typeof value === "string" && value.trim()) keys.push(value.trim());
  }
  return [...new Set(keys)];
}

/** Resolve canonical passport_hash from map keys or explicit default — never from lab_id gloss. */
export function resolvePassportHash(auth: AuthPrincipal): string | null {
  const map = parsePassportMap();
  for (const key of identityLookupKeys(auth)) {
    const hash = map[key];
    if (hash) return hash;
  }
  return normalizePassportHash(process.env.DREAM_MACHINE_DEFAULT_PASSPORT_HASH);
}

function parseGrantsForLab(labId: string | null): string[] {
  const global = process.env.DREAM_MACHINE_OPERATOR_GRANTS?.split(",").map((g) => g.trim()).filter(Boolean) ?? [];
  if (!labId) return global;
  const perLabKey = `DREAM_MACHINE_GRANTS_${labId.replace(/[^a-zA-Z0-9_]/g, "_").toUpperCase()}`;
  const perLab = process.env[perLabKey]?.split(",").map((g) => g.trim()).filter(Boolean) ?? [];
  return [...new Set([...global, ...perLab])];
}

function connectorBoundary(auth: AuthPrincipal): PortalIdentity["connector_boundary"] {
  if (auth.authenticator === "app" || auth.issuer === "app") return "app";
  if (auth.authenticator === "vercel_oidc" || auth.issuer?.includes("vercel")) return "vercel_connect";
  if (auth.principalId?.startsWith("eve:")) return "eve_local";
  return "unknown";
}

/** Map Eve/app auth principal → portal operator identity (observation-only). */
export function resolvePortalIdentity(auth?: AuthPrincipal | null): PortalIdentity | null {
  if (!auth?.principalId) return null;
  const labMap = parseLabIdMap();
  const labId = labMap[auth.principalId] ?? (process.env.DREAM_MACHINE_DEFAULT_LAB_ID?.trim() || null);
  const supabaseUserId = typeof auth.attributes?.supabase_user_id === "string"
    ? auth.attributes.supabase_user_id
    : (typeof auth.attributes?.sub === "string" ? auth.attributes.sub : null);

  return {
    app_user_id: auth.principalId,
    passport_hash: resolvePassportHash(auth),
    lab_id: labId,
    supabase_user_id: supabaseUserId,
    grants: parseGrantsForLab(labId),
    connector_boundary: connectorBoundary(auth),
    read_only: true,
  };
}