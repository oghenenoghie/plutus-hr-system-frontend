import AxeBuilder from "@axe-core/playwright";
import { expect, test, type APIRequestContext, type Browser, type Page } from "@playwright/test";

import { API_URL, dialogButton, toast } from "./support";

// The fixes from the client's report, through the real screens and API, in
// an organisation of their own (so the shared one's numbering and inventory
// switch are left to the other specs):
// 1. an employee added without a TIN still shows in a pay run, with figures,
//    is named as what blocks it, and can be completed afterwards; then the
//    run validates, posts, shows its statutory charges and gives a payslip;
// 2. an invoice charges VAT at the standard rate or a rate the user names,
//    and prints the company's TIN at the top right;
// 3. receiving goods against a purchase order puts them into stock in one step.

const RUN = Date.now().toString(36).toUpperCase();
let page: Page;
let token: string;

async function call<T = unknown>(request: APIRequestContext, method: string, route: string, data?: unknown): Promise<T> {
  const response = await request.fetch(`${API_URL}${route}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  if (!response.ok()) throw new Error(`${method} ${route}: ${response.status()} ${await response.text()}`);
  return (response.status() === 204 ? null : await response.json()) as T;
}

async function accessibilityViolations(target: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page: target })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations.map(
    (v) => `[${v.impact}] ${v.id}: ${v.help} (e.g. ${v.nodes[0]?.target.join(" ") ?? ""})`,
  );
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser, request }: { browser: Browser; request: APIRequestContext }) => {
  const email = `client-fixes-${RUN.toLowerCase()}@example.com`;
  const password = "client-fixes-pass-2026";
  const signup = await request.post(`${API_URL}/organisation/signup`, {
    data: { org_name: `Client Fixes ${RUN}`, org_address: "14 Marina Road\nLagos Island, Lagos", admin_email: email, admin_password: password },
  });
  expect(signup.ok(), await signup.text()).toBeTruthy();
  const login = await request.post(`${API_URL}/auth/login`, { data: { identifier: email, password } });
  const tokens = (await login.json()) as { access_token: string; refresh_token: string };
  token = tokens.access_token;
  await call(request, "POST", "/chart-of-accounts/seed-defaults");
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
});

test.afterAll(async () => {
  await page?.context().close();
});

test("1. an employee without a TIN shows in a pay run, is named as the blocker, and is completed afterwards", async ({ request }) => {
  // Added with the minimum: no TIN, no email.
  await page.goto("/employees/new");
  await page.getByLabel("Employee Number *").fill(`EMP-${RUN}`);
  await page.getByLabel("Full Name *").fill("Amaka Okafor");
  await page.getByLabel("State of Residence *").selectOption("Lagos");
  await page.getByLabel("Date of Joining *").fill("2026-01-05");
  await page.getByLabel("Monthly Basic (₦) *").fill("400000");
  await page.getByLabel("Monthly Housing Allowance (₦) *").fill("150000");
  await page.getByLabel("Monthly Transport Allowance (₦) *").fill("50000");
  await page.getByRole("button", { name: "Create Employee" }).click();
  await page.waitForURL(/\/employees\?created=/);
  const [employee] = await call<{ id: string; tin: string | null }[]>(request, "GET", "/employees");
  expect(employee.tin).toBeNull();

  const run = await call<{ id: string }>(request, "POST", "/pay-runs", {
    period_start: "2026-11-01",
    period_end: "2026-11-30",
    frequency: "monthly",
    employee_ids: [employee.id],
  });

  // The draft shows its figures, and says exactly what stops it.
  await page.goto(`/payroll/${run.id}`);
  await expect(page.getByText("₦600,000").first()).toBeVisible();
  // (Next.js's route announcer is an alert too.)
  const blocker = page.getByRole("alert").filter({ hasText: "can't be validated" });
  await expect(blocker).toContainText("can't be validated or posted yet");
  await expect(blocker).toContainText("Amaka Okafor");
  // The statutory charges, each to its authority.
  await expect(page.getByRole("row", { name: /^NSITF \(employee compensation\) NSITF/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /^Pension PFA .*₦48,000 ₦60,000 ₦108,000$/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /^PAYE \(income tax\) · Lagos Lagos State Internal Revenue Service/ })).toBeVisible();
  expect(await accessibilityViolations(page)).toEqual([]);

  // Completed afterwards, from the link on the run.
  await blocker.getByRole("link", { name: "Add their TIN" }).click();
  await page.waitForURL(`/employees/${employee.id}/edit`);
  await page.getByLabel("TIN", { exact: true }).fill("23456789-0001");
  await page.getByLabel("Email", { exact: true }).fill(`amaka-${RUN.toLowerCase()}@example.com`);
  await page.getByLabel("Phone", { exact: true }).fill("+2348012345678");
  await page.getByLabel("Job Title", { exact: true }).fill("Accounts Officer");
  expect(await accessibilityViolations(page)).toEqual([]);
  await page.getByRole("button", { name: "Save Changes" }).click();
  await toast(page, "Employee details saved");
  await page.waitForURL(`/employees/${employee.id}`);
  await expect(page.getByText("23456789-0001")).toBeVisible();
  const completed = await call<{ tin: string; phone: string; job_title: string }>(
    request,
    "GET",
    `/employees/${employee.id}`,
  );
  expect(completed).toMatchObject({ tin: "23456789-0001", phone: "+2348012345678", job_title: "Accounts Officer" });

  // Now it validates, posts and gives a payslip.
  await page.goto(`/payroll/${run.id}`);
  await expect(page.getByRole("alert").filter({ hasText: "can't be validated" })).toHaveCount(0);
  await expect(page.getByText("₦600,000").first()).toBeVisible();
  await page.getByRole("button", { name: "Validate", exact: true }).click();
  await toast(page, "Pay run validated");
  await page.getByRole("button", { name: "Post to Records" }).click();
  await dialogButton(page, "Post").click();
  await toast(page, "Pay run posted");
  await page.getByRole("button", { name: "Show working" }).click();
  await expect(page.getByText("How the PAYE was worked out")).toBeVisible();
  await expect(page.getByText("Statutory charges").first()).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PDF", exact: true }).click();
  const pdf = await download;
  expect(pdf.suggestedFilename()).toBe(`payslip-EMP-${RUN}-2026-11-30.pdf`);
});

test("2. an invoice charges VAT at 7.5% or a named rate and prints our TIN at the top right", async ({ request }) => {
  // The company's tax ID, in Company Information.
  await page.goto("/setup");
  await expect(page.getByRole("heading", { name: "Company Information" })).toBeVisible();
  await page.fill("#company-tin", "21345678-0001");
  await page.getByRole("button", { name: "Save setup" }).click();
  await toast(page, "Company setup saved");

  const customer = await call<{ id: string }>(request, "POST", "/customers", { name: "Accra Imports Ltd" });

  async function newInvoice(net: string, vat: { label: string; name?: string; percent?: string }) {
    await page.goto("/invoices");
    await page.getByRole("button", { name: "New Customer Invoice" }).click();
    await page.selectOption("#customer", customer.id);
    await page.fill("#issueDate", "2026-11-02");
    await page.fill("#dueDate", "2026-11-30");
    await page.selectOption("#revenueAccount", "revenue");
    await page.fill("#amount", net);
    await page.locator("#vat").selectOption({ label: vat.label });
    if (vat.name) {
      await page.fill("#vatRateName", vat.name);
      await page.fill("#vatRatePercent", vat.percent ?? "");
    }
  }

  await newInvoice("100000", { label: "VAT 7.5%" });
  const invoiceForm = page.getByRole("dialog", { name: "New Customer Invoice" });
  await expect(invoiceForm.getByText("₦7,500")).toBeVisible();
  await expect(invoiceForm.getByText("₦107,500")).toBeVisible();
  expect(await accessibilityViolations(page)).toEqual([]);
  await invoiceForm.getByRole("button", { name: "Create Customer Invoice" }).click();
  await expect(invoiceForm).toBeHidden();
  await expect(page.getByRole("cell", { name: /₦107,500/ })).toBeVisible();

  await newInvoice("100000", { label: "Other rate", name: "Ghana VAT 15%", percent: "15" });
  await expect(page.getByRole("dialog").getByText("₦115,000")).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "Create Customer Invoice" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  const invoices = await call<{ id: string; vat_rate_name: string; vat_minor: number; total_minor: number }[]>(
    request,
    "GET",
    "/invoices",
  );
  const byName = Object.fromEntries(invoices.map((invoice) => [invoice.vat_rate_name, invoice]));
  expect(byName["VAT 7.5%"]).toMatchObject({ vat_minor: 7_500_00, total_minor: 107_500_00 });
  expect(byName["Ghana VAT 15%"]).toMatchObject({ vat_minor: 15_000_00, total_minor: 115_000_00 });
  const balances = await call<{ account: string; balance_minor: number }[]>(request, "GET", "/general-ledger/trial-balance");
  expect(balances.find((line) => line.account === "vat_payable")?.balance_minor).toBe(-22_500_00);

  // Printed: the TIN at the top right, then the VAT line and the total.
  await page.goto(`/print/invoices/${byName["VAT 7.5%"].id}`);
  const header = page.locator("header");
  await expect(header).toContainText("TIN");
  await expect(header).toContainText("21345678-0001");
  await expect(page.getByRole("cell", { name: "VAT 7.5%" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "₦107,500" })).toBeVisible();
});

test("3. receiving goods against a purchase order puts them into stock in one step", async ({ request }) => {
  await call(request, "PUT", "/inventory/settings", { enabled: true });
  const units = await call<{ id: string; code: string }[]>(request, "GET", "/inventory/units");
  const unit = units.find((u) => u.code === "PCS") ?? units[0];
  const item = await call<{ id: string }>(request, "POST", "/inventory/items", {
    sku: `TONER-${RUN}`,
    name: "Printer toner",
    base_unit_id: unit.id,
  });
  const warehouse = await call<{ id: string }>(request, "POST", "/inventory/warehouses", { code: "MAIN", name: "Main store" });
  const vendor = await call<{ id: string }>(request, "POST", "/vendors", { name: "Lekki Stationers Ltd" });
  const po = await call<{ id: string; po_number: string }>(request, "POST", "/inventory/purchase-orders", {
    vendor_id: vendor.id,
    warehouse_id: warehouse.id,
    order_date: "2026-11-02",
    lines: [{ item_id: item.id, quantity: "12", unit_price_minor: 25_000_00 }],
  });
  await call(request, "POST", `/inventory/purchase-orders/${po.id}/submit`);
  await call(request, "POST", `/inventory/purchase-orders/${po.id}/approve`, { comment: "ok" });
  await call(request, "POST", `/inventory/purchase-orders/${po.id}/issue`);

  const onHand = async () =>
    (await call<{ quantity_on_hand: string }>(request, "GET", `/inventory/items/${item.id}`)).quantity_on_hand;
  expect(Number(await onHand())).toBe(0);

  await page.goto(`/inventory/purchase-orders/${po.id}`);
  await page.getByRole("link", { name: "Receive goods" }).click();
  await page.waitForURL(/goods-receipts\/new/);
  await expect(page.getByRole("button", { name: "Save draft" })).toBeVisible();
  await page.getByRole("button", { name: "Receive into stock" }).click();
  await toast(page, "received: stock on hand updated");
  expect(Number(await onHand())).toBe(12);
  await expect(page.getByText("Not in stock yet")).toHaveCount(0);
});
