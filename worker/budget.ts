/**
 * The bound that stops one page taking the whole site down for a day.
 *
 * Cloudflare Workers Free is 100,000 requests per day for the ENTIRE Worker,
 * resetting at midnight UTC. Every /api/* route on this site draws from that one
 * number. So a demo that fires 25 requests per visitor click is not just spending
 * its own budget - it is spending the site guide's, and when it runs out the
 * guide stops answering until tomorrow.
 *
 * That is a structural problem, not a problem with any particular demo, so it is
 * solved once here rather than per feature. The shape:
 *
 *   1. SEPARATE POOLS. The guide and the demos count against different daily
 *      counters. Demos cannot consume the guide's allocation because they never
 *      touch its counter. Exhausting the demo pool degrades demos and leaves the
 *      centrepiece working - which is the correct thing to sacrifice first.
 *   2. A PER-IP DAILY CAP. One visitor cannot spend the shared pool, whatever
 *      they do with a console.
 *   3. AN EDGE LIMITER SIZED FOR REAL FAN-OUT. A demo that legitimately fires ~16
 *      requests in one burst cannot use the guide's 6/60s limiter, so it gets its
 *      own with a ceiling above real use and far below abuse. This is the only
 *      control enforced BEFORE the request is billed, which makes it the one that
 *      actually stops a loop.
 *
 * Reserve-then-spend, not increment-per-request: a burst that is going to blow the
 * ceiling is refused before it starts, rather than halfway through a run the
 * visitor is already watching.
 *
 * Honest limitation, stated because the alternative is pretending otherwise: KV is
 * eventually consistent, so a determined attacker racing many requests inside the
 * propagation window can overshoot a KV counter. The edge limiter is the control
 * that holds under that, and it is the one enforced before billing. The KV pools
 * are a spend ceiling for ordinary traffic, not an adversarial guarantee.
 */

export type Pool = "guide" | "demo";

/**
 * Daily request allocations. They deliberately sum to well under the 100,000
 * platform cap: page loads, assets and anything not routed through here also draw
 * on it, and a budget that assumes it owns the whole quota is not a budget.
 */
const DAILY_LIMIT: Record<Pool, number> = {
  guide: 12_000,
  demo: 20_000,
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
  DEMO_KV: KVNamespace;
  /** 6 req/60s. Correct for the guide; far too tight for a demo's fan-out. */
  BURST_LIMITER?: { limit: (o: { key: string }) => Promise<{ success: boolean }> };
  /** Higher ceiling, for endpoints a single visitor legitimately calls in a burst. */
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

  const day = today();
  const ipKey = `budget:ip:${pool}:${day}:${ip}`;
  const poolKey = `budget:pool:${pool}:${day}`;

  // Both counters are read TOGETHER. The first version awaited them one after the
  // other, and measured against the live site that serialisation cost about a
  // second and a half per request - on a cached answer, which does no thinking at
  // all, the whole response was ~2.1s while a static asset from the same machine
  // round-trips in 190ms. Nearly all of that was this function queueing KV reads.
  const [ipRaw, poolRaw] = await Promise.all([
    env.DEMO_KV.get(ipKey),
    env.DEMO_KV.get(poolKey),
  ]);

  const ipSpent = Number(ipRaw ?? 0);
  if (ipSpent + cost > DAILY_PER_IP[pool]) {
    return {
      reason: "ip-daily-cap",
      detail: `You have used your share of today's ${pool} budget on this site. It resets at midnight UTC.`,
    };
  }

  const poolSpent = Number(poolRaw ?? 0);
  if (poolSpent + cost > DAILY_LIMIT[pool]) {
    return {
      reason: "pool-exhausted",
      detail:
        pool === "demo"
          ? "The demos have used today's request budget. They are back at midnight UTC. Everything else on the site still works, which is the point of budgeting them separately."
          : "The guide has used today's request budget. It is back at midnight UTC.",
    };
  }

  // Written after both checks so a refusal costs nothing, and written in parallel
  // for the same reason as the reads. expirationTtl is 26 hours: comfortably past
  // the UTC reset, so yesterday's counters clean themselves up rather than
  // accumulating a key per day forever.
  await Promise.all([
    env.DEMO_KV.put(ipKey, String(ipSpent + cost), { expirationTtl: 93_600 }),
    env.DEMO_KV.put(poolKey, String(poolSpent + cost), { expirationTtl: 93_600 }),
  ]);
  return null;
}

/** Current spend, for a status endpoint. Read-only, never reserves. */
export async function budgetStatus(env: BudgetEnv): Promise<Record<string, number>> {
  const day = today();
  const [guide, demo] = await Promise.all([
    env.DEMO_KV.get(`budget:pool:guide:${day}`),
    env.DEMO_KV.get(`budget:pool:demo:${day}`),
  ]);
  return {
    guideSpent: Number(guide ?? 0),
    guideLimit: DAILY_LIMIT.guide,
    demoSpent: Number(demo ?? 0),
    demoLimit: DAILY_LIMIT.demo,
  };
}
