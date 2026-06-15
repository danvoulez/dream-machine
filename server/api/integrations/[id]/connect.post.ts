import { getConnector } from "~~/server/connectors";
import { isValidEveResumeUrl, startConnectFlow } from "~~/server/utils/connect";
import { throwConnectError } from "~~/server/utils/errors";
import { getRequestOrigin } from "~~/server/utils/h3-node";
import { requireSessionUserId } from "~~/server/utils/session";

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing connector id",
    });
  }

  const connector = getConnector(id);
  const userId = await requireSessionUserId(event);
  const origin = getRequestOrigin(event);
  const resumeUrl = getQuery(event).resumeUrl;

  const callbackUrl = typeof resumeUrl === "string"
    && isValidEveResumeUrl(resumeUrl, origin)
    ? resumeUrl
    : `${origin}/settings/integrations?connected=${connector.id}`;

  try {
    const { url } = await startConnectFlow(connector, userId, callbackUrl);
    return { url };
  }
  catch (error) {
    throwConnectError(error);
  }
});
