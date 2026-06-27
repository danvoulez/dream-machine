// RFC 7591 client metadata — TS mirror of Dream-Machine-LogLine-Acts/lab/oauth.py (T-R2).

import type { JsonValue } from "./board-json-v0.js";

export const OAUTH_ADMIN_ENDPOINT = "/auth/v1/admin/oauth/clients";
export const OAUTH_CLIENT_PROCESS_ID = "oauth-client.v1";
/** Governance (T-R2): contract declares L3; crossing records risk_observed L3 — below L4/L5 grant gate. */
export const OAUTH_CLIENT_DANGER_TIER = "L3" as const;

const VALID_CLIENT_TYPES = new Set(["public", "confidential"]);
const VALID_AUTH_METHODS = new Set(["none", "client_secret_basic", "client_secret_post"]);

export class OAuthMetadataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OAuthMetadataError";
  }
}

export type OAuthActFields = {
  id?: string;
  client_name?: string;
  this?: string;
  redirect_uris?: string[];
  client_type?: string;
  token_endpoint_auth_method?: string | null;
  grant_types?: string[];
  response_types?: string[];
  scope?: string;
  lab_id?: string;
  confirmed_by?: string;
};

export function resolveAuthMethod(clientType: string, requested: string | null | undefined): string {
  if (!VALID_CLIENT_TYPES.has(clientType)) {
    throw new OAuthMetadataError(`schema-invalid: client_type must be one of ${[...VALID_CLIENT_TYPES].sort().join(", ")}`);
  }
  if (clientType === "public") {
    if (requested != null && requested !== "none") {
      throw new OAuthMetadataError("schema-invalid: public clients must use token_endpoint_auth_method 'none'");
    }
    return "none";
  }
  const method = requested ?? "client_secret_basic";
  if (method === "none") {
    throw new OAuthMetadataError("schema-invalid: confidential clients cannot use token_endpoint_auth_method 'none'");
  }
  if (!VALID_AUTH_METHODS.has(method)) {
    throw new OAuthMetadataError(`schema-invalid: token_endpoint_auth_method must be one of ${[...VALID_AUTH_METHODS].sort().join(", ")}`);
  }
  return method;
}

export function clientMetadata(source: OAuthActFields): Record<string, JsonValue> {
  const name = source.client_name ?? source.this ?? "";
  if (typeof name !== "string" || !name) {
    throw new OAuthMetadataError("schema-invalid: client_name (or this) must be a non-empty string");
  }
  const redirectUris = source.redirect_uris ?? [];
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    throw new OAuthMetadataError("schema-invalid: redirect_uris must be a non-empty list");
  }
  if (!redirectUris.every((u) => typeof u === "string" && u)) {
    throw new OAuthMetadataError("schema-invalid: every redirect_uri must be a non-empty string");
  }
  const clientType = source.client_type ?? "confidential";
  const authMethod = resolveAuthMethod(clientType, source.token_endpoint_auth_method);
  const grantTypes = source.grant_types ?? ["authorization_code", "refresh_token"];
  return {
    client_name: name,
    client_type: clientType,
    redirect_uris: [...redirectUris],
    grant_types: [...grantTypes],
    response_types: [...(source.response_types ?? ["code"])],
    token_endpoint_auth_method: authMethod,
    scope: source.scope ?? "",
  };
}