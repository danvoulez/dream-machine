// T-R2: append-only Envelope Shift + ShiftResult for external effect crossings.

import { createClient, type Client } from "@libsql/client";
import { canonicalJson, hashValue, type Hash, type JsonValue } from "./board-json-v0.js";

export type EffectEvidence = {
  evidence_id?: string;
  kind: string;
  value: JsonValue;
  ts: number;
};

export type BuiltShift = {
  shift_hash: Hash;
  stream_id: string;
  role: string;
  kind: "effect";
  input_hash: Hash;
  actor: string;
  risk_observed: string;
  evidence: EffectEvidence[];
  opened_at: number;
  closed_at: number;
  duration_ms: number;
  model_call: null;
};

export type BuiltShiftResult = {
  result_hash: Hash;
  shift_hash: Hash;
  output_kind: "effect_result";
  output_hash: Hash;
  output_refs: string[];
  recorded_at: number;
};

function buildShiftIdentityBody(shift: Omit<BuiltShift, "shift_hash">) {
  return {
    stream_id: shift.stream_id,
    role: shift.role,
    kind: shift.kind,
    input_hash: shift.input_hash,
    actor: shift.actor,
    risk_observed: shift.risk_observed,
    evidence_hashes: shift.evidence.map((e) => hashValue(e as unknown as JsonValue)),
    opened_at: shift.opened_at,
    closed_at: shift.closed_at,
    duration_ms: shift.duration_ms,
    model_call: shift.model_call,
  };
}

export function buildShiftRecord(input: Omit<BuiltShift, "shift_hash">): BuiltShift {
  const shift_hash = hashValue(buildShiftIdentityBody(input) as unknown as JsonValue);
  return { ...input, shift_hash };
}

function buildShiftResultIdentityBody(result: Omit<BuiltShiftResult, "result_hash">) {
  return {
    shift_hash: result.shift_hash,
    output_kind: result.output_kind,
    output_hash: result.output_hash,
    output_refs: result.output_refs,
    recorded_at: result.recorded_at,
  };
}

export function buildShiftResultRecord(input: Omit<BuiltShiftResult, "result_hash">): BuiltShiftResult {
  const result_hash = hashValue(buildShiftResultIdentityBody(input) as unknown as JsonValue);
  return { ...input, result_hash };
}

async function ensureStream(client: Client, streamId: string, now: number): Promise<void> {
  await client.execute({
    sql: `INSERT OR IGNORE INTO streams (stream_id, canonicalization, hash_algorithm, created_at)
          VALUES (?, 'board-json-v0', 'sha256', ?)`,
    args: [streamId, now],
  });
}

export async function recordEffectCrossing(
  dbPath: string,
  shift: BuiltShift,
  result: BuiltShiftResult,
): Promise<void> {
  const client = createClient({ url: `file:${dbPath}` });
  try {
    await ensureStream(client, shift.stream_id, shift.opened_at);
    await client.execute({
      sql: `INSERT OR IGNORE INTO shifts (
        shift_hash, stream_id, role, kind, input_hash, actor, risk_observed,
        evidence_json, opened_at, closed_at, duration_ms, model_call_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        shift.shift_hash,
        shift.stream_id,
        shift.role,
        shift.kind,
        shift.input_hash,
        shift.actor,
        shift.risk_observed,
        canonicalJson(shift.evidence as unknown as JsonValue),
        shift.opened_at,
        shift.closed_at,
        shift.duration_ms,
        null,
      ],
    });
    await client.execute({
      sql: `INSERT OR IGNORE INTO shift_results (
        result_hash, shift_hash, output_kind, output_hash, output_refs_json, recorded_at, identity_body_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        result.result_hash,
        result.shift_hash,
        result.output_kind,
        result.output_hash,
        canonicalJson(result.output_refs as unknown as JsonValue),
        result.recorded_at,
        canonicalJson(buildShiftResultIdentityBody(result) as unknown as JsonValue),
      ],
    });
  } finally {
    client.close();
  }
}