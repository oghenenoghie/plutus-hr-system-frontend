import { expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

export const API_URL = process.env.E2E_API_URL ?? "http://localhost:8000/api/v1";
export const AUTH_DIR = path.join(__dirname, ".auth");

export type Persona = "admin" | "auditor" | "hr";

export interface Fixture {
  orgId: string;
  password: string;
  emails: Record<Persona, string>;
}

export function storageStateFor(persona: Persona): string {
  return path.join(AUTH_DIR, `${persona}.json`);
}

// The access token a persona's saved sign-in holds.
export function savedToken(persona: Persona): string {
  const state = JSON.parse(fs.readFileSync(storageStateFor(persona), "utf8")) as {
    origins: { localStorage: { name: string; value: string }[] }[];
  };
  for (const origin of state.origins) {
    const entry = origin.localStorage.find((item) => item.name === "plutus.access_token");
    if (entry) return entry.value;
  }
  throw new Error(`no saved sign-in for ${persona}`);
}

export function fixture(): Fixture {
  return JSON.parse(fs.readFileSync(path.join(AUTH_DIR, "fixture.json"), "utf8")) as Fixture;
}

// Calendar dates in Lagos (UTC+1, no daylight saving), as the API dates documents.
export function lagosDate(offsetDays = 0): string {
  return new Date(Date.now() + 60 * 60 * 1000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

export async function accessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => window.localStorage.getItem("plutus.access_token"));
  if (!token) throw new Error("not signed in");
  return token;
}

// A thin JSON client for arranging data the workflow under test doesn't cover.
export function api(request: APIRequestContext, token: string) {
  return async function call<T = unknown>(method: string, route: string, data?: unknown): Promise<T> {
    const response = await request.fetch(`${API_URL}${route}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      data,
    });
    if (!response.ok()) throw new Error(`${method} ${route}: ${response.status()} ${await response.text()}`);
    return (response.status() === 204 ? null : await response.json()) as T;
  };
}

// The toast a successful (or refused) action shows.
export async function toast(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.getByText(text).first()).toBeVisible();
}

export function dialogButton(page: Page, name: string): Locator {
  return page.getByRole("dialog").getByRole("button", { name, exact: true });
}

// A document's status badge in the main content.
export function statusBadge(page: Page, text: string): Locator {
  return page.locator("main").getByText(text, { exact: true }).first();
}
