/**
 * The bound that stops one page taking the whole site down for a day.
 *
 * Cloudflare Workers Free is 100,000 requests per day for the ENTIRE Worker,
 * resetting at midnight UTC. Every /api/* route draws from that one number, so a
 * demo firing a fan-out per click spends the site guide's budget as well as its
 * own, and when it runs out the guide stops answering until tomorrow. That is
 * structural rather than any one demo's fault, so it is solved once here.
 *
 *   1. SEPARATE POOLS. Guide and demos count against different rows. Demos cannot
 *      consume the guide's allocation because they never touch its row. Exhausting
 *      the demo pool degrades demos and leaves the centrepiece working, which is
 *      the correct thing to sacrifice first.
 *   2. A PER-IP DAILY CAP, so one visitor cannot spend the shared pool.
 *   3. AN EDGE LIMITER, the only control enforced BEFORE a request is billed,
 *      which makes it the one that actually stops a loop rather than counting it.
 *
 * COUNTERS LIVE IN D1, NOT KV, AND THAT IS A CORRECTION.
 *
 * The first version used KV and was wrong twice over. Workers KV Free allows
 * 1,000 WRITES per day; this function did two writes per request while declaring
 * pools of 12,000 and 20,000 - 64,000 writes against a 1,000 allowance. Past that
 * point put() stops succeeding, every counter freezes at its last value, and the
 * budget silently stops budgeting. Guide and demos shared one namespace, so the
 * mechanism built to protect the centrepiece would have been what took it down.
 *
 * KV was also the wrong shape for a counter. Reading a value, adding one, and
 * writing it back means several concurrent invocations all read the same number
 * and all write the same increment, so a burst of ten can count as one. That is a
 * lost update - precisely the bug the ledger demo exists to demonstrate, sitting
 * in the code that guards it.
 *
 * D1 answers both: 100,000 writes a day, and `INSERT ... ON CONFLICT DO UPDATE SET
 * n = n + 1 RETURNING n` is one atomic statement that hands back the value it just
 * produced. Nothing is read and written separately, so nothing can be lost.
 *
 * Counting happens BEFORE the check, so a refused request still increments. That
 * over-counts a visitor who is already being refused, which is the safe direction:
 * the alternative is a check-then-increment gap, and that gap is the whole bug.
 */

export type Pool = "guide" | "demo";

/**
 * Daily request allocations, sized against the real ceiling rather than a round
 * number that felt generous.
 *
 * The binding constraint is D1 writes, not Workers requests. Each reserve costs
 * two rows written (the visitor's counter and the pool's), so these totals imply
 * (5,000 + 10,000) x 2 = 30,000 writes a day. D1 Free allows 100,000, and the
 * ledger demo writes its own arena rows on top, so this leaves roughly two thirds
 * of the allowance for the demos' actual work.
 *
 * The previous numbers - 12,000 and 20,000 - were written against KV without
 * checking KV's write ceiling, which is 1,000 a day. They implied 64 times the
 * available budget.
 */
const DAILY_LIMIT: Record<Pool, number> = {
  guide: 5_000,
  demo: 10_000,
};

/** One visitor's share, per pool, per day. */
const DAILY_PER_IP: Record<Pool, number> = {
  guide: 200,
  demo: 400,
};

/** KV keys carry the UTC day so they expire naturally with the platform's reset. */
const today = () => new Date().toISOString().slice(0, 10);

export type BudgetRefusal = {
  reason: "burst" | "ip-daily-cap" | "pool-exhausted";
  /** Names the actual cause, for the response body. Never a bare failure. */
  detail: string;
};

export interface BudgetEnv {
  DEMO_DB?: D1Database;
  /** 6 req/60s per IP. Right for the guide and for starting a demo run. */
  BURST_LIMITER?: { limit: (o: { key: string }) => Promise<{ success: boolean }> };
  /** 60/60s, for the shards of one already-authorised run. */
  DEMO_LIMITER?: { limit: (o: { key: string }) => Promise<{ success: boolean }> };
}

