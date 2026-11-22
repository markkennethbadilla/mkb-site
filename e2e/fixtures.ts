import { globSync } from "node:fs";

import { type BrowserContext, test as base } from "@playwright/test";

export { expect } from "@playwright/test";

const CORS = { "access-control-allow-origin": "*", "access-control-allow-credentials": "true" };

/** PostHog and Turnstile answered locally: nothing reaches the real project, and the Worker's test secret passes any token. */
const stubVendors = async (ctx: BrowserContext) => {
  await ctx.route(/^https:\/\/[^/]*\.posthog\.com\//, (route) =>
    route.fulfill(
      new URL(route.request().url()).pathname.endsWith(".js")
        ? { status: 200, contentType: "application/javascript", body: "", headers: CORS }
        : { status: 200, contentType: "application/json", body: "{}", headers: CORS },
    ),
  );
  await ctx.route(/^https:\/\/challenges\.cloudflare\.com\/turnstile\//, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "window.turnstile={render:(el,o)=>{window.__ts=o;return 'x'},execute:()=>setTimeout(()=>window.__ts.callback('XXXX.DUMMY.TOKEN')),reset:()=>{}};",
    }),
  );
};

/** Every test, and every context a spec opens itself with browser.newContext(). */
export const test = base.extend<{ stubVendors: void }>({
  stubVendors: [
    async ({ browser, context }, use) => {
      await stubVendors(context);
      const open = browser.newContext.bind(browser);
      browser.newContext = async (options) => {
        const ctx = await open(options);
        await stubVendors(ctx);
        return ctx;
      };
      await use();
      browser.newContext = open;
    },
    { auto: true },
  ],
});

/** Turnstile's own sandboxed iframe logs errors on every solve; they are the vendor's, not the site's. */
export const fromSite = (url: string | undefined) => !url?.startsWith("https://challenges.cloudflare.com/");

// /resume/ is written by scripts/build-resume.mjs, not by a page.tsx.
export const ROUTES = [
  ...globSync("src/app/**/page.tsx")
    .map((file) => file.replaceAll("\\", "/").slice("src/app".length, -"page.tsx".length))
    .map((route) => route.replace(/\([^)]+\)\//g, ""))
    .filter((route) => !route.includes("[")),
  "/resume/",
].sort();

/** Each test is a distinct visitor to the edge rate limiter (worker/budget.ts keys on cf-connecting-ip). */
// The run id keeps reruns on the persisted local D1 from sharing one visitor's daily budget.
const RUN = Date.now().toString(36);
export const visitor = (ip: string) => (ip.endsWith(`-${RUN}`) ? ip : `${ip}-${RUN}`);
export const asVisitor = (ip: string) => ({ extraHTTPHeaders: { "cf-connecting-ip": visitor(ip) } });
