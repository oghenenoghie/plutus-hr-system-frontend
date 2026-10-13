import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { api, savedToken, storageStateFor } from "./support";

// Accessibility (WCAG 2.1 A and AA, via axe) and phone-width layout of every
// inventory screen, list and detail. Runs after the lifecycle spec, so the
// screens show real documents rather than empty states.
test.use({ storageState: storageStateFor("admin") });

const LISTS = [
  "/inventory",
  "/inventory/items",
  "/inventory/stock",
  "/inventory/movements",
  "/inventory/warehouses",
  "/inventory/purchase-orders",
  "/inventory/purchase-orders/new",
  "/inventory/goods-receipts",
  "/inventory/issues",
  "/inventory/issues/new",
  "/inventory/transfers",
  "/inventory/transfers/new",
  "/inventory/adjustments",
  "/inventory/adjustments/new",
  "/inventory/stocktakes",
  "/inventory/stocktakes/new",
  "/inventory/reorder",
  "/inventory/reports",
  "/inventory/settings",
];


const DOCUMENTS = [
  "/inventory/purchase-orders",
  "/inventory/goods-receipts",
  "/inventory/issues",
  "/inventory/transfers",
  "/inventory/adjustments",
  "/inventory/stocktakes",
];

let screens: string[] = [];

test.beforeAll(async ({ request }) => {
  const call = api(request, savedToken("admin"));
  await call("PUT", "/inventory/settings", { enabled: true });
  // The first document of each kind, for its detail screen.
  const details: string[] = [];
  for (const route of DOCUMENTS) {
    const rows = await call<{ id: string }[]>("GET", route);
    if (rows.length) details.push(`${route}/${rows[0].id}`);
  }
  screens = [...LISTS, ...details];
});

test("inventory screens meet WCAG 2.1 AA (axe)", async ({ page }) => {
  const report: string[] = [];
  for (const path of screens) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    for (const violation of results.violations) {
      const example = violation.nodes[0]?.target.join(" ") ?? "";
      report.push(`${path} [${violation.impact}] ${violation.id}: ${violation.help} (e.g. ${example})`);
    }
  }
  expect(report).toEqual([]);
});

test("inventory screens fit a phone without sideways page scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const overflowing: string[] = [];
  for (const path of screens) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    // Wide tables scroll inside their own container; the page itself must not.
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    if (width > 391) overflowing.push(`${path}: ${width}px`);
  }
  expect(overflowing).toEqual([]);
});

test("forms in a drawer work from the keyboard", async ({ page }) => {
  await page.goto("/inventory/items");
  const opener = page.getByRole("button", { name: "New Item" });
  await opener.focus();
  await page.keyboard.press("Enter");
  // Focus moves into the drawer, which screen readers announce by its title.
  await expect(page.getByRole("dialog", { name: "New Item" })).toBeVisible();
  await expect(page.locator("#item-sku")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(opener).toBeFocused();
});
