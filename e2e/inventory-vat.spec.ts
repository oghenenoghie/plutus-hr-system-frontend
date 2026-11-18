import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";

import { API_URL, api, lagosDate, statusBadge, toast } from "./support";

// The client's inventory and VAT walkthrough, in an organisation of its own:
// 1. Goods Receipt's "Select purchase order" lists an order that is approved
//    but not yet issued, and receiving it adds to the stock already on hand
//    (3 reams + 7 = 10);
// 2. a stock issue goes to a department created from the form and to a
//    branch, on a date, and takes the stock out (10 - 3 = 7);
// 3. a vendor bill takes VAT from the same dropdown as an invoice;
// 4. the month's VAT report nets output VAT against input VAT, and prints.

const RUN = Date.now().toString(36).toUpperCase();
const today = lagosDate();
const month = today.slice(0, 7);
let page: Page;
let call: ReturnType<typeof api>;
const ids: Record<string, string> = {};

async function onHand(itemId = ids.item): Promise<number> {
  return Number((await call<{ quantity_on_hand: string }>("GET", `/inventory/items/${itemId}`)).quantity_on_hand);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser, request }: { browser: Browser; request: APIRequestContext }) => {
  const email = `inventory-vat-${RUN.toLowerCase()}@example.com`;
  const password = "inventory-vat-pass-2026";
  const signup = await request.post(`${API_URL}/organisation/signup`, {
    data: { org_name: `Office Supplies ${RUN}`, org_address: "4 Broad Street, Lagos", admin_email: email, admin_password: password },
  });
  expect(signup.ok(), await signup.text()).toBeTruthy();
  const login = await request.post(`${API_URL}/auth/login`, { data: { identifier: email, password } });
  const tokens = (await login.json()) as { access_token: string; refresh_token: string };
  call = api(request, tokens.access_token);
  await call("POST", "/chart-of-accounts/seed-defaults");
  await call("PUT", "/organisation", { company_tin: "21345678-0001" });
  await call("PUT", "/inventory/settings", { enabled: true });

  const units = await call<{ id: string; code: string }[]>("GET", "/inventory/units");
  const unit = units.find((u) => u.code === "PCS") ?? units[0];
  ids.item = (await call<{ id: string }>("POST", "/inventory/items", { sku: `PAPER-${RUN}`, name: "A4 paper (ream)", base_unit_id: unit.id })).id;
  ids.stapler = (await call<{ id: string }>("POST", "/inventory/items", { sku: `STAPLER-${RUN}`, name: "Office stapler", base_unit_id: unit.id })).id;
  ids.warehouse = (await call<{ id: string }>("POST", "/inventory/warehouses", { code: "MAIN", name: "Main store" })).id;
  ids.vendor = (await call<{ id: string }>("POST", "/vendors", { name: "Lekki Stationers Ltd" })).id;
  ids.customer = (await call<{ id: string }>("POST", "/customers", { name: "Zenith Retail Ltd" })).id;
  await call("POST", "/branches", { name: "Head Office", state: "Lagos" });
  await call("POST", "/branches", { name: "Abuja Branch", state: "FCT" });

  const order = (itemId: string, quantity: string) =>
    call<{ id: string; po_number: string }>("POST", "/inventory/purchase-orders", {
      vendor_id: ids.vendor,
      warehouse_id: ids.warehouse,
      order_date: today,
      lines: [{ item_id: itemId, quantity, unit_price_minor: 5_000_00 }],
    });
  // Three reams already in stock.
  const first = await order(ids.item, "3");
  await call("POST", `/inventory/purchase-orders/${first.id}/submit`);
  await call("POST", `/inventory/purchase-orders/${first.id}/approve`, {});
  const lines = (await call<{ lines: { id: string }[] }>("GET", `/inventory/purchase-orders/${first.id}`)).lines;
  const receipt = await call<{ id: string }>("POST", "/inventory/goods-receipts", {
    purchase_order_id: first.id,
    warehouse_id: ids.warehouse,
    receipt_date: today,
    lines: [{ po_line_id: lines[0].id, accepted_quantity: "3" }],
  });
  await call("POST", `/inventory/goods-receipts/${receipt.id}/post`);

  // One stapler is already in stock before the next delivery.
  const firstStapler = await order(ids.stapler, "1");
  await call("POST", `/inventory/purchase-orders/${firstStapler.id}/submit`);
  await call("POST", `/inventory/purchase-orders/${firstStapler.id}/approve`, {});
  const staplerOpeningLines = (await call<{ lines: { id: string }[] }>("GET", `/inventory/purchase-orders/${firstStapler.id}`)).lines;
  const staplerOpeningReceipt = await call<{ id: string }>("POST", "/inventory/goods-receipts", {
    purchase_order_id: firstStapler.id,
    warehouse_id: ids.warehouse,
    receipt_date: today,
    lines: [{ po_line_id: staplerOpeningLines[0].id, accepted_quantity: "1" }],
  });
  await call("POST", `/inventory/goods-receipts/${staplerOpeningReceipt.id}/post`);

  // Seven reams and five staplers are ordered and approved, but not received.
  const second = await order(ids.item, "7");
  await call("POST", `/inventory/purchase-orders/${second.id}/submit`);
  await call("POST", `/inventory/purchase-orders/${second.id}/approve`, {});
  ids.po = second.id;
  ids.poNumber = second.po_number;
  const staplerOrder = await order(ids.stapler, "5");
  await call("POST", `/inventory/purchase-orders/${staplerOrder.id}/submit`);
  await call("POST", `/inventory/purchase-orders/${staplerOrder.id}/approve`, {});
  ids.staplerPo = staplerOrder.id;
  ids.staplerPoNumber = staplerOrder.po_number;

  const context = await browser.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
  await context.addInitScript(
    ([access, refresh]) => {
      window.localStorage.setItem("plutus.access_token", access);
      window.localStorage.setItem("plutus.refresh_token", refresh);
      // The print pages open the print dialog on load.
      window.print = () => {};
    },
    [tokens.access_token, tokens.refresh_token],
  );
  page = await context.newPage();
  // The beforeAll's request fixture can't be used inside the tests.
  call = api(page.request, tokens.access_token);
});

