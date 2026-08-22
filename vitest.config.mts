/**
 * The Worker's tests, run inside workerd rather than against a mock of it.
 *
 * WHY A SECOND TEST RUNNER EXISTS AT ALL. `node --test tests/**` already covers
 * every pure function in this repo and it is the cheaper runner, so anything that
 * can be proved there stays there. What it cannot do is prove a claim about D1,
 * and most of the claims in worker/ are claims about D1: that a counter is atomic,
 * that a WHERE clause fences a stale write, that a wrapper makes SQLite's own
 * grammar refuse a DELETE. Asserting those against a fake database proves the fake
 * agrees with itself. So these run in the real runtime against real local D1.
 *
 * package.json's `test:worker` is `vitest run --dir worker`, which is why the test
 * files sit next to the code they test rather than in tests/. The two runners never
 * see each other's files.
 *
 * THE API HERE IS THE 1.0 ONE, and it is worth saying so because every example
 * online is the old one. @cloudflare/vitest-pool-workers became
 * @cloudflare/vitest-plugin, `defineWorkersConfig` is gone in favour of the
 * cloudflareTest() Vite plugin below, and storage isolation is now per test file
 * rather than per test. That last one is why each test in a file mints its own run
 * id instead of trusting a rollback between cases.
 */
import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import path from "node:path";

export default defineConfig({
  test: {
    // Scoped here rather than only in package.json's `--dir worker`, because bare
    // `npx vitest run` would otherwise collect tests/*.test.mjs and e2e/*.spec.ts -
    // one of which belongs to node:test and the other to Playwright. Both would
    // fail, and a runner that fails when invoked the obvious way is a runner people
    // stop invoking.
    dir: "worker",
  },
  plugins: [
    cloudflareTest(async () => ({
      // Bindings, compatibility flags and both database definitions come from the
      // deployed config rather than a copy. A test fixture that lists bindings by
      // hand drifts from production silently, and the two-database split these
      // tests exist to defend is declared in exactly one place.
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          // The REAL migrations, read from disk and handed to the test worker, so
          // applyD1Migrations() builds the schema production runs on. Each list is
          // read from the directory its own database declares in wrangler.jsonc,
          // which is the boundary under test - a migration filed in the wrong
          // directory has to show up here as a failure, not as a passing test
          // against a schema someone typed out.
          TEST_DEMO_MIGRATIONS: await readD1Migrations(path.resolve("migrations")),
          TEST_WAREHOUSE_MIGRATIONS: await readD1Migrations(path.resolve("migrations/warehouse")),
        },
      },
    })),
  ],
});
