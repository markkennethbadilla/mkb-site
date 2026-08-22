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
 *
 * THE MIGRATION WAS HALF DONE FOR MONTHS, WHICH IS WORSE THAN NOT DOING IT. This
 * file was written and two callers were never moved to it. /api/agent kept its own
 * KV day counter, and the guide reserved here and then incremented a second KV
 * counter for model calls on the very next line. Both were still the lost update
 * described above, sitting behind a file whose comments said it had been fixed.
 * Every counter is now a row in this table, and the KV namespace holds only the
 * model-discovery list, which is written about once an hour.
 */

/**
 * Two of these count Worker requests. "calls" counts model calls, which is a
 * different scarce thing measured in the same table.
 *
 * A question can spend several model calls, so counting requests alone would let
 * a handful of clicks drain the day's inference. It was a second KV counter until
 * it moved here, which made it the last surviving copy of the read-then-write bug
 * described above - one counter atomic in D1, one still losing updates in KV.
 * Nothing about "model calls are a separate ceiling" required a separate store.
 */
export type Pool = "guide" | "demo" | "calls";

/**
 * Daily allocations, sized against the real ceiling rather than a round number
 * that felt generous.
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
 *
 * `calls` is 300 because the guide runs on a metered key at roughly 5k tokens a
 * call. The cache absorbs repeats, so this bounds genuinely distinct questions a
 * day, and the key's own spending cap is the backstop underneath it.
 */
const DAILY_LIMIT: Record<Pool, number> = {
  guide: 5_000,
  demo: 10_000,
  calls: 300,
};

/** One visitor's share, per pool, per day. */
const DAILY_PER_IP: Record<Pool, number> = {
  guide: 200,
  demo: 400,
  // A third of the day's inference is as much as one visitor gets. The KV counter
  // this replaced had no per-visitor dimension at all, so one loop could take the
  // whole day's model calls and the guide would tell everyone else it was out.
  calls: 100,
};

/** What a pool is a ceiling ON, for the message a visitor reads. */
const POOL_LABEL: Record<Pool, string> = {
  guide: "guide",
  demo: "demo",
  calls: "inference",
};

const POOL_EXHAUSTED: Record<Pool, string> = {
  guide: "The guide has used today's request budget. It is back at midnight UTC.",
  demo: "The demos have used today's request budget. They are back at midnight UTC. Everything else on the site still works, which is the point of budgeting them separately.",
  calls: "The site has used today's inference budget. The guide is back at midnight UTC, and everything written on the page is still here to read.",
};

/** Every counter row is keyed by UTC day, matching the platform's own reset, so
 *  yesterday's numbers are never read and a new day starts at nothing. */
const today = () => new Date().toISOString().slice(0, 10);

export type BudgetRefusal = {
  reason: "burst" | "ip-daily-cap" | "pool-exhausted";
  /** Names the actual cause, for the response body. Never a bare failure. */
  detail: string;
};

/**
 * The bindings, straight from wrangler.jsonc via `wrangler types`.
 *
 * This was a hand-written interface listing the three bindings this file happens
 * to use, and there were four such interfaces across the Worker. They had already
 * drifted apart, which is what the casts between them existed to paper over.
 * There is one Env now and a generator maintains it.
 */
export type BudgetEnv = Env;

/**
 * Reserves `cost` requests from a pool, or explains why it will not.
 *
 * ONE RESERVE PER RUN, NOT PER REQUEST. A demo run is a fan-out - a dozen or more
 * concurrent requests from one click - and charging each of them separately would
 * mean a dozen limiter hits and two dozen counter writes for a single visitor
 * action. Worse, the shards race each other through the counter. So the run's
 * whole cost is reserved once, up front, at the endpoint that creates the run; the
 * shards that follow reserve nothing and are bounded by limitRun() instead.
 *
 * THE LIMITER IS ALWAYS IP-KEYED HERE, and that is a correction. An earlier
 * version keyed the demo pool's limiter on the run id, on the reasoning that a run
 * has a known finite number of shards. That reasoning is sound for shards and
 * useless for creation: a run id is minted fresh per run, so anyone starting runs
 * in a loop mints a new key every time and is never limited. The only thing that
 * identifies a repeat caller at creation time is the IP, so that is what the edge
 * limiter counts.
 */
export async function reserve(
  env: BudgetEnv,
  pool: Pool,
  ip: string,
  cost = 1,
  burstKey?: string
): Promise<BudgetRefusal | null> {
  // The edge limiter bounds REQUESTS, and "calls" is not one - it is counted
  // inside a request that has already passed the limiter. Running it again there
  // would charge one visitor twice against an allowance of six a minute, which is
  // how the guide quietly became three questions a minute.
  if (env.BURST_LIMITER && pool !== "calls") {
    const { success } = await env.BURST_LIMITER.limit({ key: burstKey ?? ip });
    if (!success) {
      return {
        reason: "burst",
        detail:
          pool === "demo"
            ? "You have started several demo runs in the last minute. Give it a few seconds."
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
      detail: `You have used your share of today's ${POOL_LABEL[pool]} budget on this site. It resets at midnight UTC.`,
    };
  }

  if (poolSpent > DAILY_LIMIT[pool]) {
    return { reason: "pool-exhausted", detail: POOL_EXHAUSTED[pool] };
  }

  return null;
}

/**
 * Bounds the shards of a run that has ALREADY been paid for.
 *
 * Keyed on the run id rather than the IP, which is correct here and wrong at
 * creation. A run's fan-out is a legitimate burst of known size from one click, so
 * an IP-keyed limiter would refuse the very thing the room exists to do. The run id
 * cannot be used to escape the limit, because getting one costs a reserve() that
 * IS IP-keyed and has already charged the run's full cost.
 *
 * No counter write. The run was charged once; counting its shards again would
 * double-bill the pool and, at a dozen shards a click, is also how a free tier's
 * write allowance disappears.
 */
export async function limitRun(env: BudgetEnv, runId: string): Promise<BudgetRefusal | null> {
  if (!env.DEMO_LIMITER) return null;
  const { success } = await env.DEMO_LIMITER.limit({ key: runId });
  if (success) return null;
  return {
    reason: "burst",
    detail: "This run has sent more requests in a minute than a run is allowed. It has been stopped rather than left to spend the shared budget.",
  };
}

/** Current spend, for a status endpoint. Read-only, never reserves. */
export async function budgetStatus(env: BudgetEnv): Promise<Record<string, number>> {
  const base = {
    guideSpent: 0,
    guideLimit: DAILY_LIMIT.guide,
    demoSpent: 0,
    demoLimit: DAILY_LIMIT.demo,
    // Model calls, now that they are counted here rather than in a KV key nothing
    // could report on. A ceiling the page cannot show is a ceiling nobody checks.
    callsSpent: 0,
    callsLimit: DAILY_LIMIT.calls,
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
      if (r.scope === "calls") base.callsSpent = r.n;
    }
  } catch {
    // A status read that fails is not worth failing a request over; the numbers
    // simply read zero and the endpoint stays up.
  }
  return base;
}
