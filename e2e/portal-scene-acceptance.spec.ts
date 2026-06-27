import { existsSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";

const root = join(import.meta.dirname, "..");
const loglineDb = join(root, "../Dream-Machine-LogLine-Acts/.lab/lab.sqlite");

test.describe("T-P2 portal scene acceptance", () => {
  test.skip(!existsSync(loglineDb), "seeded LogLine ledger missing");

  test("portal renders Scene andamento from real ledgers through the scene plugin", async ({ page }) => {
    await page.goto("/acceptance/scene");
    await expect(page.getByTestId("scene-acceptance-ready")).toBeVisible({ timeout: 30_000 });

    const summary = page.getByTestId("scene-acceptance-summary");
    await expect(summary).toContainText(/process candidate/);

    const card = page.getByTestId("scene-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("Scene")).toBeVisible();
    await expect(card.getByText("observation-only")).toBeVisible();

    const items = page.getByTestId("scene-process-item");
    await expect(items.first()).toBeVisible();
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const cannotDo = page.getByTestId("scene-cannot-do");
    await expect(cannotDo).toBeVisible();
    await expect(cannotDo).toContainText("register_receipt");

    const projectionBlocks = page.getByTestId("scene-projection-blocks");
    await expect(projectionBlocks).toBeVisible();
    await expect(page.getByTestId("projection-block-summary").first()).toBeVisible();
    await expect(page.getByTestId("projection-affordance-buttons")).toBeVisible();

    const summaryText = await summary.textContent();
    const match = summaryText?.match(/(\d+) process candidate/);
    expect(match).not.toBeNull();
    const processCount = Number(match![1]);
    expect(processCount).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(processCount);
  });
});