/**
 * Reserves `cost` requests from a pool, or explains why it will not.
 *
 * `burstKey` is what the edge limiter counts. For the guide that is the IP. For a
 * demo fan-out it should be the RUN id, not the IP: a run has a known finite
 * number of shards, so keying on it refuses a flood while never refusing the
 * legitimate burst that a single click produces.
 */
export async function reserve(
  env: BudgetEnv,
  pool: Pool,
  ip: string,
  cost = 1,
  burstKey?: string
): Promise<BudgetRefusal | null> {
  const limiter = pool === "demo" ? env.DEMO_LIMITER : env.BURST_LIMITER;
  if (limiter) {
    const { success } = await limiter.limit({ key: burstKey ?? ip });
    if (!success) {
      return {
        reason: "burst",
        detail:
          pool === "demo"
            ? "Too many requests from this run in the last minute. Give it a few seconds."
            : "That was a lot of questions at once. Give it a few seconds and ask again.",
      };
    }
  }

  // No database in local dev means no accounting. Refusing every request when the
  // binding is absent would make `wrangler dev` useless; the edge limiter above is
  // still in force, and production always has D1.
  if (!env.DEMO_DB) return null;

  const day = today();

  // One statement per counter, each atomic, both in a single round trip. The
  // RETURNING clause hands back the post-increment value, so there is no separate
  // read to go stale between checking and writing.
  const bump = (key: string) =>
    env.DEMO_DB!.prepare(
      `INSERT INTO budget_counters (day, scope, key, n) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT (day, scope, key) DO UPDATE SET n = n + ?4
       RETURNING n`
    ).bind(day, pool, key, cost);

  let ipSpent = 0;
  let poolSpent = 0;
  try {
    const [ipRow, poolRow] = await env.DEMO_DB.batch<{ n: number }>([
      bump(`ip:${ip}`),
      bump("pool"),
    ]);
    ipSpent = ipRow.results?.[0]?.n ?? 0;
    poolSpent = poolRow.results?.[0]?.n ?? 0;
  } catch (e) {
    // Naming the cause matters more here than anywhere: a budget that fails open
    // silently is indistinguishable from one that is working.
    return {
      reason: "pool-exhausted",
      detail: `The request budget could not be read (${String(e).slice(0, 80)}), so this is being refused rather than run unaccounted.`,
    };
  }

  if (ipSpent > DAILY_PER_IP[pool]) {
    return {
      reason: "ip-daily-cap",
      detail: `You have used your share of today's ${pool} budget on this site. It resets at midnight UTC.`,
    };
  }

  if (poolSpent > DAILY_LIMIT[pool]) {
    return {
      reason: "pool-exhausted",
      detail:
        pool === "demo"
          ? "The demos have used today's request budget. They are back at midnight UTC. Everything else on the site still works, which is the point of budgeting them separately."
          : "The guide has used today's request budget. It is back at midnight UTC.",
    };
  }

  return null;
}

/** Current spend, for a status endpoint. Read-only, never reserves. */
export async function budgetStatus(env: BudgetEnv): Promise<Record<string, number>> {
  const base = {
    guideSpent: 0,
    guideLimit: DAILY_LIMIT.guide,
    demoSpent: 0,
    demoLimit: DAILY_LIMIT.demo,
  };
  if (!env.DEMO_DB) return base;

  try {
    const { results } = await env.DEMO_DB.prepare(
      `SELECT scope, n FROM budget_counters WHERE day = ?1 AND key = 'pool'`
    )
      .bind(today())
      .all<{ scope: string; n: number }>();
    for (const r of results ?? []) {
      if (r.scope === "guide") base.guideSpent = r.n;
      if (r.scope === "demo") base.demoSpent = r.n;
    }
  } catch {
    // A status read that fails is not worth failing a request over; the numbers
    // simply read zero and the endpoint stays up.
  }
  return base;
}
