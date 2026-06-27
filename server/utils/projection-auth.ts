import type { H3Event } from "h3";

export function verifyProjectionRuntimeAuth(event: H3Event): void {
  const expected = process.env.DREAM_MACHINE_RUNTIME_TOKEN?.trim();
  if (!expected) return;

  const header = getHeader(event, "authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
  if (bearer !== expected) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
}