import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { api, dialogButton, savedToken, storageStateFor } from "./support";

// Accumulated depreciation, through the real screens and the real ledger: an
// asset the organisation already owned comes onto the books with the
// depreciation it had built up, keeps depreciating from there, lists its
// history, and the balance sheet shows fixed assets at cost less accumulated
// depreciation, with the book value brought on as Opening Balance Equity.

const TAG = `FA-${Date.now().toString(36).toUpperCase()}`;

async function accessibilityViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations.map(
    (v) => `[${v.impact}] ${v.id}: ${v.help} (e.g. ${v.nodes[0]?.target.join(" ") ?? ""})`,
  );
}

test.describe.configure({ mode: "serial" });
test.use({ storageState: storageStateFor("admin") });

test.beforeAll(async ({ request }) => {
  // The accounts a fixed asset posts to (a no-op if another spec seeded them).
  await api(request, savedToken("admin"))("POST", "/chart-of-accounts/seed-defaults");
});

test("an asset already owned comes on with its depreciation and keeps depreciating", async ({ page }) => {
  await page.goto("/fixed-assets");
  await page.getByRole("button", { name: "New Fixed Asset" }).click();
  const drawer = page.getByRole("dialog", { name: "New Fixed Asset" });
  await page.fill("#name", "Delivery Van");
  await page.fill("#assetTag", TAG);
  await page.fill("#acquisitionDate", "2024-01-01");
  await page.selectOption("#acquisitionSource", "opening");
  await page.fill("#cost", "1200000");
  await page.fill("#usefulLifeMonths", "12");
  await page.fill("#openingDepreciation", "300000");
  await expect(page.locator("#openingDepreciationHint")).toContainText("Book value brought on: ₦900,000");
  expect(await accessibilityViolations(page)).toEqual([]);
  await drawer.getByRole("button", { name: "Create Asset" }).click();
  await expect(drawer).toBeHidden();

  const row = page.getByRole("row", { name: new RegExp(TAG) });
  await expect(row).toContainText("₦300,000");
  await expect(row).toContainText("₦900,000");

  // A month at cost / useful life: ₦100,000.
  await row.getByRole("button", { name: "Depreciate" }).click();
  await dialogButton(page, "Record").click();
  await expect(row).toContainText("₦400,000");
  await expect(row).toContainText("₦800,000");

  const tiles = page.getByRole("region", { name: "Fixed asset totals" }).locator(":scope > *");
  await expect(tiles).toContainText([
    "Total cost₦1,200,000",
    "Accumulated depreciation₦400,000",
    "Net book value₦800,000",
  ]);

  await row.getByRole("button", { name: `History of ${TAG}` }).click();
  const history = page.getByRole("dialog", { name: `Depreciation History — ${TAG}` });
  const events = history.locator("tbody tr");
  await expect(events).toHaveCount(2);
  await expect(events.nth(0)).toContainText(/Opening balance.*\+₦300,000\s*₦300,000$/);
  await expect(events.nth(1)).toContainText(/Depreciation\s*\+₦100,000\s*₦400,000$/);
  // Every naira of it is explained by a posting.
  await expect(history.getByRole("note")).toHaveCount(0);
  expect(await accessibilityViolations(page)).toEqual([]);
});

test("the balance sheet shows fixed assets at cost less accumulated depreciation", async ({ page }) => {
  await page.goto("/balance-sheet");
  const assets = page.getByRole("table").first();
  await expect(assets.getByRole("row", { name: /Fixed Assets at cost/ })).toContainText("₦1,200,000");
  await expect(assets.getByRole("row", { name: /Less: Accumulated Depreciation/ })).toContainText("(₦400,000)");
  await expect(assets.getByRole("row", { name: /Net book value of fixed assets/ })).toContainText("₦800,000");
  // The contra account appears once, inside the group.
  await expect(assets.getByRole("row", { name: /^Accumulated Depreciation/ })).toHaveCount(0);
  // Paid for before Plutus: the book value it came on at is equity, not cash.
  await expect(page.getByRole("table").nth(1).getByRole("row", { name: /Opening Balance Equity/ })).toContainText(
    "₦900,000",
  );
  expect(await accessibilityViolations(page)).toEqual([]);
});
