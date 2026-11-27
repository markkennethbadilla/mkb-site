import AxeBuilder from "@axe-core/playwright";

import { expect, ROUTES, test } from "./fixtures";

test("a browser navigation to /api/health reaches the Worker, not the static 404 page", async ({ page }) => {
  const response = await page.goto("/api/health");
  expect(response?.status()).toBe(200);
  expect(await response?.json()).toMatchObject({ ok: true });
});

test("the route list is complete", () => {
  expect(ROUTES).toContain("/");
  expect(ROUTES).toContain("/resume/");
  expect(ROUTES.length).toBeGreaterThanOrEqual(5);
});

for (const route of ROUTES) {
  test(`loads clean and passes axe ${route}`, async ({ page }) => {
    const faults: string[] = [];
    page.on("pageerror", (error) => faults.push(`uncaught: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") faults.push(`console: ${message.text()}`);
    });
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (url.origin === new URL(page.url()).origin && response.status() >= 400) {
        faults.push(`${response.status()} ${url.pathname}`);
      }
    });

    const response = await page.goto(route, { waitUntil: "load" });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeAttached();
    await page.evaluate(() => document.fonts.ready);

    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      .analyze();
    expect(
      axe.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`),
    ).toEqual([]);
    expect(faults).toEqual([]);
  });
}

test("an unknown address gets the 404 page, never a crash", async ({ page }) => {
  const response = await page.goto("/no-such-page/");
  expect(response?.status()).toBe(404);
});

test("the bot check warms on idle, before any click, so the first guide answer never waits on it", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await expect.poll(() => page.evaluate(() => Boolean((window as { __ts?: unknown }).__ts)), { timeout: 8000 }).toBe(true);
});
