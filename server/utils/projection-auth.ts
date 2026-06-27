import type { H3Event } from "h3";

export function parseRuntimeBearer(authorizationHeader: string | undefined): string | undefined {
  if (!authorizationHeader?.startsWith("Bearer ")) return undefined;
  const token = authorizationHeader.slice(7).trim();
  return token || undefined;
}

/** Read-only projection runtime — token optional for local shell-bridge dev. */
export function verifyProjectionRuntimeAuth(event: H3Event): void {
  const expected = process.env.DREAM_MACHINE_RUNTIME_TOKEN?.trim();
  if (!expected) return;

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
      statusMessage: "DREAM_MACHINE_RUNTIME_TOKEN required for POST /oauth-crossing",
    });
  }

  const bearer = parseRuntimeBearer(getHeader(event, "authorization"));
  if (bearer !== expected) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
}