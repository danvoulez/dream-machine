import { CONNECT_USER_ISSUER } from "../shared/connect";
import { getSlackLinkForMember } from "./slack-links";

interface SlackMemberIdentity {
  teamId?: string | null;
  userId: string;
  userName?: string;
  displayName?: string;
  email?: string;
}

export function buildAppSessionAuth(
  appUserId: string,
  attributes: Record<string, string | undefined>,
) {
  const cleaned = Object.fromEntries(
    Object.entries(attributes).filter((entry): entry is [string, string] => !!entry[1]),
  );

  return {
    attributes: cleaned,
    authenticator: CONNECT_USER_ISSUER,
    issuer: CONNECT_USER_ISSUER,
    principalId: appUserId,
    principalType: "user",
  };
}

export function resolveSlackInboundAuth(
  slackAuth: ReturnType<typeof buildAppSessionAuth> | {
    attributes: Readonly<Record<string, string | readonly string[]>>;
    authenticator: string;
    issuer?: string;
    principalId: string;
    principalType: string;
  },
  member: SlackMemberIdentity,
) {
  if (!member.teamId) {
    return slackAuth;
  }

  const link = getSlackLinkForMember(member.teamId, member.userId);
  if (!link) {
    return slackAuth;
  }

  return buildAppSessionAuth(link.appUserId, {
    email: member.email ?? link.slackEmail,
    name: member.displayName ?? link.slackDisplayName,
    slack_team_id: member.teamId,
    slack_user_id: member.userId,
    slack_user_name: member.userName ?? link.slackUserName,
    linked: "true",
  });
}
