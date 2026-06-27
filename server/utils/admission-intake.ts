// C0.4 proposal.seam — intake receives candidates; never commits consequence.

import { createHash } from "node:crypto";
import { normalizePassportHash } from "../../agent/lib/passport-hash.js";

export const PROPOSAL_INTAKE_FORBIDDEN = [
  "register_receipt",
  "mutate_ledger",
  "append_logline",
  "close_run",
  "grant_authority",
  "effect.commit",
  "airlock.commit",
  "write_sqlite",
] as const;

export const ADMISSION_INTAKE_CANNOT_DO = [
  "register_receipt",
  "mutate_ledger",
  "close_run",
  "commit_effect",
] as const;

/** Intake path never mutates LogLine/Envelope ledgers (C0.4 seam test anchor). */
export const ADMISSION_INTAKE_LEDGER_MUTATION = false as const;

const INTAKE_SURFACES = new Set(["eve", "web", "connect", "acceptance", "test"]);
const INTAKE_AIRLOCKS = new Set(["human-approval", "effect-intended", "none"]);

export type AdmissionIntakeRequest = {
  kind: "proposal";
  actor: {
    passport_hash: string;
    lab_id?: string | null;
  };
  source: {
    surface: "eve" | "web" | "connect" | "acceptance" | "test";
    session_id?: string;
    trace_id?: string;
  };
  intent: {
    action: string;
    target?: string;
    reason?: string;
    payload?: unknown;
  };
  constraints?: {
    requires_human_approval?: boolean;
    airlock?: "human-approval" | "effect-intended" | "none";
  };
};

export type AdmissionIntakeOk = {
  ok: true;
  admitted: false;
  committed: false;
  proposal_id: string;
  route_class: "proposal-only";
  cannot_do: typeof ADMISSION_INTAKE_CANNOT_DO[number][];
};

export type AdmissionIntakeErr = {
  ok: false;
  reason:
    | "invalid_request"
    | "invalid_passport"
    | "forbidden_operation"
    | "pretend_admitted_act"
    | "anonymous_not_admitted";
  message: string;
  cannot_do: typeof ADMISSION_INTAKE_CANNOT_DO[number][];
};

export type AdmissionIntakeResult = AdmissionIntakeOk | AdmissionIntakeErr;

const intakeRecords = new Map<string, AdmissionIntakeRequest>();

function stableProposalId(body: AdmissionIntakeRequest): string {
  const canonical = JSON.stringify({
    kind: body.kind,
    actor: { passport_hash: body.actor.passport_hash, lab_id: body.actor.lab_id ?? null },
    source: body.source,
    intent: body.intent,
    constraints: body.constraints ?? null,
  });
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function forbiddenHit(value: string): string | null {
  const lower = value.toLowerCase();
  for (const op of PROPOSAL_INTAKE_FORBIDDEN) {
    if (lower === op.toLowerCase() || lower.includes(op.toLowerCase())) {
      return op;
    }
  }
  return null;
}

function scanForbiddenValue(value: unknown, seen = new Set<unknown>()): string | null {
  if (value == null) return null;
  if (typeof value === "string") return forbiddenHit(value);
  if (typeof value !== "object") return null;
  if (seen.has(value)) return null;
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = scanForbiddenValue(item, seen);
      if (hit) return hit;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const keyHit = forbiddenHit(key);
    if (keyHit) return keyHit;
    const childHit = scanForbiddenValue(child, seen);
    if (childHit) return childHit;
  }
  return null;
}

function looksLikePretendAdmittedAct(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const obj = payload as Record<string, unknown>;
  const hasHashAnchor = typeof obj.content_hash === "string"
    || typeof obj.id === "string"
    || typeof obj.receipt_id === "string";
  const hasActShape = typeof obj.did === "string"
    || typeof obj.who === "string"
    || obj.already_admitted === true
    || obj.admitted === true
    || obj.committed === true;
  return hasHashAnchor && hasActShape;
}

function err(
  reason: AdmissionIntakeErr["reason"],
  message: string,
): AdmissionIntakeErr {
  return {
    ok: false,
    reason,
    message,
    cannot_do: [...ADMISSION_INTAKE_CANNOT_DO],
  };
}

function validateRequest(body: unknown): AdmissionIntakeRequest | AdmissionIntakeErr {
  if (!body || typeof body !== "object") {
    return err("invalid_request", "JSON body required");
  }
  const raw = body as Partial<AdmissionIntakeRequest>;
  if (raw.kind !== "proposal") {
    return err("invalid_request", "kind must be proposal");
  }
  if (!raw.actor || typeof raw.actor !== "object") {
    return err("invalid_request", "actor required");
  }
  const passport = normalizePassportHash(raw.actor.passport_hash);
  if (!passport) {
    return err("invalid_passport", "actor.passport_hash must be a 64-char content hash");
  }
  if (!raw.source || typeof raw.source !== "object") {
    return err("invalid_request", "source required");
  }
  if (!INTAKE_SURFACES.has(raw.source.surface)) {
    return err("invalid_request", "source.surface invalid");
  }
  if (!raw.intent || typeof raw.intent !== "object" || !raw.intent.action?.trim()) {
    return err("invalid_request", "intent.action required");
  }

  const request: AdmissionIntakeRequest = {
    kind: "proposal",
    actor: {
      passport_hash: passport,
      lab_id: raw.actor.lab_id ?? null,
    },
    source: {
      surface: raw.source.surface,
      session_id: raw.source.session_id,
      trace_id: raw.source.trace_id,
    },
    intent: {
      action: raw.intent.action.trim(),
      target: raw.intent.target,
      reason: raw.intent.reason,
      payload: raw.intent.payload,
    },
    constraints: raw.constraints,
  };

  if (request.constraints?.airlock && !INTAKE_AIRLOCKS.has(request.constraints.airlock)) {
    return err("invalid_request", "constraints.airlock invalid");
  }

  const actionHit = forbiddenHit(request.intent.action);
  if (actionHit) {
    return err("forbidden_operation", `intent.action forbids ${actionHit}`);
  }

  const scanHit = scanForbiddenValue(request.intent.payload)
    ?? scanForbiddenValue(request.intent.target)
    ?? scanForbiddenValue(request.intent.reason);
  if (scanHit) {
    return err("forbidden_operation", `payload forbids ${scanHit}`);
  }

  if (looksLikePretendAdmittedAct(request.intent.payload)) {
    return err("pretend_admitted_act", "inline admitted Act shapes are not accepted at intake");
  }

  return request;
}

/** Proposal-only intake — validate, classify, store in-memory; never append/close/commit. */
export function handleAdmissionIntake(body: unknown): AdmissionIntakeResult {
  const validated = validateRequest(body);
  if ("ok" in validated && validated.ok === false) {
    return validated;
  }
  const request = validated as AdmissionIntakeRequest;
  const proposal_id = stableProposalId(request);
  intakeRecords.set(proposal_id, request);
  return {
    ok: true,
    admitted: false,
    committed: false,
    proposal_id,
    route_class: "proposal-only",
    cannot_do: [...ADMISSION_INTAKE_CANNOT_DO],
  };
}

export function getAdmissionIntakeRecord(proposalId: string): AdmissionIntakeRequest | undefined {
  return intakeRecords.get(proposalId);
}

export function resetAdmissionIntakeRecords(): void {
  intakeRecords.clear();
}