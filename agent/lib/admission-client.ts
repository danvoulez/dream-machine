import type { Proposal } from "../../shared/tools/scene.js";
import type { PortalIdentity } from "./identity-bridge.js";
import {
  handleAdmissionIntake,
  type AdmissionIntakeRequest,
  type AdmissionIntakeResult,
} from "../../server/utils/admission-intake.js";

function admissionBaseUrl(): string | undefined {
  const explicit = process.env.DREAM_MACHINE_ADMISSION_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const runtime = process.env.DREAM_MACHINE_RUNTIME_URL?.trim();
  if (runtime) return runtime.replace(/\/+$/, "");
  if (process.env.DREAM_MACHINE_RUNTIME_SHELL_ONLY === "1") return undefined;
  return process.env.BETTER_AUTH_URL?.trim()?.replace(/\/+$/, "");
}

function admissionBearer(): string | undefined {
  return process.env.DREAM_MACHINE_ADMISSION_TOKEN?.trim()
    || (process.env.DREAM_MACHINE_RUNTIME_TOKEN_CLASS?.trim().toLowerCase() === "proposal"
      ? process.env.DREAM_MACHINE_RUNTIME_TOKEN?.trim()
      : undefined);
}

export function proposalToIntakeRequest(
  proposal: Proposal,
  operator: Pick<PortalIdentity, "passport_hash" | "lab_id" | "app_user_id">,
  source: AdmissionIntakeRequest["source"],
): AdmissionIntakeRequest | null {
  if (!operator.passport_hash) return null;
  return {
    kind: "proposal",
    actor: {
      passport_hash: operator.passport_hash,
      lab_id: operator.lab_id,
    },
    source,
    intent: {
      action: proposal.intent,
      reason: proposal.reason,
      payload: proposal.args,
    },
    constraints: {
      requires_human_approval: proposal.airlock === "human-approval",
      airlock: proposal.airlock === "human-approval"
        ? "human-approval"
        : proposal.effect_class === "irreversible"
          ? "effect-intended"
          : "none",
    },
  };
}

export async function submitAdmissionIntake(
  body: AdmissionIntakeRequest,
): Promise<AdmissionIntakeResult> {
  const base = admissionBaseUrl();
  if (!base) {
    return handleAdmissionIntake(body);
  }

  const token = admissionBearer();
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(`${base}/admission/intake`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const parsed = (await res.json()) as AdmissionIntakeResult;
  if (!res.ok && parsed && typeof parsed === "object" && "ok" in parsed) {
    return parsed;
  }
  if (!res.ok) {
    return {
      ok: false,
      reason: "invalid_request",
      message: `admission intake HTTP ${res.status}`,
      cannot_do: ["register_receipt", "mutate_ledger", "close_run", "commit_effect"],
    };
  }
  return parsed;
}

export async function attachProposalIntakeIds(
  proposals: Proposal[],
  operator: Pick<PortalIdentity, "passport_hash" | "lab_id" | "app_user_id">,
  source: AdmissionIntakeRequest["source"],
): Promise<Proposal[]> {
  if (!operator.passport_hash || proposals.length === 0) return proposals;

  const out: Proposal[] = [];
  for (const proposal of proposals) {
    const body = proposalToIntakeRequest(proposal, operator, source);
    if (!body) {
      out.push(proposal);
      continue;
    }
    const result = await submitAdmissionIntake(body);
    if (result.ok) {
      out.push({ ...proposal, proposal_id: result.proposal_id });
    } else {
      out.push(proposal);
    }
  }
  return out;
}