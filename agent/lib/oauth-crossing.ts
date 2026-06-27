// T-R2: OAuth client registration crossing — membrane edge effect with Envelope Shift record.

import { existsSync } from "node:fs";
import { createClient } from "@libsql/client";
import { canonicalJson, hashValue, sha256Text, type Hash, type JsonValue } from "./board-json-v0.js";
import {
  clientMetadata,
  OAUTH_ADMIN_ENDPOINT,
  OAUTH_CLIENT_DANGER_TIER,
  OAUTH_CLIENT_PROCESS_ID,
  type OAuthActFields,
} from "./oauth-client-metadata.js";
import {
  buildShiftRecord,
  buildShiftResultRecord,
  recordEffectCrossing,
  type BuiltShift,
  type BuiltShiftResult,
} from "./envelope-effect-store.js";
import { verifyEnvelopeStream } from "./envelope-verify.js";
import { verifyLoglineReceipt } from "./logline-receipt-verify.js";
import { resolveEnvelopeDbPath, resolveLoglineDbPath } from "./projection-bridge.js";

export type OAuthCrossingRequest = {
  act?: OAuthActFields;
  content_hash?: string;
  execute?: boolean;
  stream_id?: string;
  actor?: string;
  record_envelope?: boolean;
};

export type OAuthAdapterAux = {
  adapter_class: string;
  external_effect: boolean;
  api_called: boolean;
  endpoint: string;
  client_name: string;
  client_type: string;
  token_endpoint_auth_method: string;
  redirect_uris: string[];
  lab_id: string;
  client_metadata_hash: string;
  request_hash: string;
  metadata_valid: boolean;
};

export type OAuthCrossingOk = {
  ok: true;
  mode: "dry_run" | "executed";
  governance: {
    process_id: typeof OAUTH_CLIENT_PROCESS_ID;
    danger_tier: typeof OAUTH_CLIENT_DANGER_TIER;
    note: string;
  };
  adapter: OAuthAdapterAux;
  act: {
    content_hash: string;
    additive: boolean;
    body: Record<string, unknown>;
  };
  envelope: {
    transport: { sent_by: string; sent_to: string; channel: string; sent_at: number };
    custody: Array<{ custodian: string; from: string | null; to: string; at: number }>;
    shift: BuiltShift;
    shift_result: BuiltShiftResult;
    client_id: string | null;
  };
  cannot_do: string[];
};

export type OAuthCrossingError = {
  ok: false;
  reason: "act_not_found" | "invalid_act" | "crossing_failed" | "supabase_error" | "envelope_unavailable";
  message: string;
  cannot_do: string[];
};

export type OAuthCrossingResult = OAuthCrossingOk | OAuthCrossingError;

/** Envelope path for crossings: explicit env must exist; otherwise use bridge defaults. */
export function resolveEnvelopeDbForCrossing(): string | undefined {
  const explicit = process.env.DREAM_MACHINE_ENVELOPE_DB?.trim();
  if (explicit) return existsSync(explicit) ? explicit : undefined;
  return resolveEnvelopeDbPath();
}

const REQUIRED_CANNOT_DO = [
  "register_receipt",
  "dispatch_executor",
  "authorize_l5",
  "mutate_ledger",
  "store_client_secret",
] as const;

/** Shared builder — dry-run and execute use the same request material (T-R2 exit). */
export function buildOAuthCrossingRequest(source: OAuthActFields) {
  const meta = clientMetadata(source) as Record<string, JsonValue>;
  const request = { method: "POST", endpoint: OAUTH_ADMIN_ENDPOINT, client_metadata: meta };
  const client_metadata_hash = sha256Text(canonicalJson(meta));
  const request_hash = sha256Text(canonicalJson(request as JsonValue));
  return { meta, request, client_metadata_hash, request_hash };
}

export function buildOAuthAdapterAux(
  source: OAuthActFields,
  queueItem: { source_hash?: string } = {},
  apiCalled = false,
): OAuthAdapterAux {
  const { meta, client_metadata_hash, request_hash } = buildOAuthCrossingRequest(source);
  return {
    adapter_class: apiCalled ? "oauth.client_registration.execute" : "oauth.client_registration.dry_run",
    external_effect: apiCalled,
    api_called: apiCalled,
    endpoint: OAUTH_ADMIN_ENDPOINT,
    client_name: String(meta.client_name),
    client_type: String(meta.client_type),
    token_endpoint_auth_method: String(meta.token_endpoint_auth_method),
    redirect_uris: meta.redirect_uris as string[],
    lab_id: source.lab_id ?? "",
    client_metadata_hash,
    request_hash,
    metadata_valid: true,
  };
}

/** Strip client_secret — never enters receipt, projection, or crossing response. */
export function redactSupabaseOAuthResponse(body: Record<string, unknown>): { client_id: string | null } {
  const clientId = typeof body.client_id === "string" ? body.client_id : null;
  return { client_id: clientId };
}

