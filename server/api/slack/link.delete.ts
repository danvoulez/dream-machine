import { deleteSlackLinkForAppUser } from "~~/lib/slack-links";
import { requireSessionUserId } from "~~/server/utils/session";

export default defineEventHandler(async (event) => {
  const appUserId = await requireSessionUserId(event);
  const removed = deleteSlackLinkForAppUser(appUserId);
  return { removed };
});
