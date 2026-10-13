import { expect, test } from "@playwright/test";

import { accessToken, api, API_URL, savedToken, storageStateFor } from "./support";

// Workflow 10: restricted users can't do what their role doesn't allow,
// whether through the screens or by calling the API directly.

test.beforeAll(async ({ request }) => {
  // Inventory is on for the organisation (the admin switches it on; this
  // is a no-op when the lifecycle spec already has).
  await api(request, savedToken("admin"))("PUT", "/inventory/settings", { enabled: true });
});

test.describe("an auditor", () => {
  test.use({ storageState: storageStateFor("auditor") });

  test("reads inventory but can't change it", async ({ page }) => {
    await page.goto("/inventory/items");
    await expect(page.getByRole("heading", { name: "Items" })).toBeVisible();
    await expect(page.getByRole("button", { name: "New Item" })).toHaveCount(0);

    await page.goto("/inventory/stocktakes");
    await expect(page.getByRole("heading", { name: "Stocktakes" })).toBeVisible();
    await expect(page.getByRole("link", { name: "New Stocktake" })).toHaveCount(0);

    const token = await accessToken(page);
    const units = await api(page.request, token)<{ id: string; code: string }[]>("GET", "/inventory/units");
    const headers = { Authorization: `Bearer ${token}` };
    const created = await page.request.post(`${API_URL}/inventory/items`, {
      headers,
      data: { sku: "SNEAKY", name: "Sneaky", base_unit_id: units[0].id },
    });
    expect(created.status()).toBe(403);
    const stocktake = await page.request.post(`${API_URL}/inventory/stocktakes`, {
      headers,
      data: { warehouse_id: crypto.randomUUID(), count_date: "2026-01-01" },
    });
    expect(stocktake.status()).toBe(403);
  });
});

test.describe("an HR manager", () => {
  test.use({ storageState: storageStateFor("hr") });

  test("has no inventory access at all", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "Inventory Overview" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Inventory", exact: true })).toHaveCount(0);

    const headers = { Authorization: `Bearer ${await accessToken(page)}` };
    for (const route of ["/inventory/items", "/inventory/stock", "/inventory/reports/valuation"]) {
      const response = await page.request.get(`${API_URL}${route}`, { headers });
      expect(response.status(), route).toBe(403);
    }
  });
});
