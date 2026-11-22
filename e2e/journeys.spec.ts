import { asVisitor, expect, test } from "./fixtures";

test.describe("first-time visitor on desktop", () => {
  test.use({ ...asVisitor("203.0.113.101"), viewport: { width: 1280, height: 800 } });

  test("home to a demo room run, then back to the gallery", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Split-Brain Sandbox/ }).first().click();
    await expect(page).toHaveURL(/\/demos\/split-brain\/?$/);
    await page.getByRole("button", { name: "Start the cluster" }).click();
    await expect(page.getByText("Store: current holder")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("link", { name: /Back to the gallery/ }).click();
    await expect(page).not.toHaveURL(/demos/);
  });
});

test.describe("mobile visitor", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("reads the resume page and the projects on it without sideways scroll", async ({ page }) => {
    await page.goto("/resume/");
    await expect(page.getByRole("heading", { level: 1, name: "Mark Kenneth Badilla" })).toBeVisible();
    const projects = page.getByRole("heading", { name: /^Projects/ });
    await projects.scrollIntoViewIfNeeded();
    await expect(projects).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });
});

test.describe("returning visitor", () => {
  test("the chosen theme is remembered on the next visit", async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.getByRole("button", { name: "Switch to dark mode" }).first().click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    const next = await context.newPage();
    await next.goto("/demos/split-brain/");
    await expect(next.locator("html")).toHaveClass(/dark/);
  });
});

test.describe("new device or cleared browser", () => {
  test("a fresh context opens a deep link and finds the way around", async ({ browser }) => {
    const context = await browser.newContext(asVisitor("203.0.113.103"));
    const page = await context.newPage();
    await page.goto("/demos/split-brain/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const rail = page.getByRole("navigation", { name: "Exhibition rooms" });
    await expect(rail.getByRole("link")).toHaveCount(3);
    await page.getByRole("link", { name: /Back to the gallery/ }).click();
    await expect(page).not.toHaveURL(/demos/);
    await context.close();
  });
});

test.describe("endpoint failure", () => {
  test("a rate-limited guide shows a message and the visitor can ask again", async ({ browser }) => {
    const context = await browser.newContext(asVisitor("203.0.113.104"));
    const page = await context.newPage();
    let calls = 0;
    await page.route("**/api/guide", (route) => {
      calls += 1;
      return calls === 1
        ? route.fulfill({ status: 429, contentType: "application/json", body: '{"error":"slow down"}' })
        : route.continue();
    });
    await page.goto("/");
    await page.getByLabel("Ask anything about his work").first().focus();
    const input = page.locator("#site-guide-question");
    await input.fill("[TEST] failure path");
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(page.getByText("slow down")).toBeVisible();
    await expect(input).toBeEnabled();
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(page.getByText("slow down")).toBeHidden({ timeout: 20_000 });
    await context.close();
  });

  test("a failing demo endpoint shows an alert and the gallery link still works", async ({ browser }) => {
    const context = await browser.newContext(asVisitor("203.0.113.105"));
    const page = await context.newPage();
    await page.route("**/api/demos/split-brain/**", (route) =>
      route.fulfill({ status: 500, contentType: "application/json", body: '{"error":"Split-Brain Sandbox failed: [TEST]"}' }),
    );
    await page.goto("/demos/split-brain/");
    await page.getByRole("button", { name: "Start the cluster" }).click();
    await expect(page.getByRole("alert").first()).toBeVisible({ timeout: 20_000 });
    await page.getByRole("link", { name: /Back to the gallery/ }).click();
    await expect(page).not.toHaveURL(/demos/);
    await context.close();
  });
});
