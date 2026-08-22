import { defineConfig, devices } from "@playwright/test";

/**
 * Browser smoke tests for the three exhibition rooms.
 *
 * WHY THE SERVER IS `next build` THEN `wrangler dev`, and not `next dev`.
 *
 * next.config.mjs sets output: "export", so the site is plain files with no
 * server runtime. Every demo button posts to /api/demos/..., and those paths
 * exist only in worker/index.ts. `next dev` would serve the pages and 404 every
 * API call, so all three rooms would fail and the suite would be a page-loads
 * check wearing a demo test's name. `next start` is not even available under a
 * static export.
 *
 * `wrangler dev` is what production is. It serves ./out through the ASSETS
 * binding and runs the Worker for /api/*, against a local miniflare D1 rather
 * than the real databases, so a run writes arena rows on this machine and
 * nowhere else. The two migration steps below build those local tables, which is
 * the difference between a fresh clone passing and a fresh clone failing with
 * "no such table".
 *
 * Chromium only. Three engines for a smoke test buys coverage of rendering
 * differences that nothing here asserts on.
 */

const PORT = 8788;

export default defineConfig({
  // Not the default ./tests, which already belongs to node --test.
  testDir: "./e2e",
  // One browser at a time. The rooms share one local D1 and one edge rate limiter,
  // so parallel workers would have the tests contending with each other rather
  // than with the thing under test.
  fullyParallel: false,
  workers: 1,
  // A retry re-fires a demo run, and a demo run is charged against the Worker's
  // own edge rate limiter. A flaky test that hides behind a retry is worse than
  // one that fails.
  retries: 0,
  reporter: "list",
  // The rooms declare up to 14 seconds of work and the first navigation pays for
  // a cold Worker isolate on top of that.
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // wrangler.js is spawned by path rather than through the npx shim, for the
    // reason scripts/cf.mjs already gives. Node on Windows will not spawn a .cmd
    // without a shell, and turning the shell on puts every argument through
    // cmd.exe quoting rules.
    //
    // If the build here ever fails with EBUSY on ./out, a wrangler dev from an
    // earlier run is still alive and holding the directory open. Kill it; the
    // build cannot replace a folder another process has open on Windows.
    command: `npm run build && node node_modules/wrangler/bin/wrangler.js d1 migrations apply DEMO_DB --local && node node_modules/wrangler/bin/wrangler.js d1 migrations apply WAREHOUSE_DB --local && node node_modules/wrangler/bin/wrangler.js dev --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    // Build, two migration runs and a Worker boot, all before the first test.
    // Around 25 seconds here with a warm Next cache and several times that
    // without one.
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
  },
});
