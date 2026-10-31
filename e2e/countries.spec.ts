import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import path from "node:path";

import { API_URL, AUTH_DIR, accessToken, api, dialogButton, savedToken, storageStateFor, toast } from "./support";

// An organisation's country, through the real screens and the API. Any of
// the six countries can be chosen at sign-up and applies at once: the
// organisation's currency on every screen and its own registration fields.
// Every country runs payroll: Nigeria on its own rules, the other five on
// rules approved by Plutus Technologies, with the figures their sources
// didn't settle entered by each organisation under Tax Settings.

const ENGINE_COUNTRIES = ["The Gambia", "Rwanda", "Kenya", "Ghana", "Côte d'Ivoire"];
const PAYROLL_SCREENS = ["Payroll Runs", "Payroll Reports", "Final Settlement"];
// Built on Nigeria's own rule tables: hidden and explained elsewhere.
const NIGERIA_ONLY = ["Compliance Engine", "PAYE Calculator", "Simulation", "Contractors"];

async function accessibilityViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations.map(
    (v) => `[${v.impact}] ${v.id}: ${v.help} (e.g. ${v.nodes[0]?.target.join(" ") ?? ""})`,
  );
}

test.describe("signing up", () => {
  test("offers every country, each with payroll", async ({ page }) => {
    await page.goto("/signup");
    const country = page.getByLabel("Country");
    await expect(country).toHaveValue("NG");
    await expect(country.locator('option[value="NG"]')).toHaveText("Nigeria (NGN)");
    for (const name of ENGINE_COUNTRIES) {
      const option = country.locator("option", { hasText: name });
      await expect(option).toBeEnabled();
      await expect(option).not.toContainText("payroll not available yet");
    }
    await country.selectOption("KE");
    await expect(page.getByText("Your workspace will run in KES")).toBeVisible();
    expect(await accessibilityViolations(page)).toEqual([]);
  });
});

// Signs in once (the API allows 10 sign-ins a minute per address) and
// reuses that session for the rest of the Kenyan steps.
const KENYA_STATE = path.join(AUTH_DIR, "kenya.json");