test.afterAll(async () => {
  await page?.context().close();
});

test("1. Goods Receipt lists the approved order, and receiving it adds to stock on hand", async () => {
  expect(await onHand()).toBe(3);
  expect(await onHand(ids.stapler)).toBe(1);
  await page.goto("/inventory/goods-receipts");
  await page.getByRole("link", { name: "Receive Goods" }).click();
  await page.waitForURL(/goods-receipts\/new$/);

  const select = page.getByLabel("Select purchase order");
  await expect(select).toBeEnabled();
  const option = select.locator("option", { hasText: ids.poNumber });
  await expect(option).toHaveText(`${ids.poNumber} · Lekki Stationers Ltd · Approved`);
  await select.selectOption(ids.po);
  await page.waitForURL(new RegExp(`goods-receipts/new\\?po=${ids.po}$`));
  await expect(page.getByLabel(`Accepted PAPER-${RUN}`)).toHaveValue("7");
  await page.getByRole("button", { name: "Receive into stock" }).click();
  await toast(page, "received: stock on hand updated");
  await page.waitForURL(/goods-receipts\/[0-9a-f-]{36}$/);
  ids.paperGoodsReceipt = page.url().split("/").pop()!;

  expect(await onHand()).toBe(10);
  await page.goto(`/inventory/purchase-orders/${ids.po}`);
  await expect(statusBadge(page, "received")).toBeVisible();
  await page.goto("/inventory/stock");
  await expect(page.locator("tr", { hasText: `PAPER-${RUN}` })).toContainText("10");

  // The second pending PO belongs to the stapler. One already on hand plus
  // five accepted now gives six; receiving one PO must not hide the other.
  await page.goto("/inventory/goods-receipts/new");
  const pendingSelect = page.getByLabel("Select purchase order");
  await expect(pendingSelect.locator("option", { hasText: ids.staplerPoNumber })).toHaveText(
    `${ids.staplerPoNumber} · Lekki Stationers Ltd · Approved`,
  );
  await pendingSelect.selectOption(ids.staplerPo);
  await page.waitForURL(new RegExp(`goods-receipts/new\\?po=${ids.staplerPo}import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";

import { API_URL, api, lagosDate, statusBadge, toast } from "./support";

// The client's inventory and VAT walkthrough, in an organisation of its own:
// 1. Goods Receipt's "Select purchase order" lists an order that is approved
//    but not yet issued, and receiving it adds to the stock already on hand
//    (3 reams + 7 = 10);
// 2. a stock issue goes to a department created from the form and to a
//    branch, on a date, and takes the stock out (10 - 3 = 7);
// 3. a vendor bill takes VAT from the same dropdown as an invoice;
// 4. the month's VAT report nets output VAT against input VAT, and prints.

const RUN = Date.now().toString(36).toUpperCase();
const today = lagosDate();
const month = today.slice(0, 7);
let page: Page;
let call: ReturnType<typeof api>;
const ids: Record<string, string> = {};

async function onHand(itemId = ids.item): Promise<number> {
  return Number((await call<{ quantity_on_hand: string }>("GET", `/inventory/items/${itemId}`)).quantity_on_hand);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser, request }: { browser: Browser; request: APIRequestContext }) => {
  const email = `inventory-vat-${RUN.toLowerCase()}@example.com`;
  const password = "inventory-vat-pass-2026";
  const signup = await request.post(`${API_URL}/organisation/signup`, {
    data: { org_name: `Office Supplies ${RUN}`, org_address: "4 Broad Street, Lagos", admin_email: email, admin_password: password },
  });
  expect(signup.ok(), await signup.text()).toBeTruthy();
  const login = await request.post(`${API_URL}/auth/login`, { data: { identifier: email, password } });
  const tokens = (await login.json()) as { access_token: string; refresh_token: string };
  call = api(request, tokens.access_token);
  await call("POST", "/chart-of-accounts/seed-defaults");
  await call("PUT", "/organisation", { company_tin: "21345678-0001" });
  await call("PUT", "/inventory/settings", { enabled: true });

  const units = await call<{ id: string; code: string }[]>("GET", "/inventory/units");
  const unit = units.find((u) => u.code === "PCS") ?? units[0];
  ids.item = (await call<{ id: string }>("POST", "/inventory/items", { sku: `PAPER-${RUN}`, name: "A4 paper (ream)", base_unit_id: unit.id })).id;
  ids.stapler = (await call<{ id: string }>("POST", "/inventory/items", { sku: `STAPLER-${RUN}`, name: "Office stapler", base_unit_id: unit.id })).id;
  ids.warehouse = (await call<{ id: string }>("POST", "/inventory/warehouses", { code: "MAIN", name: "Main store" })).id;
  ids.vendor = (await call<{ id: string }>("POST", "/vendors", { name: "Lekki Stationers Ltd" })).id;
  ids.customer = (await call<{ id: string }>("POST", "/customers", { name: "Zenith Retail Ltd" })).id;
  await call("POST", "/branches", { name: "Head Office", state: "Lagos" });
  await call("POST", "/branches", { name: "Abuja Branch", state: "FCT" });

  const order = (itemId: string, quantity: string) =>
    call<{ id: string; po_number: string }>("POST", "/inventory/purchase-orders", {
      vendor_id: ids.vendor,
      warehouse_id: ids.warehouse,
      order_date: today,
      lines: [{ item_id: itemId, quantity, unit_price_minor: 5_000_00 }],
    });
  // Three reams already in stock.
  const first = await order(ids.item, "3");
  await call("POST", `/inventory/purchase-orders/${first.id}/submit`);
  await call("POST", `/inventory/purchase-orders/${first.id}/approve`, {});
  const lines = (await call<{ lines: { id: string }[] }>("GET", `/inventory/purchase-orders/${first.id}`)).lines;
  const receipt = await call<{ id: string }>("POST", "/inventory/goods-receipts", {
    purchase_order_id: first.id,
    warehouse_id: ids.warehouse,
    receipt_date: today,
    lines: [{ po_line_id: lines[0].id, accepted_quantity: "3" }],
  });
  await call("POST", `/inventory/goods-receipts/${receipt.id}/post`);

  // One stapler is already in stock before the next delivery.
  const firstStapler = await order(ids.stapler, "1");
  await call("POST", `/inventory/purchase-orders/${firstStapler.id}/submit`);
  await call("POST", `/inventory/purchase-orders/${firstStapler.id}/approve`, {});
  const staplerOpeningLines = (await call<{ lines: { id: string }[] }>("GET", `/inventory/purchase-orders/${firstStapler.id}`)).lines;
  const staplerOpeningReceipt = await call<{ id: string }>("POST", "/inventory/goods-receipts", {
    purchase_order_id: firstStapler.id,
    warehouse_id: ids.warehouse,
    receipt_date: today,
    lines: [{ po_line_id: staplerOpeningLines[0].id, accepted_quantity: "1" }],
  });
  await call("POST", `/inventory/goods-receipts/${staplerOpeningReceipt.id}/post`);

  // Seven reams and five staplers are ordered and approved, but not received.
  const second = await order(ids.item, "7");
  await call("POST", `/inventory/purchase-orders/${second.id}/submit`);
  await call("POST", `/inventory/purchase-orders/${second.id}/approve`, {});
  ids.po = second.id;
  ids.poNumber = second.po_number;
  const staplerOrder = await order(ids.stapler, "5");
  await call("POST", `/inventory/purchase-orders/${staplerOrder.id}/submit`);
  await call("POST", `/inventory/purchase-orders/${staplerOrder.id}/approve`, {});
  ids.staplerPo = staplerOrder.id;
  ids.staplerPoNumber = staplerOrder.po_number;

  const context = await browser.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
  await context.addInitScript(
    ([access, refresh]) => {
      window.localStorage.setItem("plutus.access_token", access);
      window.localStorage.setItem("plutus.refresh_token", refresh);
      // The print pages open the print dialog on load.
      window.print = () => {};
    },
    [tokens.access_token, tokens.refresh_token],
  );
  page = await context.newPage();
  // The beforeAll's request fixture can't be used inside the tests.
  call = api(page.request, tokens.access_token);
});

test.afterAll(async () => {
  await page?.context().close();
});

test("1. Goods Receipt lists the approved order, and receiving it adds to stock on hand", async () => {
  expect(await onHand()).toBe(3);
  expect(await onHand(ids.stapler)).toBe(1);
  await page.goto("/inventory/goods-receipts");
  await page.getByRole("link", { name: "Receive Goods" }).click();
  await page.waitForURL(/goods-receipts\/new$/);

  const select = page.getByLabel("Select purchase order");
  await expect(select).toBeEnabled();
  const option = select.locator("option", { hasText: ids.poNumber });
  await expect(option).toHaveText(`${ids.poNumber} · Lekki Stationers Ltd · Approved`);
  await select.selectOption(ids.po);
  await page.waitForURL(new RegExp(`goods-receipts/new\\?po=${ids.po}$`));
  await expect(page.getByLabel(`Accepted PAPER-${RUN}`)).toHaveValue("7");
  await page.getByRole("button", { name: "Receive into stock" }).click();
  await toast(page, "received: stock on hand updated");
  await page.waitForURL(/goods-receipts\/[0-9a-f-]{36}$/);
  ids.paperGoodsReceipt = page.url().split("/").pop()!;

  expect(await onHand()).toBe(10);
  await page.goto(`/inventory/purchase-orders/${ids.po}`);
  await expect(statusBadge(page, "received")).toBeVisible();
));
  await expect(page.getByLabel(`Accepted STAPLER-${RUN}`)).toHaveValue("5");
  await page.getByRole("button", { name: "Receive into stock" }).click();
  await toast(page, "received: stock on hand updated");
  await page.waitForURL(/goods-receipts\/[0-9a-f-]{36}$/);
  expect(await onHand(ids.stapler)).toBe(6);

  // Nothing is left to receive, so the dropdown has no orders.
  await page.goto("/inventory/goods-receipts/new");
  await expect(page.getByText("No purchase orders are waiting for goods.")).toBeVisible();
});

test("2. a stock issue goes to a new department and a branch, and takes the stock out", async () => {
  await page.goto("/inventory/issues/new");
  await page.locator("#issue-item-0").waitFor();
  await page.getByRole("button", { name: "+ New Department" }).click();
  const dialog = page.getByRole("dialog", { name: "New Department" });
  await dialog.getByLabel("Name").fill("Finance");
  await dialog.getByRole("button", { name: "Create Department" }).click();
  await toast(page, "Finance department created");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("#issue-department option:checked")).toHaveText("Finance");

  await page.getByLabel("Branch").selectOption({ label: "Head Office" });
  await page.getByLabel("Purpose").fill("Printing paper for month-end");
  await page.selectOption("#issue-item-0", ids.item);
  await page.fill("#issue-qty-0", "3");
  await page.getByRole("button", { name: "Save draft" }).click();
  await toast(page, "ISS-000001 saved as a draft");
  await page.waitForURL(/\/inventory\/issues\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: "Submit for approval" }).click();
  await toast(page, "ISS-000001 submitted for approval");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await toast(page, "Approval recorded");
  await page.getByRole("button", { name: "Post issue" }).click();
  await toast(page, "ISS-000001 posted — stock issued");
  await expect(statusBadge(page, "posted")).toBeVisible();

  const facts = page.locator("main");
  await expect(facts).toContainText("Finance");
  await expect(facts).toContainText("Head Office");
  expect(await onHand()).toBe(7);

  await page.goto("/inventory/issues");
  const row = page.locator("tr", { hasText: "ISS-000001" });
  await expect(row).toContainText("Finance · Head Office");
});

test("3. a vendor bill takes VAT from the dropdown and posts it as input VAT", async () => {
  await page.goto("/bills");
  await page.getByRole("button", { name: "New Vendor Bill" }).click();
  const dialog = page.getByRole("dialog", { name: "New Vendor Bill" });
  await dialog.locator("#vendor").selectOption(ids.vendor);
  await dialog.getByLabel("Vendor Bill Number").fill(`LS-${RUN}`);
  await dialog.getByLabel("Vendor Bill Date").fill(today);
  await dialog.getByLabel("Due Date").fill(lagosDate(30));
  await dialog.locator("#expenseAccount").selectOption({ index: 1 });
  const goodsReceipt = dialog.getByLabel("Goods receipt (if this bill covers received stock)");
  await expect(goodsReceipt.locator("option", { has: ids.paperGoodsReceipt })).toHaveCount(1);
  await goodsReceipt.selectOption(ids.paperGoodsReceipt);
  await expect(dialog.getByText("Enter the VAT shown on the supplier's invoice here.")).toBeVisible();
  await dialog.getByLabel(/Amount before VAT/).fill("400000");

  const vat = dialog.getByLabel("VAT", { exact: true });
  await expect(vat.locator("option")).toHaveText(["VAT 7.5%", "VAT exempt", "Zero-rated", "Other rate"]);
  await expect(vat).toHaveValue("standard");
  await expect(dialog.getByText("Bill total")).toBeVisible();
  await expect(dialog.getByText("₦430,000")).toBeVisible();
  await dialog.getByRole("button", { name: "Create Vendor Bill" }).click();
  await toast(page, `Bill LS-${RUN} posted`);

  const bills = await call<{ bill_number: string; status: string; vat_rate_name: string; vat_minor: number; total_minor: number; goods_receipt_id: string | null }[]>(
    "GET",
    "/bills",
  );
  const bill = bills.find((entry) => entry.bill_number === `LS-${RUN}`)!;
  expect([bill.status, bill.vat_rate_name, bill.vat_minor, bill.total_minor, bill.goods_receipt_id]).toEqual(["approved", "VAT 7.5%", 30_000_00, 430_000_00, ids.paperGoodsReceipt]);
  await expect(page.locator("tr", { hasText: `LS-${RUN}` })).toContainText("VAT 7.5% ₦30,000");
});

test("4. the month's VAT report nets output VAT against input VAT, passes axe, and prints", async () => {
  const invoice = await call<{ id: string }>("POST", "/invoices", {
    customer_id: ids.customer,
    issue_date: today,
    due_date: lagosDate(30),
    revenue_account_code: "revenue",
    amount_minor: 1_000_000_00,
    vat_treatment: "standard",
  });
  await call("POST", `/invoices/${invoice.id}/send`);

  await page.goto("/dashboard");
  await page.getByRole("combobox", { name: "Search pages and employees" }).fill("vat rep");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/vat-report$/);
  await expect(page.getByLabel("Month")).toHaveValue(month);

  const summary = page.getByRole("region", { name: "VAT summary" });
  await expect(summary).toContainText("Output VAT₦75,000.00");
  await expect(summary).toContainText("Input VAT₦30,000.00");
  await expect(summary).toContainText("Net VAT payable₦45,000.00");
  await expect(page.getByRole("table", { name: "Sales by VAT rate" })).toContainText("VAT 7.5%");
  await expect(page.getByRole("table", { name: "Purchases by VAT rate" })).toContainText("₦400,000.00");
  await expect(page.getByRole("table", { name: "Documents in this VAT report" })).toContainText(`LS-${RUN}`);
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF" }).click();
  expect((await download).suggestedFilename()).toBe(`vat-report-${month}.pdf`);

  await page.getByRole("link", { name: "Print" }).click();
  await page.waitForURL(new RegExp(`/print/vat-report\\?month=${month}$`));
  const header = page.locator("header");
  await expect(header).toContainText("VAT Report");
  await expect(header).toContainText("Tax ID: 21345678-0001");
  await expect(page.getByRole("region", { name: "VAT summary" })).toContainText("Net VAT payable₦45,000.00");

  // A month with nothing in it is nil, not an error.
  await page.goto("/vat-report?month=2026-01");
  await expect(page.getByRole("region", { name: "VAT summary" })).toContainText("Net VAT₦0.00");
  await expect(page.getByText("No invoices sent this month.")).toBeVisible();
});
