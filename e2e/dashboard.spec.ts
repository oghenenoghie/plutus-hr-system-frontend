import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { API_URL, storageStateFor } from "./support";

// The Overview dashboard and the app shell around it: the headline figures,
// workforce charts, activity, payroll status, compliance alerts and quick
// actions, all drawn from the real API; the top bar's search; and forms that
// open as centred modals rather than side drawers.

function failedApiCalls(page: Page): string[] {
  const failures: string[] = [];
  page.on("response", (response) => {
    if (response.url().startsWith(API_URL) && response.status() >= 400) {
      failures.push(`${response.status()} ${response.request().method()} ${response.url().replace(API_URL, "")}`);
    }
  });
  return failures;
}

test.describe("as an admin", () => {
  test.use({ storageState: storageStateFor("admin") });

  test("the dashboard shows every section without a failed request, and passes axe", async ({ page }) => {
    const failures = failedApiCalls(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: /^Welcome back/ })).toBeVisible();

    const headline = page.getByRole("region", { name: "Headline figures" });
    for (const label of ["Total employees", "Payroll cost", "Attendance rate", "Pending approvals"]) {
      await expect(headline.getByRole("region", { name: label })).toBeVisible();
    }
    for (const title of [
      "Workforce overview",
      "Department distribution",
      "Recent activity",
      "Payroll status",
      "Compliance alerts",
      "Financial position",
      "Quick actions",
    ]) {
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
    }
    // The workforce range switch changes which months are shown.
    await page.getByRole("button", { name: "12M" }).click();
    await expect(page.getByRole("button", { name: "12M" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "6M" })).toHaveAttribute("aria-pressed", "false");

    // The period picker re-asks the API for the headline figures.
    const overview = page.waitForResponse((response) => response.url().includes("/analytics/overview"));
    await page.getByLabel("Period for the headline figures").selectOption("this_year");
    expect((await overview).status()).toBe(200);
    await expect(headline.getByText("At the end of this year")).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect(failures).toEqual([]);
  });

  test("the top bar's search opens a page from the keyboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: /^Welcome back/ })).toBeVisible();
    await page.keyboard.press("Control+k");
    const search = page.getByRole("combobox", { name: "Search pages and employees" });
    await expect(search).toBeFocused();
    await search.fill("general led");
    await expect(page.getByRole("listbox", { name: "Search results" }).getByRole("option", { name: /General Ledger/ })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/general-ledger$/);
  });

  test("a create form opens as a centred modal and closes on Escape", async ({ page }) => {
    await page.goto("/departments");
    const opener = page.getByRole("button", { name: "New Department" });
    await opener.click();
    const dialog = page.getByRole("dialog", { name: "New Department" });
    await expect(dialog).toBeVisible();
    const box = (await dialog.boundingBox())!;
    const viewport = page.viewportSize()!;
    // Centred, not pinned to the right edge like the old drawer.
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(4);
    expect(box.height).toBeLessThan(viewport.height);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(opener).toBeFocused();
  });
});

test.describe("as an auditor", () => {
  test.use({ storageState: storageStateFor("auditor") });

  test("the dashboard only asks for what the role may see", async ({ page }) => {
    const failures = failedApiCalls(page);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1, name: /^Welcome back/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Compliance alerts", exact: true })).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(failures).toEqual([]);
  });
});
