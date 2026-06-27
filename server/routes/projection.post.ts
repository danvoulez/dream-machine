import { handleProjectionPost } from "../../agent/lib/projection-bridge";
import { verifyProjectionRuntimeAuth } from "~~/server/utils/projection-auth";

export default defineEventHandler(async (event) => {
  // C0.1 runtime.seam — production /projection is never open when token is unset.
  verifyProjectionRuntimeAuth(event);

  const body = await readBody(event);
  if (!body || typeof body !== "object") {
    throw createError({ statusCode: 400, statusMessage: "JSON body required" });
  }

  try {
    return await handleProjectionPost(body as never);
  } catch (err) {
    throw createError({
      statusCode: 503,
      statusMessage: err instanceof Error ? err.message : "projection runtime failed",
    });
  }
});