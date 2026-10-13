import fs from "node:fs";

import { expect, test, type Page } from "@playwright/test";

import { accessToken, api, dialogButton, lagosDate, statusBadge, storageStateFor, toast } from "./support";

// Workflows 1–9 of the inventory skill, in order, in one organisation:
// each builds on the stock the previous one left. Workflow 10 (restricted
// users) is in inventory-permissions.spec.ts.
test.describe.configure({ mode: "serial" });
test.use({ storageState: storageStateFor("admin") });

let page: Page;
let call: ReturnType<typeof api>;
const today = lagosDate();
const ids: Record<string, string> = {};

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage({ storageState: storageStateFor("admin") });
  await page.goto("/dashboard");
  call = api(page.request, await accessToken(page));
  await call("POST", "/vendors", { name: "Lagos Stationers Ltd" });
});

test.afterAll(async () => {
  await page.close();
});

test("1. create an item and a warehouse", async () => {
  await page.goto("/inventory/settings");
  await page.getByRole("button", { name: "Switch on" }).click();
  await toast(page, "Inventory switched on");

  for (const [code, name] of [
    ["lag-01", "Ikeja main store"],
    ["abj-01", "Abuja branch store"],
  ]) {
    await page.goto("/inventory/warehouses");
    await page.getByRole("button", { name: "New Warehouse" }).click();
    await page.fill("#warehouse-code", code);
    await page.fill("#warehouse-name", name);
    await page.getByRole("button", { name: "Create Warehouse" }).click();
    await toast(page, "Warehouse created");
    await expect(page.getByRole("cell", { name: code.toUpperCase(), exact: true })).toBeVisible();
  }

  await page.goto("/inventory/items");
  await page.getByRole("button", { name: "New Item" }).click();
  await page.fill("#item-sku", "PAPER-A4");
  await page.fill("#item-name", "A4 paper, 80gsm (ream)");
  await page.fill("#item-reorder", "20");
  await page.fill("#item-cost", "5000");
  await page.getByRole("button", { name: "Create Item" }).click();
  await toast(page, "Item created");
  await expect(page.getByRole("cell", { name: "PAPER-A4", exact: true })).toBeVisible();

  const warehouses = await call<{ id: string; code: string }[]>("GET", "/inventory/warehouses");
  ids.lag = warehouses.find((w) => w.code === "LAG-01")!.id;
  ids.abj = warehouses.find((w) => w.code === "ABJ-01")!.id;
  ids.item = (await call<{ id: string }[]>("GET", "/inventory/items?q=PAPER-A4"))[0].id;
});

test("2. create and approve a purchase order", async () => {
  await page.goto("/inventory/purchase-orders/new");
  await page.locator("#po-item-0").waitFor();
  await page.selectOption("#po-warehouse", ids.lag);
  await page.selectOption("#po-item-0", ids.item);
  await page.fill("#po-qty-0", "40");
  await page.fill("#po-price-0", "5000");
  await expect(page.getByText("Total ₦200,000")).toBeVisible();
  await page.getByRole("button", { name: "Save draft" }).click();
  await toast(page, "PO-000001 saved as a draft");
  await page.waitForURL(/\/inventory\/purchase-orders\/[0-9a-f-]{36}$/);
  ids.poUrl = page.url();

  await page.getByRole("button", { name: "Submit for approval" }).click();
  await toast(page, "PO-000001 submitted for approval");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await toast(page, "Approval recorded");
  await page.getByRole("button", { name: "Issue to vendor" }).click();
  await toast(page, "PO-000001 issued to the vendor");
  await expect(statusBadge(page, "issued")).toBeVisible();
});

