import { handleOAuthCrossingPost } from "../../agent/lib/oauth-crossing";
import { verifyProjectionRuntimeAuth } from "~~/server/utils/projection-auth";

export default defineEventHandler(async (event) => {
  verifyProjectionRuntimeAuth(event);

  const body = await readBody(event);
  if (!body || typeof body !== "object") {
    throw createError({ statusCode: 400, statusMessage: "JSON body required" });
  }

  const result = await handleOAuthCrossingPost(body as never);
  if (!result.ok) {
    const status = result.reason === "act_not_found" ? 404 : result.reason === "invalid_act" ? 400 : 503;
    throw createError({ statusCode: status, statusMessage: result.message, data: result });
  }
  return result;
});