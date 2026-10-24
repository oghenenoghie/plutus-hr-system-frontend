import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import fs from "node:fs";

import { api, savedToken, storageStateFor } from "./support";

// Analytics & Insights through the real screens: figures that reconcile with
// the payroll-cost report, filters kept in the URL, drill-down, export,
// role-based access (on screen and through the API), accessibility and
// phone-width layout. The data is synthetic, arranged through the API in the
// run's own organisation: two departments, three employees and one locked
// January 2026 pay run.

const PERIOD = "date_from=2026-01-01&date_to=2026-01-31";
const SECTIONS = [
  "/analytics",
  "/analytics/workforce",
  "/analytics/payroll",
  "/analytics/attendance",
  "/analytics/leave",
  "/analytics/recruitment",
  "/analytics/performance",
  "/analytics/compliance",
  "/analytics/financial",
  "/analytics/reports",
];

let salesId = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ request }) => {
  const call = api(request, savedToken("admin"));
  await call("POST", "/chart-of-accounts/seed-defaults");
  const sales = await call<{ id: string }>("POST", "/departments", { name: "Analytics Sales" });
  const ops = await call<{ id: string }>("POST", "/departments", { name: "Analytics Ops" });
  salesId = sales.id;
  const ids: string[] = [];
  for (const [number, department] of [
    ["AN-1", sales.id],
    ["AN-2", sales.id],
    ["AN-3", ops.id],
  ] as const) {
    const employee = await call<{ id: string }>("POST", "/employees", {
      employee_number: `${number}-${Date.now().toString(36)}`,
      full_name: `Analytics ${number}`,
      state_of_residence: "Lagos",
      employment_type: "permanent",
      date_of_joining: "2025-06-01",
      basic_minor: 300_000_00,
      housing_minor: 150_000_00,
      transport_minor: 50_000_00,
      tin: `5500000${number.slice(-1)}-0001`,
      department_id: department,
    });
    ids.push(employee.id);
  }
  const run = await call<{ id: string }>("POST", "/pay-runs", {
    period_start: "2026-01-01",
    period_end: "2026-01-31",
    frequency: "monthly",
    employee_ids: ids,
  });
  await call("POST", `/pay-runs/${run.id}/validate`, { override_variance: true });
  await call("POST", `/pay-runs/${run.id}/lock`);
});

test.describe("as an administrator", () => {
  test.use({ storageState: storageStateFor("admin") });

  test("payroll figures match the payroll-cost report", async ({ page, request }) => {
    const report = await api(request, savedToken("admin"))<{ employer_cost_minor: number }[]>(
      "GET",
      "/reports/payroll-cost?from_date=2026-01-01&to_date=2026-01-31",
    );
    const cost = report.reduce((sum, line) => sum + line.employer_cost_minor, 0);
    expect(cost).toBeGreaterThan(0);
    const expected = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(cost / 100);

    await page.goto(`/analytics/payroll?${PERIOD}`);
    const card = page.locator("div.rounded-card", { hasText: "Total payroll cost" }).first();
    await expect(card).toContainText(expected);
    await expect(page.getByRole("heading", { name: "Payroll cost by department" })).toBeVisible();
  });

  test("filters live in the URL and narrow every figure", async ({ page }) => {
    await page.goto(`/analytics/workforce?${PERIOD}`);
    const headcount = page.locator("div.rounded-card", { hasText: "Total employees" }).first();
    await expect(headcount).toContainText(/\d/);
    await page.getByRole("button", { name: /Department:/ }).click();
    await page.getByRole("checkbox", { name: "Analytics Sales" }).click();
    await expect(page).toHaveURL(new RegExp(`department_id=${salesId}`));
    await expect(headcount.locator("div.font-extrabold").first()).toHaveText("2");

    // The section tabs keep the filters.
    await page.keyboard.press("Escape");
    await page.getByRole("navigation", { name: "Analytics sections" }).getByRole("link", { name: "Payroll" }).click();
    await expect(page).toHaveURL(new RegExp(`/analytics/payroll\\?.*department_id=${salesId}`));

    await page.getByRole("button", { name: "Reset filters" }).click();
    await expect(page).toHaveURL(/\/analytics\/payroll$/);
  });

  test("drill-down lists the records behind a KPI, and exports them", async ({ page }) => {
    await page.goto(`/analytics/workforce?${PERIOD}&department_id=${salesId}`);
    await page.getByRole("button", { name: "Records behind Total employees" }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer.getByText("2 records for the filters on this page")).toBeVisible();
    await expect(drawer.getByRole("table")).not.toContainText("Gross pay");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      drawer.getByRole("group", { name: "Export these records" }).getByRole("button", { name: "CSV" }).click(),
    ]);
    const text = fs.readFileSync((await download.path())!, "utf8");
    expect(text).toContain("Employees in headcount");
    expect(text).toContain("Organisation:");
    expect(text).toContain("Period: 2026-01-01 to 2026-01-31");
  });

  test("charts work from the keyboard and have a table view", async ({ page }) => {
    await page.goto(`/analytics/payroll?${PERIOD}`);
    const chart = page.getByRole("group", { name: "Payroll cost", exact: true });
    await chart.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator("[aria-live=polite]").filter({ hasText: "Gross pay" }).first()).toBeAttached();
    const card = page.locator("div.rounded-card", {
      has: page.getByRole("heading", { name: "Payroll cost", exact: true }),
    });
    await card.getByRole("radio", { name: "Table" }).click();
    await expect(card.getByRole("table")).toContainText("Employer pension");
  });

  test("analytics screens meet WCAG 2.1 AA (axe)", async ({ page }) => {
    const report: string[] = [];
    for (const path of SECTIONS) {
      await page.goto(`${path}?${PERIOD}`);
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

  test("analytics screens fit a phone without sideways page scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const overflowing: string[] = [];
    for (const path of SECTIONS) {
      await page.goto(`${path}?${PERIOD}`);
      await page.waitForLoadState("networkidle");
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      if (width > 391) overflowing.push(`${path}: ${width}px`);
    }
    expect(overflowing).toEqual([]);
  });
});

test.describe("as an HR manager", () => {
  test.use({ storageState: storageStateFor("hr") });

  test("payroll and finance analytics are closed, on screen and through the API", async ({ page, request }) => {
    await page.goto("/analytics");
    const tabs = page.getByRole("navigation", { name: "Analytics sections" });
    await expect(tabs.getByRole("link", { name: "Workforce" })).toBeVisible();
    await expect(tabs.getByRole("link", { name: "Payroll" })).toHaveCount(0);
    await expect(tabs.getByRole("link", { name: "Financial" })).toHaveCount(0);

    await page.goto("/analytics/payroll");
    await expect(page.getByText("This analytics view isn’t available to you")).toBeVisible();

    const call = api(request, savedToken("hr"));
    await expect(call("GET", "/analytics/payroll")).rejects.toThrow(/403/);
    await expect(call("GET", "/analytics/records/payslips")).rejects.toThrow(/403/);
  });
});

test.describe("as an auditor", () => {
  test.use({ storageState: storageStateFor("auditor") });

  test("reads payroll analytics but not the ledger", async ({ page, request }) => {
    await page.goto(`/analytics/payroll?${PERIOD}`);
    await expect(page.locator("div.rounded-card", { hasText: "Total payroll cost" }).first()).toBeVisible();
    await expect(api(request, savedToken("auditor"))("GET", "/analytics/financial")).rejects.toThrow(/403/);
  });
});