test("3. receive the stock", async () => {
  await page.goto(ids.poUrl);
  await page.getByRole("link", { name: "Receive goods" }).click();
  const accepted = page.getByLabel("Accepted PAPER-A4");
  await expect(accepted).toHaveValue("40");
  await page.getByRole("button", { name: "Save draft" }).click();
  await toast(page, "GRN-000001 saved as a draft");
  await page.waitForURL(/\/inventory\/goods-receipts\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Post receipt" }).click();
  await toast(page, "GRN-000001 posted — stock updated");
  await expect(page.getByText("₦200,000").first()).toBeVisible();

  await page.goto(ids.poUrl);
  await expect(statusBadge(page, "received")).toBeVisible();
});

test("4. the stock balance and movement history show the receipt", async () => {
  await page.goto("/inventory/stock");
  const row = page.locator("tr", { hasText: "LAG-01" });
  await expect(row).toContainText("40");
  await expect(row).toContainText("₦200,000");

  await page.goto("/inventory/movements");
  await expect(page.locator("tbody").getByRole("link", { name: "GRN-000001" })).toBeVisible();
  await expect(page.locator("tbody")).toContainText("+40");
});

test("5. issue stock for consumption", async () => {
  await page.goto("/inventory/issues/new");
  await page.locator("#issue-item-0").waitFor();
  await page.selectOption("#issue-warehouse", ids.lag);
  await page.fill("#issue-purpose", "Printer paper for the finance team");
  await page.selectOption("#issue-item-0", ids.item);
  await page.fill("#issue-qty-0", "10");
  await page.getByRole("button", { name: "Save draft" }).click();
  await toast(page, "ISS-000001 saved as a draft");
  await page.waitForURL(/\/inventory\/issues\/[0-9a-f-]{36}$/);
  ids.issueUrl = page.url();
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await toast(page, "ISS-000001 submitted for approval");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await toast(page, "Approval recorded");
  await page.getByRole("button", { name: "Post issue" }).click();
  await toast(page, "ISS-000001 posted — stock issued");
  await expect(statusBadge(page, "posted")).toBeVisible();
});

test("6. valuation and accounting entries agree", async () => {
  // The issue's journal: 10 PCS at the N5,000 average to consumption.
  await page.goto(ids.issueUrl);
  await expect(page.getByRole("heading", { name: "Accounting" })).toBeVisible();
  await expect(page.getByText("Inventory Consumption").first()).toBeVisible();
  await expect(page.getByText("₦50,000").first()).toBeVisible();

  // 30 PCS left at N5,000, and the GL inventory account says the same.
  await page.goto("/inventory/reports");
  await expect(page.getByRole("heading", { name: "Stock valuation" })).toBeVisible();
  await expect(page.getByText("₦150,000").first()).toBeVisible();
  await expect(page.getByText("Reconciled", { exact: true })).toBeVisible();
});

test("7. transfer stock between warehouses", async () => {
  await page.goto("/inventory/transfers/new");
  await page.locator("#transfer-item-0").waitFor();
  await page.selectOption("#transfer-from", ids.lag);
  await page.selectOption("#transfer-to", ids.abj);
  await page.selectOption("#transfer-item-0", ids.item);
  await page.fill("#transfer-qty-0", "5");
  await page.getByRole("button", { name: "Save draft" }).click();
  await toast(page, "TRF-000001 saved as a draft");
  await page.waitForURL(/\/inventory\/transfers\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Dispatch", exact: true }).click();
  await dialogButton(page, "Dispatch").click();
  await toast(page, "TRF-000001 dispatched");
  await expect(statusBadge(page, "in transit")).toBeVisible();
  await page.getByRole("button", { name: "Receive at ABJ-01" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Receive", exact: true }).click();
  await toast(page, "TRF-000001 received");
  await expect(statusBadge(page, "received")).toBeVisible();

  await page.goto("/inventory/stock");
  await expect(page.locator("tr", { hasText: "LAG-01" })).toContainText("25");
  await expect(page.locator("tr", { hasText: "ABJ-01" })).toContainText("5");
});

test("8. complete a stocktake and approve an adjustment", async () => {
  // Count LAG-01: 24 on the shelf against 25 in the books.
  await page.goto("/inventory/stocktakes/new");
  await page.selectOption("#stocktake-warehouse", ids.lag);
  await page.getByRole("button", { name: "Create stocktake" }).click();
  await page.waitForURL(/\/inventory\/stocktakes\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Start count" }).click();
  await dialogButton(page, "Start count").click();
  await toast(page, "STK-000001 started");
  await page.getByLabel("Counted PAPER-A4").fill("24");
  await page.getByRole("button", { name: "Save 1 count" }).click();
  await toast(page, "1 count saved");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await dialogButton(page, "Submit").click();
  await toast(page, "STK-000001 submitted");
  await expect(statusBadge(page, "pending approval")).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await toast(page, "STK-000001 approved");
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await dialogButton(page, "Post").click();
  await toast(page, "STK-000001 posted");
  await expect(page.getByRole("heading", { name: "Accounting" })).toBeVisible();

  // A damage write-off needs approval (D8) before it posts.
  await page.goto("/inventory/adjustments/new");
  await page.locator("#line-item-0").waitFor();
  await page.selectOption("#adj-warehouse", ids.lag);
  await page.selectOption("#adj-reason", "damage");
  await page.selectOption("#line-item-0", ids.item);
  await page.fill("#line-qty-0", "2");
  await page.getByRole("button", { name: "Save and post" }).click();
  await toast(page, "ADJ-000001 submitted for approval");
  await expect(statusBadge(page, "pending approval")).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await toast(page, "Approval recorded");
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await dialogButton(page, "Post").click();
  await toast(page, "ADJ-000001 posted");

  // 25 − 1 missing − 2 damaged.
  await page.goto("/inventory/stock");
  await expect(page.locator("tr", { hasText: "LAG-01" })).toContainText("22");
});

test("9. export an inventory report", async () => {
  await page.goto("/inventory/reports");
  await expect(page.getByText("Reconciled", { exact: true })).toBeVisible();

  const [csv] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download CSV" }).first().click(),
  ]);
  expect(csv.suggestedFilename()).toBe(`stock-valuation-${today}.csv`);
  const text = fs.readFileSync(await csv.path(), "utf8");
  expect(text).toContain("PAPER-A4");
  expect(text).toContain("Inventory account (GL)");

  await page.getByRole("tab", { name: "Adjustments & variances" }).click();
  const [pdf] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download PDF" }).first().click(),
  ]);
  expect(fs.readFileSync(await pdf.path()).subarray(0, 4).toString()).toBe("%PDF");
});
