import { existsSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";

const root = join(import.meta.dirname, "..");
const loglineDb = join(root, "../Dream-Machine-LogLine-Acts/.lab/lab.sqlite");

function hasModelCreds(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim()
    || process.env.VERCEL_OIDC_TOKEN?.trim(),
  );
}

test.describe("T-P2 portal chat scene acceptance", () => {
  test.skip(!existsSync(loglineDb), "seeded LogLine ledger missing");
  test.skip(!hasModelCreds(), "AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN required");

  test("portal chat thread renders Scene card after asking about andamento", async ({ page }) => {
    test.setTimeout(180_000);

    await page.goto("/acceptance/chat");
    await expect(page.getByTestId("chat-acceptance-panel")).toBeVisible();
    await expect(page.getByTestId("chat-acceptance-messages")).toBeVisible();

    const card = page.getByTestId("scene-card");
    await expect(card).toBeVisible({ timeout: 120_000 });
    await expect(card.getByText("Scene")).toBeVisible();
    await expect(card.getByText("observation-only")).toBeVisible();

    const items = page.getByTestId("scene-process-item");
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBeGreaterThanOrEqual(1);
  });
});