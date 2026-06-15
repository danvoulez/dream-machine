import { getPendingSlackLinkCode } from "~~/lib/slack-link-codes";
import { getSlackLinkForAppUser, toSlackLinkSummary } from "~~/lib/slack-links";
import { requireSessionUserId } from "~~/server/utils/session";

export default defineEventHandler(async (event) => {
  const appUserId = await requireSessionUserId(event);
  const link = getSlackLinkForAppUser(appUserId);
  const pending = getPendingSlackLinkCode(appUserId);

  return {
    ...toSlackLinkSummary(link),
    pendingCode: pending?.code,
    pendingExpiresAt: pending?.expiresAt,
  };
});
