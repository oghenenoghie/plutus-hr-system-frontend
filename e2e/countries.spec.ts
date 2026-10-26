import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import path from "node:path";

import { API_URL, AUTH_DIR, accessToken, api, dialogButton, savedToken, storageStateFor, toast } from "./support";

// An organisation's country, through the real screens and the API. Any of
// the six countries can be chosen at sign-up and applies at once: the
// organisation's currency on every screen and its own registration fields.
// Payroll waits for approved rules, so it's hidden and explained in a
// country without them. Only Nigeria is active; the other five are drafts.

const DRAFTED = ["The Gambia", "Rwanda", "Kenya", "Ghana", "Côte d'Ivoire"];
const PAYROLL_ONLY = ["Payroll Runs", "Compliance Engine", "PAYE Calculator", "Payroll Reports", "Contractors"];

async function accessibilityViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations.map(
    (v) => `[${v.impact}] ${v.id}: ${v.help} (e.g. ${v.nodes[0]?.target.join(" ") ?? ""})`,
  );
}

test.describe("signing up", () => {
  test("offers every country, saying where payroll isn't available yet", async ({ page }) => {
    await page.goto("/signup");
    const country = page.getByLabel("Country");
    await expect(country).toHaveValue("NG");
    await expect(country.locator('option[value="NG"]')).toHaveText("Nigeria (NGN)");
    for (const name of DRAFTED) {
      const option = country.locator("option", { hasText: name });
      await expect(option).toBeEnabled();
      await expect(option).toContainText("payroll not available yet");
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
    for (const label of PAYROLL_ONLY) {
      await expect(page.getByRole("link", { name: label, exact: true })).toHaveCount(0);
    }

    // Reached directly, a payroll screen explains instead of failing.
    await page.goto("/payroll");
    await expect(page.getByText("Payroll isn't available for Kenya yet")).toBeVisible();
    await expect(page.getByText("Everything else works now, in KES")).toBeVisible();
    expect(await accessibilityViolations(page)).toEqual([]);
    await page.goto("/calculator");
    await expect(page.getByText("Payroll isn't available for Kenya yet")).toBeVisible();
  });

  test.describe("signed in", () => {
    test.use({ storageState: KENYA_STATE });

    test("Setup shows Kenya's currency and fields, and switches country before any history", async ({ page }) => {
      await page.goto("/setup");
      const summary = page.locator("main dl").first();
      await expect(summary).toContainText("Kenya (KE)");
      await expect(summary).toContainText("KES");
      await expect(summary).toContainText("Not available yet");
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
    for (const label of PAYROLL_ONLY) {
      await expect(page.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    const nigeria = page.getByRole("row", { name: /Nigeria/ });
    await expect(nigeria).toContainText("Active");
    await expect(nigeria).toContainText("Available");
    for (const name of DRAFTED) {
      const row = page.getByRole("row", { name: new RegExp(name) });
      await expect(row).toContainText("Draft");
      await expect(row).toContainText("Not yet");
    }
    expect(await accessibilityViolations(page)).toEqual([]);
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
