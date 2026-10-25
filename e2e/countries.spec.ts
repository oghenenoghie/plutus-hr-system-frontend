import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { API_URL, savedToken, storageStateFor } from "./support";

// An organisation's country, through the real screens and the API: sign-up
// offers only countries whose rules are approved, Setup shows the country and
// currency and won't switch to an unapproved one, the catalogue shows each
// country's readiness, and the server refuses what the screens don't offer.
// Only Nigeria is active; the other five are drafts awaiting review.

const DRAFTED = ["The Gambia", "Rwanda", "Kenya", "Ghana", "Côte d'Ivoire"];

async function accessibilityViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations.map(
    (v) => `[${v.impact}] ${v.id}: ${v.help} (e.g. ${v.nodes[0]?.target.join(" ") ?? ""})`,
  );
}

test.describe("signing up", () => {
  test("offers Nigeria and shows the drafted countries as not available yet", async ({ page }) => {
    await page.goto("/signup");
    const country = page.getByLabel("Country");
    await expect(country).toHaveValue("NG");
    await expect(country.locator('option[value="NG"]')).toBeEnabled();
    for (const name of DRAFTED) {
      const option = country.locator("option", { hasText: name });
      await expect(option).toBeDisabled();
      await expect(option).toContainText("not available yet: draft");
    }
    expect(await accessibilityViolations(page)).toEqual([]);
  });
});

test.describe("as an admin", () => {
  test.use({ storageState: storageStateFor("admin") });

  test("Setup shows the country and currency, and only an approved country can be chosen", async ({ page }) => {
    await page.goto("/setup");
    // The country summary is the page's first description list.
    const summary = page.locator("main dl").first();
    await expect(summary).toContainText("Nigeria (NG)");
    await expect(summary).toContainText("NGN");
    await expect(summary.getByText("Active", { exact: true })).toBeVisible();

    const select = page.getByLabel("Change to");
    await expect(select).toHaveValue("NG");
    await expect(select.locator("option", { hasText: "Kenya" })).toBeDisabled();
    // Nothing else is approved, so there is nothing to change to.
    await expect(page.getByRole("button", { name: "Change country" })).toBeDisabled();
    // Nigeria's own settings stay.
    await expect(page.getByText("States of operation")).toBeVisible();

    expect(await accessibilityViolations(page)).toEqual([]);
  });

  test("the catalogue shows the five drafts as not choosable", async ({ page }) => {
    await page.goto("/compliance/countries");
    const nigeria = page.getByRole("row", { name: /Nigeria/ });
    await expect(nigeria).toContainText("Active");
    await expect(nigeria).toContainText("Yes");
    for (const name of DRAFTED) {
      const row = page.getByRole("row", { name: new RegExp(name) });
      await expect(row).toContainText("Draft");
      await expect(row).toContainText("Not yet");
    }
    expect(await accessibilityViolations(page)).toEqual([]);
  });

  test("the API refuses a country whose rules aren't approved", async ({ request }) => {
    const headers = { Authorization: `Bearer ${savedToken("admin")}` };
    const refused = await request.put(`${API_URL}/organisation`, {
      headers,
      data: { country_code: "KE" },
    });
    expect(refused.status()).toBe(422);
    expect((await refused.json()).detail).toContain("Kenya isn't available yet");

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
      data: { country_code: "NG" },
    });
    expect(changed.status()).toBe(403);
  });
});
