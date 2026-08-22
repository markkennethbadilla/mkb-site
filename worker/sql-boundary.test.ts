/// <reference types="@cloudflare/vitest-plugin/types" />
/**
 * The two things standing between a model-authored SELECT and every visitor's live
 * data, tested against real D1 rather than described.
 *
 *   1. The database split. WAREHOUSE_DB is the only binding the ScoreAudit room's
 *      query_db tool holds, and the arena tables are not in it.
 *   2. The guard's wrapper, which makes SQLite's own grammar refuse anything that
 *      is not a SELECT in that position.
 *
 * WHY THESE ARE HERE AND NOT IN tests/. The pure-function corpora already run under
 * node:test, and re-asserting guardSql()'s verdicts here would be the same check
 * paid for twice. What node:test cannot reach is the database. Every claim below is
 * a claim about what D1 does with a string, so every one of them executes a string.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import {
  ALLOWED_SQL,
  HOSTILE_SQL,
  MAX_ROWS,
  OUT_OF_SCOPE_SQL,
  guardSql,
} from "../src/lib/sql-guard";

declare global {
  namespace Cloudflare {
    interface Env {
      /** migrations/, the DEMO_DB set, read from disk by vitest.config.mts. */
      TEST_DEMO_MIGRATIONS: import("cloudflare:test").D1Migration[];
      /** migrations/warehouse/, the WAREHOUSE_DB set. */
      TEST_WAREHOUSE_MIGRATIONS: import("cloudflare:test").D1Migration[];
    }
  }
}

/** Live per-visitor data. None of it may exist in the database the model can reach. */
const FORBIDDEN_IN_WAREHOUSE = [/^ledger_race_/, /^split_brain_/, /^budget_counters$/, /^guide_cache$/];

async function tableNames(db: D1Database): Promise<string[]> {
  const { results } = await db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`)
    .all<{ name: string }>();
  return results.map((r) => r.name);
}

beforeAll(async () => {
  // Both databases get their own migration directory, exactly as wrangler.jsonc
  // routes them. Applying the real files is the point: a test that built the schema
  // from a hand-copied CREATE TABLE would keep passing after production drifted.
  await applyD1Migrations(env.WAREHOUSE_DB, env.TEST_WAREHOUSE_MIGRATIONS);
  await applyD1Migrations(env.DEMO_DB, env.TEST_DEMO_MIGRATIONS);
});

describe("the two-database boundary", () => {
  it("keeps every live-visitor table out of WAREHOUSE_DB", async () => {
    const names = await tableNames(env.WAREHOUSE_DB);

    // Guards the guard. An empty database would satisfy every assertion below
    // while proving nothing, so first prove this is the real warehouse.
    expect(names).toContain("customers");
    expect(names).toContain("invoices");
    expect(names).toContain("payments");

    const leaked = names.filter((n) => FORBIDDEN_IN_WAREHOUSE.some((p) => p.test(n)));
    expect(leaked).toEqual([]);
  });

  it("keeps the live-visitor tables in DEMO_DB, where no model-authored SQL reaches", async () => {
    const names = await tableNames(env.DEMO_DB);
    for (const pattern of FORBIDDEN_IN_WAREHOUSE) {
      expect(names.some((n) => pattern.test(n))).toBe(true);
    }
    // And the warehouse is not duplicated here. The two directories describe two
    // databases; a migration filed in the wrong one shows up as this going red.
    expect(names).not.toContain("customers");
  });

  it("answers the auditor's bypass with 'no such table', not with a rule", async () => {
    // The statement that returned every live demo run on the site before the split.
    // The guard allows it and always did; quoting the name walked past the banned
    // list it used to be checked against. What refuses it now is the binding.
    const verdict = guardSql('SELECT * FROM "ledger_race_accounts"');
    expect(verdict.ok).toBe(true);
    if (!verdict.ok) return;

    await expect(env.WAREHOUSE_DB.prepare(verdict.sql).all()).rejects.toThrow(/no such table/i);

    // The same string against the database the arena tables DO live in. This half
    // is what makes the test worth having: it fails if the boundary ever holds only
    // because the reference crashed or the table was renamed, rather than because
    // query_db is pointed at the warehouse.
    const inDemoDb = await env.DEMO_DB.prepare(verdict.sql).all();
    expect(inDemoDb.success).toBe(true);
  });
});

describe("the guard's wrapper, executed", () => {
  it("refuses every hostile statement before D1 sees it", () => {
    for (const c of HOSTILE_SQL) {
      const verdict = guardSql(c.sql);
      expect(verdict.ok, c.label).toBe(false);
      if (!verdict.ok) expect(verdict.rule, c.label).toBe(c.rule);
    }
  });

  it("is the wrapper and not the rules that D1 enforces", async () => {
    // The header of sql-guard.ts claims the two cheap rules are not load-bearing
    // and the frame is. That is testable: force each hostile statement into the
    // frame anyway, as if the rules had been deleted, and ask D1.
    //
    // "Oversized statement" is the one exception and it is left out on purpose. It
    // is a valid SELECT of a long literal, so the frame accepts it happily and the
    // length rule really is the only thing refusing it. Pretending otherwise would
    // overstate what the wrapper does.
    const framed = HOSTILE_SQL.filter((c) => c.rule !== "too-long");
    expect(framed.length).toBe(HOSTILE_SQL.length - 1);

    for (const c of framed) {
      const sql = `SELECT * FROM (\n${c.sql}\n) LIMIT ${MAX_ROWS}`;
      await expect(env.WAREHOUSE_DB.prepare(sql).all(), c.label).rejects.toThrow();
    }
  });

  it("runs every allowed statement against the real warehouse", async () => {
    for (const c of ALLOWED_SQL) {
      const verdict = guardSql(c.sql);
      expect(verdict.ok, c.label).toBe(true);
      if (!verdict.ok) continue;
      const { results, success } = await env.WAREHOUSE_DB.prepare(verdict.sql).all();
      expect(success, c.label).toBe(true);
      expect(Array.isArray(results), c.label).toBe(true);
    }

    // A guard that accepts a statement D1 then answers with nothing is a guard that
    // has quietly broken the room. The three-table join is the one that would show
    // it, so it is asserted on rows rather than on not throwing.
    const join = guardSql(ALLOWED_SQL.find((c) => c.label === "Three-table join")!.sql);
    expect(join.ok).toBe(true);
    if (!join.ok) return;
    const { results } = await env.WAREHOUSE_DB.prepare(join.sql).all();
    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(MAX_ROWS);
  });

  it("hands the out-of-scope corpus to the layer each entry names", async () => {
    // This corpus is a division of labour written down as prose, and prose rots.
    // Six of these are the auditor's bypasses, allowed by the guard on purpose
    // because something below it stops them. Here is that something, executing.
    //
    // The unbounded recursive CTE is checked at the guard only. What stops it in
    // production is D1's CPU ceiling, roughly 39 seconds in; local miniflare has no
    // such ceiling, so running it here would hang the suite rather than test it.
    for (const c of OUT_OF_SCOPE_SQL) {
      const verdict = guardSql(c.sql);
      expect(verdict.ok, c.label).toBe(true);
      if (!verdict.ok) continue;
      if (c.label === "Unbounded recursive CTE") continue;

      const run = env.WAREHOUSE_DB.prepare(verdict.sql).all();
      if (c.refusedByDatabase) {
        await expect(run, c.label).rejects.toThrow();
      } else {
        await expect(run, c.label).resolves.toBeDefined();
      }
    }
  });
});
