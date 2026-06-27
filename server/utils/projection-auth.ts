import { createError, getHeader, type H3Event } from "h3";

export function parseRuntimeBearer(authorizationHeader: string | undefined): string | undefined {
  if (!authorizationHeader?.startsWith("Bearer ")) return undefined;
  const token = authorizationHeader.slice(7).trim();
  return token || undefined;
}

/**
 * C0.1 — /projection may be open only in explicit local/shell/test mode.
 * Production without DREAM_MACHINE_RUNTIME_TOKEN is a config failure, not open access.
 */
export function isProjectionAuthOpenAllowed(): boolean {
  if (process.env.DREAM_MACHINE_RUNTIME_SHELL_ONLY === "1") return true;
  if (process.env.DREAM_MACHINE_RUNTIME_DEV_OPEN === "1") return true;
  if (process.env.NODE_ENV === "test") return true;
  if (process.env.NODE_ENV !== "production" && process.env.DREAM_MACHINE_ACCEPTANCE === "1") {
    return true;
  }
  return false;
}

/** HTTP client guard — same policy as server before calling remote /projection. */
export function requireRuntimeTokenForHttp(): void {
  if (isProjectionAuthOpenAllowed()) return;
  if (!process.env.DREAM_MACHINE_RUNTIME_TOKEN?.trim()) {
    throw new Error("DREAM_MACHINE_RUNTIME_TOKEN required for HTTP projection runtime");
  }
}

/** Read-only projection runtime — fail-closed in production when token unset. */
export function verifyProjectionRuntimeAuth(event: H3Event): void {
  const expected = process.env.DREAM_MACHINE_RUNTIME_TOKEN?.trim();

  if (!expected) {
    if (isProjectionAuthOpenAllowed()) return;
    throw createError({
      statusCode: 503,
      statusMessage: "config_error",
      message: "DREAM_MACHINE_RUNTIME_TOKEN required for POST /projection",
    });
  }

  const bearer = parseRuntimeBearer(getHeader(event, "authorization"));
  if (bearer !== expected) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
}

/** External-effect crossing — fail closed; token must be configured and presented. */
export function verifyOAuthCrossingAuth(event: H3Event): void {
  const expected = process.env.DREAM_MACHINE_RUNTIME_TOKEN?.trim();
  if (!expected) {
    throw createError({
      statusCode: 503,
      statusMessage: "config_error",
      message: "DREAM_MACHINE_RUNTIME_TOKEN required for POST /oauth-crossing",
    });
  }

  const bearer = parseRuntimeBearer(getHeader(event, "authorization"));
  if (bearer !== expected) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
}