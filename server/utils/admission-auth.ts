import { createError, getHeader, type H3Event } from "h3";
import { parseRuntimeBearer } from "./projection-auth.js";

function admissionTokenClass(): string | undefined {
  return process.env.DREAM_MACHINE_ADMISSION_TOKEN_CLASS?.trim().toLowerCase()
    || process.env.DREAM_MACHINE_RUNTIME_TOKEN_CLASS?.trim().toLowerCase();
}

function resolveExpectedAdmissionToken(): string | undefined {
  const admission = process.env.DREAM_MACHINE_ADMISSION_TOKEN?.trim();
  if (admission) return admission;

  const tokenClass = admissionTokenClass();
  if (tokenClass === "proposal") {
    return process.env.DREAM_MACHINE_RUNTIME_TOKEN?.trim();
  }
  return undefined;
}

/** Proposal-only admission — read/runtime tokens cannot submit proposals. */
export function verifyAdmissionIntakeAuth(event: H3Event): void {
  const bearer = parseRuntimeBearer(getHeader(event, "authorization"));
  const admissionToken = process.env.DREAM_MACHINE_ADMISSION_TOKEN?.trim();
  const runtimeClass = process.env.DREAM_MACHINE_RUNTIME_TOKEN_CLASS?.trim().toLowerCase();
  const admissionClass = process.env.DREAM_MACHINE_ADMISSION_TOKEN_CLASS?.trim().toLowerCase();

  if (!admissionToken && runtimeClass === "read") {
    throw createError({
      statusCode: 403,
      statusMessage: "forbidden",
      message: "read-only runtime token cannot submit admission intake",
    });
  }

  if (!admissionToken && runtimeClass && runtimeClass !== "proposal") {
    throw createError({
      statusCode: 403,
      statusMessage: "forbidden",
      message: `DREAM_MACHINE_RUNTIME_TOKEN_CLASS=${runtimeClass} cannot submit admission intake`,
    });
  }

  const expected = resolveExpectedAdmissionToken();
  if (!expected) {
    if (process.env.NODE_ENV === "test") {
      const testToken = process.env.DREAM_MACHINE_ADMISSION_TEST_TOKEN?.trim();
      if (testToken && bearer === testToken) return;
    }
    throw createError({
      statusCode: 503,
      statusMessage: "config_error",
      message: "DREAM_MACHINE_ADMISSION_TOKEN or proposal-class runtime token required for POST /admission/intake",
    });
  }

  if (admissionClass && admissionClass !== "proposal" && admissionToken) {
    throw createError({
      statusCode: 503,
      statusMessage: "config_error",
      message: `DREAM_MACHINE_ADMISSION_TOKEN_CLASS must be proposal; got ${admissionClass}`,
    });
  }

  if (bearer !== expected) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
}