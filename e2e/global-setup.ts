import { chromium, request, type FullConfig } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

import { API_URL, AUTH_DIR, storageStateFor, type Fixture, type Persona } from "./support";

// One organisation per run, with an admin, an auditor (read-only) and an HR
// manager (no inventory access), each signed in once through the real login
// page and saved as browser storage for the specs to reuse.
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:3000";
  const run = Date.now().toString(36);
  const password = "s3cret-pass-e2e";
  const emails: Record<Persona, string> = {
    admin: `e2e-admin-${run}@example.com`,
    auditor: `e2e-auditor-${run}@example.com`,
    hr: `e2e-hr-${run}@example.com`,
  };

  const http = await request.newContext();
  const signup = await http.post(`${API_URL}/organisation/signup`, {
    data: {
      org_name: `E2E Stores ${run}`,
      org_address: "12 Adeola Odeku Street, Victoria Island, Lagos",
      admin_email: emails.admin,
      admin_password: password,
    },
  });
  if (!signup.ok()) throw new Error(`sign-up failed: ${signup.status()} ${await signup.text()}`);
  const { org_id: orgId } = (await signup.json()) as { org_id: string };

  const login = await http.post(`${API_URL}/auth/login`, {
    data: { identifier: emails.admin, password },
  });
  if (!login.ok()) throw new Error(`admin login failed: ${login.status()} ${await login.text()}`);
  const { access_token: token } = (await login.json()) as { access_token: string };
  for (const [persona, role] of [
    ["auditor", "auditor"],
    ["hr", "hr_manager"],
  ] as const) {
    const created = await http.post(`${API_URL}/memberships`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { email: emails[persona], password, role },
    });
    if (!created.ok()) throw new Error(`creating the ${persona}: ${created.status()} ${await created.text()}`);
  }
  await http.dispose();

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const browser = await chromium.launch();
  for (const persona of ["admin", "auditor", "hr"] as const) {
    const page = await browser.newPage({ baseURL });
    await page.goto("/login");
    await page.fill("#identifier", emails[persona]);
    await page.fill("#password", password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));
    await page.context().storageState({ path: storageStateFor(persona) });
    await page.close();
  }
  await browser.close();

  const data: Fixture = { orgId, password, emails };
  fs.writeFileSync(path.join(AUTH_DIR, "fixture.json"), JSON.stringify(data, null, 2));
}