test.describe("a company in Kenya", () => {
  test.describe.configure({ mode: "serial" });
  const email = `e2e-kenya-${Date.now().toString(36)}@example.com`;
  const password = "s3cret-pass-e2e";

  async function changeCountry(page: Page, code: string) {
    await page.getByLabel("Change to").selectOption(code);
    await page.getByRole("button", { name: "Change country" }).click();
    await dialogButton(page, "Change country").click();
  }

  test("signs up as Kenyan and the app runs in Kenya at once", async ({ page }) => {
    await page.goto("/signup");
    await page.fill("#org-name", "Nairobi Traders Ltd");
    await page.getByLabel("Country").selectOption("KE");
    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(page.getByText("Your workspace is ready")).toBeVisible();

    await page.goto("/login");
    await page.fill("#identifier", email);
    await page.fill("#password", password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));
    await page.context().storageState({ path: KENYA_STATE });
    // The catalogue's own menu group (Accounts > Payroll) is open on its page.
    await page.goto("/compliance/countries");
    await expect(page.getByRole("heading", { name: "Country Compliance" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Country Compliance" })).toBeVisible();
    for (const label of [...PAYROLL_SCREENS, "Tax Settings"]) {
      await expect(page.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    for (const label of NIGERIA_ONLY) {
      await expect(page.getByRole("link", { name: label, exact: true })).toHaveCount(0);
    }

    // Payroll says what it's waiting for.
    await page.goto("/payroll");
    await expect(page.getByText("Enter Kenya's Tax Settings before running payroll")).toBeVisible();
    expect(await accessibilityViolations(page)).toEqual([]);

    // Reached directly, a screen for Nigeria's rules explains instead of failing.
    await page.goto("/calculator");
    await expect(page.getByText("This screen is for Nigeria's tax rules")).toBeVisible();
    expect(await accessibilityViolations(page)).toEqual([]);
  });

  test.describe("signed in", () => {
    test.use({ storageState: KENYA_STATE });

    test("Setup shows Kenya's currency and fields, and switches country before any history", async ({ page }) => {
      await page.goto("/setup");
      const summary = page.locator("main dl").first();
      await expect(summary).toContainText("Kenya (KE)");
      await expect(summary).toContainText("KES");
      await expect(summary).toContainText("Available");
      await expect(page.getByLabel("Company registration number")).toBeVisible();
      await expect(page.getByText("Default PFA")).toHaveCount(0);
      await expect(page.getByText("States of operation")).toHaveCount(0);
      expect(await accessibilityViolations(page)).toEqual([]);

      await changeCountry(page, "GH");
      await toast(page, "The organisation now runs in Ghana (GHS).");
      await expect(summary).toContainText("Ghana (GH)");
      await expect(summary).toContainText("GHS");

      await changeCountry(page, "KE");
      await toast(page, "The organisation now runs in Kenya (KES).");
      await expect(summary).toContainText("Kenya (KE)");
    });

    test("amounts show in shillings, and a posted bill fixes the country", async ({ page, request }) => {
      await page.goto("/setup");
      const call = api(request, await accessToken(page));
      const vendor = await call<{ id: string }>("POST", "/vendors", { name: "Mombasa Supplies" });
      const bill = await call<{ id: string }>("POST", "/bills", {
        vendor_id: vendor.id,
        bill_number: "KE-0001",
        bill_date: "2026-10-01",
        due_date: "2026-10-31",
        expense_account_code: "contractor_expense",
        amount_minor: 1_500_00,
      });
      await call("POST", `/bills/${bill.id}/approve`);

      await page.goto("/bills");
      await expect(page.getByText("KES 1,500").first()).toBeVisible();
      await expect(page.getByText("₦1,500")).toHaveCount(0);

      await page.goto("/setup");
      await changeCountry(page, "GH");
      await toast(page, /can't change once the organisation has a pay run or a posted journal/);
      await expect(page.locator("main dl").first()).toContainText("Kenya (KE)");
    });

    test("employee forms ask for a region, not a Nigerian state", async ({ page }) => {
      await page.goto("/employees/new");
      await expect(page.getByText("Region of Residence")).toBeVisible();
      await expect(page.getByPlaceholder("Region, county or province").first()).toBeVisible();
      await expect(page.getByText("Tax ID number")).toBeVisible();
      await expect(page.getByText("NHF Number")).toHaveCount(0);
      await expect(page.getByText("Annual Basic (KES)")).toBeVisible();
      // Inputs some countries' tax rules need, never Nigeria's.
      await expect(page.getByText("Family shares (in halves)")).toBeVisible();
      await expect(page.getByText("Expatriate status")).toBeVisible();
    });

    test("an admin enters Kenya's Tax Settings and sees the rules payroll will use", async ({ page }) => {
      await page.goto("/tax-settings");
      await expect(page.getByRole("heading", { name: "Tax Settings" })).toBeVisible();
      await expect(page.getByText("Payroll can't run until these 2 figures are entered")).toBeVisible();
      await expect(page.getByText(/Approved by Plutus Technologies/)).toBeVisible();
      await expect(page.getByText("Nothing entered yet.")).toBeVisible();
      expect(await accessibilityViolations(page)).toEqual([]);

      await page.getByLabel("Is the employee's NSSF contribution deducted before PAYE?").selectOption("yes");
      // The deadline is asked for only once the levy applies.
      await expect(page.getByLabel("Day of the following month the NITA levy is due")).toHaveCount(0);
      await page.getByLabel("Does your organisation pay the NITA industrial training levy?").selectOption("yes");
      await page.getByRole("button", { name: /^Use 5:/ }).click();
      await expect(page.getByLabel("Day of the following month the NITA levy is due")).toHaveValue("5");
      await page.getByLabel("Note (optional)").fill("Checked with our accountant");
      await page.getByRole("button", { name: "Save 3 figures" }).click();
      await toast(page, /3 figures saved from/);

      await expect(page.getByText(/Payroll can't run until/)).toHaveCount(0);
      await expect(page.getByRole("heading", { name: "The rules as they stand today" })).toBeVisible();
      const nita = page.getByRole("row", { name: /^Industrial Training Levy \(NITA\)/ });
      await expect(nita).toContainText("KES 50.00 a month");
      await expect(nita).toContainText("Day 5 of the following month");
      await expect(page.getByRole("row", { name: /Checked with our accountant/ })).toHaveCount(3);
      expect(await accessibilityViolations(page)).toEqual([]);

      await page.goto("/payroll");
      await expect(page.getByRole("heading", { name: "Payroll Runs" })).toBeVisible();
      await expect(page.getByText("Enter Kenya's Tax Settings before running payroll")).toHaveCount(0);
    });

    test("Tax Settings fits a phone without sideways page scrolling", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/tax-settings");
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
    });
  });
});

test.describe("as a Nigerian admin", () => {
  test.use({ storageState: storageStateFor("admin") });

  test("Setup shows Nigeria with payroll, and every country can be chosen", async ({ page }) => {
    await page.goto("/setup");
    const summary = page.locator("main dl").first();
    await expect(summary).toContainText("Nigeria (NG)");
    await expect(summary).toContainText("NGN");
    await expect(summary.getByText("Active", { exact: true })).toBeVisible();
    await expect(summary).toContainText("Available");

    const select = page.getByLabel("Change to");
    await expect(select).toHaveValue("NG");
    await expect(select.locator("option", { hasText: "Kenya" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Change country" })).toBeDisabled();
    // Nigeria's own settings stay.
    await expect(page.getByText("States of operation")).toBeVisible();
    await expect(page.getByLabel("RC number")).toBeVisible();

    expect(await accessibilityViolations(page)).toEqual([]);
  });

  test("Nigerian employee forms keep Nigeria's statutory fields only", async ({ page }) => {
    await page.goto("/employees/new");
    await expect(page.getByText("NHF Number")).toBeVisible();
    await expect(page.getByText("Family shares (in halves)")).toHaveCount(0);
    await expect(page.getByText("Expatriate status")).toHaveCount(0);
  });

  test("the catalogue shows where payroll runs", async ({ page }) => {
    await page.goto("/compliance/countries");
    for (const label of [...PAYROLL_SCREENS, ...NIGERIA_ONLY]) {
      await expect(page.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    // Nigeria's rules take no Tax Settings.
    await expect(page.getByRole("link", { name: "Tax Settings", exact: true })).toHaveCount(0);
    for (const name of ["Nigeria", ...ENGINE_COUNTRIES]) {
      const row = page.getByRole("row", { name: new RegExp(name) });
      await expect(row).toContainText("Active");
      await expect(row).toContainText("Available");
    }
    expect(await accessibilityViolations(page)).toEqual([]);

    await page.goto("/tax-settings");
    await expect(page.getByText("Nigeria's rules take no Tax Settings")).toBeVisible();
  });

  test("the API refuses a country Plutus doesn't list", async ({ request }) => {
    const headers = { Authorization: `Bearer ${savedToken("admin")}` };
    const refused = await request.put(`${API_URL}/organisation`, {
      headers,
      data: { country_code: "ZZ" },
    });
    expect(refused.status()).toBe(422);
    expect((await refused.json()).detail).toContain("Unknown country code");

    const org = await request.get(`${API_URL}/organisation`, { headers });
    expect(await org.json()).toMatchObject({ country_code: "NG", currency: "NGN" });
  });

  test("the country screens fit a phone without sideways page scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const overflowing: string[] = [];
    for (const path of ["/setup", "/compliance/countries"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      if (width > 391) overflowing.push(`${path}: ${width}px`);
    }
    expect(overflowing).toEqual([]);
  });
});

test.describe("as an HR manager", () => {
  test("can't change the organisation's country through the API", async ({ request }) => {
    const changed = await request.put(`${API_URL}/organisation`, {
      headers: { Authorization: `Bearer ${savedToken("hr")}` },
      data: { country_code: "KE" },
    });
    expect(changed.status()).toBe(403);
  });
});
