import { randomBytes } from "node:crypto";
import { getSlackLinksDatabase } from "./slack-links";
import { upsertSlackLink } from "./slack-links";

const CODE_TTL_MS = 15 * 60 * 1000;

export function createSlackLinkCode(appUserId: string) {
  const db = getSlackLinksDatabase();

  db.prepare(`DELETE FROM slack_link_codes WHERE app_user_id = ?`).run(appUserId);

  const code = randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  db.prepare(`
    INSERT INTO slack_link_codes (code, app_user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(code, appUserId, expiresAt);

  return { code, expiresAt };
}

export function getPendingSlackLinkCode(appUserId: string) {
  const db = getSlackLinksDatabase();
  const row = db.prepare(`
    SELECT code, expires_at
    FROM slack_link_codes
    WHERE app_user_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(appUserId) as { code: string; expires_at: string } | undefined;

  if (!row) {
    return undefined;
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare(`DELETE FROM slack_link_codes WHERE code = ?`).run(row.code);
    return undefined;
  }

  return { code: row.code, expiresAt: row.expires_at };
}

export function consumeSlackLinkCode(input: {
  code: string;
  slackTeamId: string;
  slackUserId: string;
  slackUserName?: string;
  slackDisplayName?: string;
  slackEmail?: string;
}) {
  const normalized = input.code.trim().toUpperCase();
  const db = getSlackLinksDatabase();

  const row = db.prepare(`
    SELECT code, app_user_id, expires_at
    FROM slack_link_codes
    WHERE code = ?
  `).get(normalized) as { code: string; app_user_id: string; expires_at: string } | undefined;

  if (!row) {
    return { ok: false as const, reason: "invalid" as const };
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    db.prepare(`DELETE FROM slack_link_codes WHERE code = ?`).run(normalized);
    return { ok: false as const, reason: "expired" as const };
  }

  upsertSlackLink({
    appUserId: row.app_user_id,
    slackTeamId: input.slackTeamId,
    slackUserId: input.slackUserId,
    slackUserName: input.slackUserName,
    slackDisplayName: input.slackDisplayName,
    slackEmail: input.slackEmail,
  });

  db.prepare(`DELETE FROM slack_link_codes WHERE app_user_id = ?`).run(row.app_user_id);

  return { ok: true as const, appUserId: row.app_user_id };
}

export function parseSlackLinkCommand(text: string) {
  const match = text.match(/\blink\s+([A-Z0-9]{6})\b/i);
  return match?.[1]?.toUpperCase();
}