function supabaseBaseUrl(): string {
  const url = process.env.SUPABASE_URL?.trim();
  if (url) return url.replace(/\/+$/, "");
  const ref = process.env.SUPABASE_PROJECT_REF?.trim();
  if (ref) return `https://${ref}.supabase.co`;
  throw new Error("SUPABASE_URL or SUPABASE_PROJECT_REF required for execute");
}

export async function postSupabaseOAuthClient(
  meta: Record<string, JsonValue>,
): Promise<{ client_id: string | null }> {
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secret) throw new Error("SUPABASE_SECRET_KEY required for execute");

  const res = await fetch(`${supabaseBaseUrl()}${OAUTH_ADMIN_ENDPOINT}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      apikey: secret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(meta),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Supabase returned ${res.status}: ${detail}`);
  }
  const body = (await res.json()) as Record<string, unknown>;
  return redactSupabaseOAuthResponse(body);
}

const HEX64 = /^[0-9a-f]{64}$/;

export function assertOAuthActAnchor(
  act: Record<string, unknown>,
  anchor: string,
): string | null {
  if (!HEX64.test(anchor)) return "content_hash anchor must be 64 lowercase hex chars";
  if (typeof act.id === "string" && act.id !== anchor) {
    return "act.id does not match requested content_hash anchor";
  }
  if (act.hashes && typeof act.hashes === "object") {
    const stored = (act.hashes as { content_hash?: string }).content_hash;
    if (typeof stored === "string" && stored !== anchor) {
      return "hashes.content_hash does not match requested content_hash anchor";
    }
  }
  if (act.if_ok !== OAUTH_CLIENT_PROCESS_ID) {
    return `act if_ok must be ${OAUTH_CLIENT_PROCESS_ID}`;
  }
  return null;
}

export async function loadOAuthAct(contentHash: string): Promise<Record<string, unknown> | null> {
  if (!HEX64.test(contentHash)) return null;
  const dbPath = resolveLoglineDbPath();
  if (!dbPath) return null;
  const client = createClient({ url: `file:${dbPath}` });
  try {
    const row = await client.execute({
      sql: "SELECT content_hash, act FROM logline_acts WHERE content_hash = ?",
      args: [contentHash],
    });
    const storedHash = row.rows[0]?.content_hash;
    const actJson = row.rows[0]?.act;
    if (typeof storedHash !== "string" || storedHash !== contentHash) return null;
    if (typeof actJson !== "string") return null;
    const parsed = JSON.parse(actJson) as Record<string, unknown>;
    const anchorError = assertOAuthActAnchor(parsed, contentHash);
    if (anchorError) return null;
    const receipt = verifyLoglineReceipt(parsed);
    if (!receipt.ok) return null;
    parsed.id = contentHash;
    return parsed;
  } finally {
    client.close();
  }
}

function actContentHash(act: Record<string, unknown>): string {
  const fromHashes = act.hashes && typeof act.hashes === "object"
    ? (act.hashes as { content_hash?: string }).content_hash
    : undefined;
  const id = typeof act.id === "string" ? act.id : "";
  return id || fromHashes || "";
}

function buildEnvelopeRecords(
  input: {
    source: OAuthActFields;
    adapter: OAuthAdapterAux;
    inputHash: Hash;
    streamId: string;
    actor: string;
    clientId: string | null;
    now: number;
    sentBy: string;
  },
): { shift: BuiltShift; result: BuiltShiftResult; transport: OAuthCrossingOk["envelope"]["transport"]; custody: OAuthCrossingOk["envelope"]["custody"] } {
  const transport = {
    sent_by: input.sentBy,
    sent_to: "supabase.auth",
    channel: "https",
    sent_at: input.now,
  };
  const custody = [{
    custodian: input.source.confirmed_by ?? input.actor,
    from: "logline",
    to: "supabase",
    at: input.now,
  }];
  const evidence = [
    { kind: "crossing_edge", value: { edge: "membrane_to_supabase", mode: "authority_bearing" }, ts: input.now },
    { kind: "transport", value: transport, ts: input.now },
    { kind: "request_hash", value: input.adapter.request_hash, ts: input.now },
    { kind: "client_metadata_hash", value: input.adapter.client_metadata_hash, ts: input.now },
    ...(input.clientId ? [{ kind: "client_id", value: input.clientId, ts: input.now }] : []),
  ];
  const shift = buildShiftRecord({
    stream_id: input.streamId,
    role: "membrane.crossing",
    kind: "effect",
    input_hash: input.inputHash,
    actor: input.actor,
    risk_observed: OAUTH_CLIENT_DANGER_TIER,
    evidence,
    opened_at: input.now,
    closed_at: input.now,
    duration_ms: 0,
    model_call: null,
  });
  const outputBody = { client_id: input.clientId ?? "dry-run" };
  const output_hash = hashValue(outputBody as JsonValue);
  const output_refs = input.clientId ? [input.clientId, input.inputHash] : [input.inputHash];
  const result = buildShiftResultRecord({
    shift_hash: shift.shift_hash,
    output_kind: "effect_result",
    output_hash,
    output_refs,
    recorded_at: input.now,
  });
  return { shift, result, transport, custody };
}

