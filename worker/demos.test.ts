/// <reference types="@cloudflare/vitest-plugin/types" />
/**
 * The four claims this Worker makes about D1 that only D1 can settle.
 *
 *   the budget counter is atomic         worker/budget.ts
 *   the ledger demo actually races       worker/demos/ledger-under-fire.ts
 *   the fencing token fences             worker/demos/split-brain.ts
 *   the expiry sweep sweeps              scheduled() in worker/index.ts
 *
 * Every one of them is a statement about what happens when two writes arrive at
 * once, or about rows that must be gone. None of them can be proved by a mock,
 * because a mock agrees with whatever it was written to agree with. So these run
 * concurrently against real local D1, through the real handlers.
 *
 * IPS ARE DISTINCT PER TEST ON PURPOSE. The edge rate limiter in wrangler.jsonc is
 * real here too, 6 run-starts a minute per IP, and it is keyed on the address in
 * cf-connecting-ip. Sharing one address across tests would make them refuse each
 * other and the failure would look like a bug in the demo.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { applyD1Migrations, createScheduledController } from "cloudflare:test";
import worker from "./index";
import { reserve } from "./budget";

declare global {
  namespace Cloudflare {
    interface Env {
      TEST_DEMO_MIGRATIONS: import("cloudflare:test").D1Migration[];
      TEST_WAREHOUSE_MIGRATIONS: import("cloudflare:test").D1Migration[];
    }
  }
}

beforeAll(async () => {
  await applyD1Migrations(env.DEMO_DB, env.TEST_DEMO_MIGRATIONS);
});

const BASE = "https://markkennethbadilla.com";

async function call<T>(method: string, path: string, ip: string, body?: unknown): Promise<T> {
  const res = await worker.fetch(
    new Request(`${BASE}${path}`, {
      method,
      headers: { "cf-connecting-ip": ip, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env
  );
  const text = await res.text();
  if (res.status >= 400) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  return JSON.parse(text) as T;
}

describe("budget reservations are atomic", () => {
  it("counts every one of 25 concurrent reserves", async () => {
    // THE BUG THIS REPLACES. Two KV counters read a number, added one, and wrote it
    // back, so a burst of concurrent invocations all read the same value and all
    // wrote the same increment. Ten requests counted as one. Reintroducing a
    // read-then-write here turns this test red, which is the only reason it exists.
    //
    // The "calls" pool is used because it is the one that skips the edge limiter -
    // see reserve() - so what is measured is the counter and not the limiter.
    const ip = "203.0.113.7";
    const burst = 25;

    const refusals = await Promise.all(
      Array.from({ length: burst }, () => reserve(env, "calls", ip, 1))
    );
    expect(refusals.every((r) => r === null)).toBe(true);

    const day = new Date().toISOString().slice(0, 10);
    const rows = await env.DEMO_DB.prepare(
      `SELECT key, n FROM budget_counters WHERE day = ?1 AND scope = 'calls' ORDER BY key`
    )
      .bind(day)
      .all<{ key: string; n: number }>();

    const byKey = new Map(rows.results.map((r) => [r.key, r.n]));
    expect(byKey.get(`ip:${ip}`)).toBe(burst);
    expect(byKey.get("pool")).toBe(burst);
  });
});

type LedgerState = {
  mode: string;
  genesisCents: number;
  totalCents: number;
  offByCents: number;
  balanced: boolean;
  accounts: { name: string; balanceCents: number }[];
  attempts: { accepted: boolean; rejected: boolean; errored: boolean }[];
};

async function fireLedgerRun(mode: "unsafe" | "safe", ip: string): Promise<LedgerState> {
  const started = await call<{ runId: string; transferCount: number }>(
    "POST",
    "/api/demos/ledger-under-fire/start",
    ip,
    { mode }
  );

  // Genuinely concurrent, which is the whole exhibit. Twelve requests at one
  // account, fired without awaiting each other.
  await Promise.all(
    Array.from({ length: started.transferCount }, (_, index) =>
      call("POST", "/api/demos/ledger-under-fire/transfer", ip, {
        runId: started.runId,
        idemKey: `${started.runId}-${index}`,
        mode,
        index,
      })
    )
  );

  return call<LedgerState>("GET", `/api/demos/ledger-under-fire/state?runId=${started.runId}`, ip);
}

describe("the ledger demo", () => {
  it("loses money on the unsafe path", async () => {
    const state = await fireLedgerRun("unsafe", "203.0.113.21");

    // The read-then-write gap: each request debits from the balance IT read, so
    // concurrent debits overwrite each other and the books stop adding up. If this
    // ever comes out balanced, the room is showing visitors a race that is not
    // happening.
    expect(state.balanced).toBe(false);
    expect(state.totalCents).not.toBe(state.genesisCents);
    expect(state.offByCents).not.toBe(0);
  });

  it("balances on the safe path, and refuses what it cannot fund", async () => {
    const state = await fireLedgerRun("safe", "203.0.113.22");

    expect(state.balanced).toBe(true);
    expect(state.totalCents).toBe(state.genesisCents);
    expect(state.offByCents).toBe(0);

    // 25,000 cents of operating balance at 4,000 a transfer funds exactly six. The
    // other six are refused by the UPDATE's own WHERE clause rather than by a
    // balance check in JavaScript, which is why the count is exact rather than
    // approximate.
    const accepted = state.attempts.filter((a) => a.accepted).length;
    expect(accepted).toBe(6);
    expect(state.attempts.filter((a) => a.errored).length).toBe(0);

    const operating = state.accounts.find((a) => a.name === "operating");
    const vendor = state.accounts.find((a) => a.name === "vendor");
    expect(operating?.balanceCents).toBe(25_000 - 6 * 4_000);
    expect(vendor?.balanceCents).toBe(5_000 + 6 * 4_000);
  });
});

type Tick = {
  lease: string;
  write: string;
  presentedToken: number;
  currentToken: number;
  holder: string | null;
};

describe("the fencing token", () => {
  it("refuses a stale write and accepts the current one", async () => {
    const ip = "203.0.113.31";
    const { runId, leaseMs } = await call<{ runId: string; leaseMs: number }>(
      "POST",
      "/api/demos/split-brain/start",
      ip
    );

    const tick = (node: string) => call<Tick>("POST", "/api/demos/split-brain/tick", ip, { runId, node });

    const first = await tick("a");
    expect(first.lease).toBe("acquired");
    expect(first.write).toBe("accepted");
    expect(first.presentedToken).toBe(1);

    // Cut a off, then let its term run out for real. The wait is wall-clock rather
    // than a poke at expires_at because the lease boundary is the thing under test,
    // and a test that moves the boundary itself is testing its own edit.
    await call("POST", "/api/demos/split-brain/partition", ip, { runId, node: "a", isolated: true });
    await new Promise((r) => setTimeout(r, leaseMs + 200));

    const takeover = await tick("b");
    expect(takeover.lease).toBe("acquired");
    expect(takeover.presentedToken).toBe(2);
    expect(takeover.write).toBe("accepted");

    // a comes back believing it still leads. Nothing corrects it, because nothing
    // could - that is what isolated meant. It writes anyway.
    await call("POST", "/api/demos/split-brain/partition", ip, { runId, node: "a", isolated: false });
    const stale = await tick("a");
    expect(stale.lease).toBe("refused");
    expect(stale.holder).toBe("b");
    expect(stale.presentedToken).toBe(1);
    expect(stale.currentToken).toBe(2);
    expect(stale.write).toBe("fenced");

    // THE GOOD HALF. The same code path with a current token lands, so the fence is
    // refusing staleness rather than refusing everything.
    const good = await tick("b");
    expect(good.presentedToken).toBe(2);
    expect(good.write).toBe("accepted");

    // And the store agrees. The protected table holds a's one legitimate unit and
    // b's two, and nothing carrying the stale term.
    const { results } = await env.DEMO_DB.prepare(
      `SELECT written_by, token FROM split_brain_work WHERE run_id = ?1 ORDER BY seq`
    )
      .bind(runId)
      .all<{ written_by: string; token: number }>();
    expect(results).toEqual([
      { written_by: "a", token: 1 },
      { written_by: "b", token: 2 },
      { written_by: "b", token: 2 },
    ]);
  });
});

describe("the expiry sweep", () => {
  it("deletes expired arenas and their children, and leaves live ones alone", async () => {
    const past = new Date(Date.now() - 60_000);
    const future = new Date(Date.now() + 60 * 60_000);

    // Ledger arenas store an ISO string, split-brain arenas store epoch
    // milliseconds. Two time formats in one sweep is exactly the kind of detail
    // that goes wrong silently, so both families are seeded here.
    await env.DEMO_DB.batch([
      env.DEMO_DB.prepare(
        `INSERT INTO ledger_race_arenas
           (run_id, mode, transfer_count, amount_cents, shard_size, genesis_cents, created_at, expires_at, reserved_rows)
         VALUES ('dead-ledger', 'safe', 1, 1, 1, 1, ?1, ?1, 1), ('live-ledger', 'safe', 1, 1, 1, 1, ?1, ?2, 1)`
      ).bind(past.toISOString(), future.toISOString()),
      env.DEMO_DB.prepare(
        `INSERT INTO ledger_race_accounts (run_id, name, balance_cents) VALUES ('dead-ledger', 'operating', 1), ('live-ledger', 'operating', 1)`
      ),
      env.DEMO_DB.prepare(
        `INSERT INTO ledger_race_entries (run_id, idem_key, attempt_nonce, amount_cents, booked_at)
         VALUES ('dead-ledger', 'k', 'n', 1, ?1), ('live-ledger', 'k', 'n', 1, ?1)`
      ).bind(past.toISOString()),
      env.DEMO_DB.prepare(
        `INSERT INTO ledger_race_shards (run_id, shard, phase, started_ms, wall_ms, accepted, rejected, errored)
         VALUES ('dead-ledger', 0, 'fire', 0, 0, 1, 0, 0), ('live-ledger', 0, 'fire', 0, 0, 1, 0, 0)`
      ),
      env.DEMO_DB.prepare(
        `INSERT INTO split_brain_arenas (run_id, lease_ms, created_at, expires_at, reserved_rows)
         VALUES ('dead-split', 4000, ?1, ?1, 1), ('live-split', 4000, ?1, ?2, 1)`
      ).bind(past.getTime(), future.getTime()),
      env.DEMO_DB.prepare(
        `INSERT INTO split_brain_leases (run_id, holder, expires_at, token) VALUES ('dead-split', 'a', ?1, 1), ('live-split', 'a', ?1, 1)`
      ).bind(past.getTime()),
      env.DEMO_DB.prepare(
        `INSERT INTO split_brain_nodes (run_id, node, isolated, believes_leader) VALUES ('dead-split', 'a', 0, 1), ('live-split', 'a', 0, 1)`
      ),
      env.DEMO_DB.prepare(
        `INSERT INTO split_brain_work (run_id, seq, written_by, token, at_ms) VALUES ('dead-split', 1, 'a', 1, ?1), ('live-split', 1, 'a', 1, ?1)`
      ).bind(past.getTime()),
      env.DEMO_DB.prepare(
        `INSERT INTO split_brain_events (run_id, at_ms, node, kind, token, detail)
         VALUES ('dead-split', ?1, 'a', 'acquired', 1, 'x'), ('live-split', ?1, 'a', 'acquired', 1, 'x')`
      ).bind(past.getTime()),
      // The cache expires by age rather than by arena, and worker/cache.ts writes
      // created_at with datetime('now'), so the sweep is asked in its own format.
      env.DEMO_DB.prepare(
        `INSERT INTO guide_cache (token_key, tokens, payload, created_at)
         VALUES ('stale', '[]', '{}', datetime('now', '-8 days')), ('fresh', '[]', '{}', datetime('now'))`
      ),
    ]);

    await worker.scheduled(createScheduledController({ cron: "0 * * * *" }), env);
    // Nothing here is deferred to waitUntil, so when scheduled() resolves the
    // deletes have already landed.

    // Scoped to the rows this test seeded. Storage is isolated per test FILE in the
    // 1.0 plugin, not per test, so the arenas the demos above created are still
    // sitting here - live, unexpired, and correctly untouched by the sweep.
    const survivors = async (table: string, column = "run_id") => {
      const { results } = await env.DEMO_DB.prepare(
        `SELECT DISTINCT ${column} AS id FROM ${table} WHERE ${column} LIKE 'dead-%' OR ${column} LIKE 'live-%' OR ${column} IN ('stale', 'fresh') ORDER BY id`
      ).all<{ id: string }>();
      return results.map((r) => r.id);
    };

    expect(await survivors("ledger_race_arenas")).toEqual(["live-ledger"]);
    expect(await survivors("ledger_race_accounts")).toEqual(["live-ledger"]);
    expect(await survivors("ledger_race_entries")).toEqual(["live-ledger"]);
    expect(await survivors("ledger_race_shards")).toEqual(["live-ledger"]);

    expect(await survivors("split_brain_arenas")).toEqual(["live-split"]);
    expect(await survivors("split_brain_leases")).toEqual(["live-split"]);
    expect(await survivors("split_brain_nodes")).toEqual(["live-split"]);
    expect(await survivors("split_brain_work")).toEqual(["live-split"]);
    expect(await survivors("split_brain_events")).toEqual(["live-split"]);

    expect(await survivors("guide_cache", "token_key")).toEqual(["fresh"]);
  });
});
