import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import type { SlackLinkRecord, SlackLinkSummary } from "#shared/types/slack-link";

const dbPath = join(process.cwd(), ".data", "slack-links.sqlite");

mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

export function getSlackLinksDatabase() {
  return db;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS slack_links (
    app_user_id TEXT NOT NULL,
    slack_team_id TEXT NOT NULL,
    slack_user_id TEXT NOT NULL,
    slack_user_name TEXT,
    slack_display_name TEXT,
    slack_email TEXT,
    linked_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (slack_team_id, slack_user_id)
  );

  CREATE UNIQUE INDEX IF NOT EXISTS slack_links_app_user_idx
    ON slack_links (app_user_id);

  CREATE TABLE IF NOT EXISTS slack_link_codes (
    code TEXT PRIMARY KEY,
    app_user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS slack_link_codes_app_user_idx
    ON slack_link_codes (app_user_id);
`);

export interface UpsertSlackLinkInput {
  appUserId: string;
  slackTeamId: string;
  slackUserId: string;
  slackUserName?: string;
  slackDisplayName?: string;
  slackEmail?: string;
}

function rowToRecord(row: {
  app_user_id: string;
  slack_team_id: string;
  slack_user_id: string;
  slack_user_name: string | null;
  slack_display_name: string | null;
  slack_email: string | null;
  linked_at: string;
}): SlackLinkRecord {
  return {
    appUserId: row.app_user_id,
    slackTeamId: row.slack_team_id,
    slackUserId: row.slack_user_id,
    slackUserName: row.slack_user_name ?? undefined,
    slackDisplayName: row.slack_display_name ?? undefined,
    slackEmail: row.slack_email ?? undefined,
    linkedAt: row.linked_at,
  };
}

export function getSlackLinkForMember(teamId: string, userId: string) {
  const row = db.prepare(`
    SELECT *
    FROM slack_links
    WHERE slack_team_id = ? AND slack_user_id = ?
  `).get(teamId, userId) as {
    app_user_id: string;
    slack_team_id: string;
    slack_user_id: string;
    slack_user_name: string | null;
    slack_display_name: string | null;
    slack_email: string | null;
    linked_at: string;
  } | undefined;

  return row ? rowToRecord(row) : undefined;
}

export function getSlackLinkForAppUser(appUserId: string) {
  const row = db.prepare(`
    SELECT *
    FROM slack_links
    WHERE app_user_id = ?
  `).get(appUserId) as {
    app_user_id: string;
    slack_team_id: string;
    slack_user_id: string;
    slack_user_name: string | null;
    slack_display_name: string | null;
    slack_email: string | null;
    linked_at: string;
  } | undefined;

  return row ? rowToRecord(row) : undefined;
}

export function upsertSlackLink(input: UpsertSlackLinkInput) {
  db.prepare(`
    DELETE FROM slack_links WHERE app_user_id = ?
  `).run(input.appUserId);

  db.prepare(`
    INSERT INTO slack_links (
      app_user_id,
      slack_team_id,
      slack_user_id,
      slack_user_name,
      slack_display_name,
      slack_email
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    input.appUserId,
    input.slackTeamId,
    input.slackUserId,
    input.slackUserName ?? null,
    input.slackDisplayName ?? null,
    input.slackEmail ?? null,
  );

  return getSlackLinkForAppUser(input.appUserId)!;
}

export function deleteSlackLinkForAppUser(appUserId: string) {
  const result = db.prepare(`
    DELETE FROM slack_links WHERE app_user_id = ?
  `).run(appUserId);

  return result.changes > 0;
}

export function toSlackLinkSummary(record?: SlackLinkRecord): SlackLinkSummary {
  if (!record) {
    return { linked: false };
  }

  return {
    linked: true,
    teamId: record.slackTeamId,
    userId: record.slackUserId,
    userName: record.slackUserName,
    displayName: record.slackDisplayName,
    email: record.slackEmail,
    linkedAt: record.linkedAt,
  };
}