export async function crossOAuthClientRegistration(
  req: OAuthCrossingRequest,
): Promise<OAuthCrossingResult> {
  const cannot_do = [...REQUIRED_CANNOT_DO];
  const execute = req.execute === true;
  const recordEnvelope = req.record_envelope !== false;

  if (execute && req.act) {
    return {
      ok: false,
      reason: "invalid_act",
      message: "execute requires content_hash ledger anchor; inline act is not allowed",
      cannot_do,
    };
  }

  let actBody: Record<string, unknown>;
  let anchorSource: "ledger" | "inline";
  const actSnapshot = req.act ? structuredClone(req.act) as Record<string, unknown> : undefined;

  if (req.content_hash) {
    const loaded = await loadOAuthAct(req.content_hash);
    if (!loaded) {
      return {
        ok: false,
        reason: "act_not_found",
        message: `no verified oauth act for ${req.content_hash}`,
        cannot_do,
      };
    }
    actBody = loaded;
    anchorSource = "ledger";
  } else if (req.act) {
    actBody = structuredClone(req.act) as Record<string, unknown>;
    anchorSource = "inline";
  } else {
    return { ok: false, reason: "invalid_act", message: "act or content_hash required", cannot_do };
  }

  const contentHashBefore = actContentHash(actBody);
  if (!HEX64.test(contentHashBefore)) {
    return { ok: false, reason: "invalid_act", message: "act missing content_hash anchor", cannot_do };
  }

  const anchorError = assertOAuthActAnchor(actBody, contentHashBefore);
  if (anchorError) {
    return { ok: false, reason: "invalid_act", message: anchorError, cannot_do };
  }

  if (execute && anchorSource !== "ledger") {
    return {
      ok: false,
      reason: "invalid_act",
      message: "execute requires a LogLine ledger anchor",
      cannot_do,
    };
  }

  const source: OAuthActFields = {
    ...actBody,
    id: contentHashBefore,
  } as OAuthActFields;

  if (recordEnvelope) {
    const envelopeDb = resolveEnvelopeDbForCrossing();
    if (!envelopeDb) {
      return {
        ok: false,
        reason: "envelope_unavailable",
        message: execute
          ? "DREAM_MACHINE_ENVELOPE_DB required to record execute crossing evidence"
          : "DREAM_MACHINE_ENVELOPE_DB required to record crossing evidence",
        cannot_do,
      };
    }
  }

  try {
    const adapter = buildOAuthAdapterAux(source, { source_hash: contentHashBefore }, execute);
    let clientId: string | null = null;

    if (execute) {
      const { meta } = buildOAuthCrossingRequest(source);
      clientId = (await postSupabaseOAuthClient(meta)).client_id;
      if (!clientId) {
        return { ok: false, reason: "supabase_error", message: "Supabase response missing client_id", cannot_do };
      }
    }

    const now = Date.now();
    const streamId = req.stream_id ?? "membrane.oauth";
    const actor = req.actor ?? "membrane.crossing";
    const { shift, result, transport, custody } = buildEnvelopeRecords({
      source,
      adapter,
      inputHash: contentHashBefore as Hash,
      streamId,
      actor,
      clientId,
      now,
      sentBy: actor,
    });

    if (recordEnvelope) {
      const envelopeDb = resolveEnvelopeDbForCrossing();
      if (!envelopeDb) {
        return {
          ok: false,
          reason: "envelope_unavailable",
          message: "DREAM_MACHINE_ENVELOPE_DB required to record crossing evidence",
          cannot_do,
        };
      }
      await recordEffectCrossing(envelopeDb, shift, result);
      const envelopeVerify = await verifyEnvelopeStream(envelopeDb, streamId, "receipts");
      if (!envelopeVerify.ok) {
        const detail = envelopeVerify.issues[0]?.message ?? "envelope receipt verify failed";
        return {
          ok: false,
          reason: "envelope_unavailable",
          message: detail,
          cannot_do,
        };
      }
    }

    const contentHashAfter = actContentHash(actBody);
    const bodyUnchanged = actSnapshot
      ? JSON.stringify(actBody) === JSON.stringify(actSnapshot)
      : true;
    const additive = contentHashBefore === contentHashAfter && bodyUnchanged;

    return {
      ok: true,
      mode: execute ? "executed" : "dry_run",
      governance: {
        process_id: OAUTH_CLIENT_PROCESS_ID,
        danger_tier: OAUTH_CLIENT_DANGER_TIER,
        note: "L3 retained per oauth-client.v1 contract; L4/L5 grant gate not required for registration intent.",
      },
      adapter,
      act: {
        content_hash: contentHashBefore,
        additive,
        body: actBody,
      },
      envelope: {
        transport,
        custody,
        shift,
        shift_result: result,
        client_id: clientId,
      },
      cannot_do,
    };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error && err.message.includes("Supabase") ? "supabase_error" : "crossing_failed",
      message: err instanceof Error ? err.message : String(err),
      cannot_do,
    };
  }
}

export async function handleOAuthCrossingPost(body: OAuthCrossingRequest): Promise<OAuthCrossingResult> {
  return crossOAuthClientRegistration(body);
}