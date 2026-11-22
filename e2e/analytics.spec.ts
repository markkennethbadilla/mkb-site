import { gunzipSync } from "node:zlib";
import type { Request } from "@playwright/test";
import { expect, test } from "./fixtures";

type Captured = { event: string; properties: Record<string, unknown> };

const events = (request: Request): Captured[] => {
  const body = request.postDataBuffer();
  if (!body || !/\/(e|i\/v0\/e)\/?(\?|$)/.test(request.url())) return [];
  let text = (body[0] === 0x1f && body[1] === 0x8b ? gunzipSync(body) : body).toString();
  if (text.startsWith("data=")) text = Buffer.from(decodeURIComponent(text.slice(5)), "base64").toString();
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : (parsed.batch ?? parsed.data ?? [parsed]);
};

// PostHog drops events from a HeadlessChrome user agent or navigator.webdriver, so this spec presents a normal visitor (UA, webdriver, userAgentData).
test.use({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" });

// The fixture answers PostHog; reading requests as they leave also sees sendBeacon posts routing can miss.
test("a visit sends a pageview with the project key", async ({ page }) => {
  const captured: Captured[] = [];
  page.on("request", (request) => captured.push(...events(request)));

  await page.addInitScript(() => { Object.defineProperty(navigator, "webdriver", { get: () => false }); Object.defineProperty(navigator, "userAgentData", { get: () => undefined }); });
  await page.goto("/");
  await expect.poll(() => captured.map((c) => c.event), { timeout: 20_000 }).toContain("$pageview");
  const pageview = captured.find((c) => c.event === "$pageview")!;
  expect(String(pageview.properties.token)).toMatch(/^phc_/);
  expect(String(pageview.properties.$current_url)).toContain("/");
});
