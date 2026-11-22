import { gunzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";

type Captured = { event: string; properties: Record<string, unknown> };

// PostHog is intercepted: nothing from a test reaches the real project.
test("a visit sends a pageview with the project key", async ({ page }) => {
  const captured: Captured[] = [];
  await page.route(/^https:\/\/[^/]*\.posthog\.com\//, async (route) => {
    const request = route.request();
    const body = request.postDataBuffer();
    if (body && /\/(e|i\/v0\/e)\/?(\?|$)/.test(request.url())) {
      const text = (body[0] === 0x1f && body[1] === 0x8b ? gunzipSync(body) : body).toString();
      const parsed = JSON.parse(text);
      captured.push(...(Array.isArray(parsed) ? parsed : (parsed.batch ?? parsed.data ?? [parsed])));
    }
    const isScript = new URL(request.url()).pathname.endsWith(".js");
    await route.fulfill(
      isScript
        ? { status: 200, contentType: "application/javascript", body: "" }
        : { status: 200, contentType: "application/json", body: '{"autocapture_opt_out":false}' },
    );
  });

  await page.goto("/");
  await expect.poll(() => captured.map((c) => c.event), { timeout: 20_000 }).toContain("$pageview");
  const pageview = captured.find((c) => c.event === "$pageview")!;
  expect(String(pageview.properties.token)).toMatch(/^phc_/);
  expect(String(pageview.properties.$current_url)).toContain("/");
});
