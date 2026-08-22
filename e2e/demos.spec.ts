import { expect, test as base, type Locator, type Page } from "@playwright/test";

/**
 * The site's whole argument is that the demos run when you press the button, so
 * the smoke test is that pressing the button produces a real result. Not that the
 * page renders. Not that the button exists.
 *
 * Every room here talks to the local Worker and the local D1 that
 * playwright.config.ts boots. Nothing touches production.
 */

/**
 * Every test in this file asserts a clean console, without asking for it.
 *
 * The Worker carries a segment-prefetch rewrite that exists only to stop Next's
 * prefetch payloads 404ing on every gallery load, and a fix like that is the kind
 * someone reverts while tidying the router. Nothing else would notice.
 *
 * Nothing is filtered. This started with an exemption for the resource-load line
 * Chromium writes for a non-ok response, on the assumption that ScoreAudit's
 * deliberate 503 refusal would trip it. Measured with the exemption removed, it
 * does not, because that line comes from the network log rather than the console
 * API and never reaches this event. A filter that suppresses nothing is a hole
 * left open for the next real error to walk through.
 */
const test = base.extend<{ cleanConsole: void }>({
  cleanConsole: [
    async ({ page }, use) => {
      const found: string[] = [];
      page.on("pageerror", (e) => found.push(`uncaught: ${e.message}`));
      page.on("console", (msg) => {
        if (msg.type() === "error") found.push(`console: ${msg.text()}`);
      });
      await use();
      expect(found).toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * Tabs until the control has focus, then leaves it focused for the caller to
 * press. Proves the control is in the tab order, which clicking it never does.
 */
async function tabTo(page: Page, target: Locator, maxTabs = 25): Promise<void> {
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error(`control was not reachable within ${maxTabs} tabs`);
}

/**
 * Each room gets its own simulated visitor address.
 *
 * worker/budget.ts runs a 6-per-minute edge limiter keyed on cf-connecting-ip,
 * and a run creation costs one. Sharing one key across the file would put the
 * suite two runs away from refusing itself, and a rerun inside the same minute
 * over the edge. Three keys is what three visitors would look like, which is what
 * the limiter is sized for. It changes no assertion.
 */
const asVisitor = (ip: string) => ({ extraHTTPHeaders: { "cf-connecting-ip": ip } });

test.describe("Ledger Under Fire", () => {
  test.use(asVisitor("203.0.113.11"));

  test("both paths reach a verdict, and the two verdicts differ", async ({ page }) => {
    await page.goto("/demos/ledger-under-fire/");

    // Keyboard rather than a click, on this room, because the run control is the
    // one thing on the page that has to work for a keyboard visitor.
    const fire = page.getByRole("button", { name: "Fire 12 concurrent payments" });
    await expect(fire).toBeVisible();
    await tabTo(page, fire);
    await page.keyboard.press("Enter");

    // role="status" is the accessibility work this room landed. Reading the
    // verdict through the role asserts both at once.
    const verdicts = page.getByRole("status");
    const unsafe = verdicts.nth(0);
    await expect(unsafe).toHaveText(/BALANCED|OFF BY/, { timeout: 45_000 });
    const unsafeText = (await unsafe.textContent())?.trim() ?? "";

    await page.getByRole("button", { name: "Now run the safe path" }).click();
    const safe = verdicts.nth(1);
    await expect(safe).toHaveText(/BALANCED|OFF BY/, { timeout: 45_000 });
    const safeText = (await safe.textContent())?.trim() ?? "";

    // The difference is the demo. It is asserted on the whole banner, not on the
    // BALANCED word, because the banner's second line carries the accepted and
    // refused counts and those are where the difference always shows.
    //
    // The headline word alone is not enough locally. The unsafe path has no funds
    // check, so it accepts all twelve; the safe path's conditional update refuses
    // the six that would overdraw. Whether the unsafe path ALSO loses an update
    // and prints OFF BY depends on two requests overlapping in the read-then-write
    // gap, and miniflare's D1 is fast enough locally that they often do not.
    expect(safeText).not.toEqual(unsafeText);
  });
});

test.describe("ScoreAudit", () => {
  test.use(asVisitor("203.0.113.12"));

  /**
   * The only room with two acceptable outcomes, and the reason is worth stating.
   *
   * This one calls a real inference endpoint. Locally there is no DEEPSEEK_API_KEY
   * (secrets live in the vault, and .dev.vars is banned here), so the Worker
   * answers 503 with "DEEPSEEK_API_KEY is not configured" and the room renders it
   * as a refusal. Against a key it can still be rate limited or budget refused.
   *
   * Asserting only on a completed audit would mean a test that fails on a machine
   * with no key and on any day the budget is spent, and a test that fails for
   * reasons unrelated to the code gets deleted rather than fixed. Then nothing
   * covers this room at all. So either outcome passes, and what fails is a hang or
   * an uncaught error, which are the two things that mean the room is broken.
   */
  test("the audit completes or says plainly that it was refused", async ({ page }) => {
    await page.goto("/demos/score-audit/");

    await page.getByRole("button", { name: "Ask the model, then check it" }).click();

    const completed = page.getByText("Calibration gap");
    const refused = page.getByRole("alert").filter({ hasText: "Refused" });
    await expect(completed.or(refused).first()).toBeVisible({ timeout: 60_000 });

    // A refusal has to name its cause. An empty alert box is the same dead end as
    // a hang, and this is the room that argues against unexplained output.
    if (await refused.isVisible()) {
      expect((await refused.textContent())?.trim().length ?? 0).toBeGreaterThan("Refused".length);
    }
  });
});

test.describe("Split-Brain Sandbox", () => {
  test.use(asVisitor("203.0.113.13"));

  test("one node takes the lease and the store records it", async ({ page }) => {
    await page.goto("/demos/split-brain/");

    await page.getByRole("button", { name: "Start the cluster" }).click();
    await expect(page.getByText("Store: current holder")).toBeVisible({ timeout: 45_000 });

    await page.getByRole("button", { name: "Elect a leader" }).click();

    // One lease, so exactly one node may believe it holds it. Three nodes racing
    // and two winners is the bug this room is named after.
    await expect(page.getByText("Believes it leads")).toHaveCount(1, { timeout: 45_000 });

    // And the claim reached the database rather than only the screen, because the
    // event log is built from rows the Worker wrote.
    await expect(page.getByText("acquired").first()).toBeVisible();
  });
});

test.describe("chrome that regresses invisibly", () => {
  test.use({ ...asVisitor("203.0.113.14"), viewport: { width: 375, height: 812 } });

  /**
   * Below md the rail shows a number and hides the room name, so the accessible
   * name comes entirely from an sr-only span. Delete that span and the page still
   * looks right at every width while the links announce themselves as "1", "2"
   * and "3". Nothing but this notices.
   */
  test("rail links keep their names at the narrow breakpoint", async ({ page }) => {
    await page.goto("/demos/split-brain/");

    const rail = page.getByRole("navigation", { name: "Exhibition rooms" });
    await expect(rail.getByRole("link")).toHaveCount(3);
    for (const name of ["Ledger Under Fire", "ScoreAudit", "Split-Brain Sandbox"]) {
      await expect(rail.getByRole("link", { name, exact: true })).toBeVisible();
    }
  });
});

test.describe("gallery", () => {
  test.use(asVisitor("203.0.113.15"));

  // No assertion of its own. The gallery is where the segment-prefetch rewrite is
  // exercised, and the cleanConsole fixture is the whole point of visiting.
  test("loads without filling the console", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Ledger Under Fire/ }).first().scrollIntoViewIfNeeded();
    await page.waitForLoadState("networkidle");
  });
});
