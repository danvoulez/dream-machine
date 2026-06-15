import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

// Use cwd so Nitro bundling does not relocate the DB under .nuxt/dev/.
const dbPath = join(process.cwd(), ".data", "auth.sqlite");

mkdirSync(dirname(dbPath), { recursive: true });

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: process.env.BETTER_AUTH_URL
    ? [process.env.BETTER_AUTH_URL]
    : undefined,
  database: new Database(dbPath),
  emailAndPassword: {
    enabled: true,
  },
});
