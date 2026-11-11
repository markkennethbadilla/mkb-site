// BUDGET-CAP: openrouter/personal-api-key 1USD-monthly-provider-limit; deepseek/active-personal-api-key 0.10USD-per-run
// BUDGET-ALERT: ops-alert
//
// Hard budget cap on every paid model call (rule 97, agentops spec 119).
//
// Gates, all before money is spent:
//   1. max output tokens is always set, so a run's worst case is knowable.
//   2. the worst-case cost of the run is estimated from list prices and refused
//      past the per-run cap.
//   3. for OpenRouter, the key's own usage is read and calls stop at the limit (alert at 80 percent) of
//      its credit limit (the provider-side limit is the real backstop).
// A refusal, a provider 402 or a provider limit error logs FAIL with the real
// error and posts one ops alert. Pure fetch, so the Worker and the node scripts
// share it.

/** Worst-case output tokens per model step. Every paid call passes this. */
export const MAX_OUTPUT_TOKENS = 600;

/** Per-run hard cap in USD. One visitor question or one script case. */
export const RUN_CAP_USD = 0.1;

/** USD per million tokens, conservative list prices (rounded up). */
const DEEPSEEK = { in: 0.6, out: 2.5 };
const UNKNOWN = { in: 3, out: 15 };

export function priceFor(model: string): { in: number; out: number } {
  if (model.endsWith(":free")) return { in: 0, out: 0 };
  return model.includes("deepseek") ? DEEPSEEK : UNKNOWN;
}

/** Worst-case USD for `steps` model steps on a prompt of `promptChars`. */
export function estimateRunUsd(model: string, promptChars: number, steps: number): number {
  const p = priceFor(model);
  // Each step resends the prompt plus prior output; chars/3 over-counts tokens on purpose.
  const inTok = steps * (promptChars / 3 + steps * MAX_OUTPUT_TOKENS);
  const outTok = steps * MAX_OUTPUT_TOKENS;
  return (inTok * p.in + outTok * p.out) / 1e6;
}

export interface CapContext {
  project: string;
  keySlug: string;
  notifyToken?: string;
}

const ALERT_URL = "https://leads.weassist.uk/notify/ops-alert";

export async function alertCap(ctx: CapContext, cap: string, spend: string, skipped: string, error: string) {
  const detail = `project=${ctx.project} key=${ctx.keySlug} cap=${cap} spend=${spend} skipped=${skipped}`;
  console.error(`FAIL budget-cap ${detail} error=${error}`);
  if (!ctx.notifyToken) {
    console.error("FAIL budget-cap alert not sent: no notify token configured");
    return;
  }
  try {
    const res = await fetch(ALERT_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${ctx.notifyToken}` },
      body: JSON.stringify({ source: "budget-cap", title: `budget cap hit: ${ctx.project}`, detail, level: "warn" }),
    });
    if (res.ok) console.log(`OK budget-cap alert sent ${res.status}`);
    else console.error(`FAIL budget-cap alert ${res.status} ${await res.text()}`);
  } catch (e) {
    console.error(`FAIL budget-cap alert ${String(e)}`);
  }
}

/** Returns a refusal reason, or null when the run may go ahead. */
export async function checkRunCap(
  ctx: CapContext,
  model: string,
  promptChars: number,
  steps: number,
  skipped: string
): Promise<string | null> {
  const est = estimateRunUsd(model, promptChars, steps);
  if (est > RUN_CAP_USD) {
    await alertCap(ctx, `${RUN_CAP_USD}`, est.toFixed(4), skipped, "run estimate over cap");
    return "over-run-cap";
  }
  return null;
}

/** OpenRouter only: refuse at the key's credit limit; past 80 percent alert once and keep serving (Mark 2026-11-03). */
let warned80 = false;
export async function checkOpenRouterKey(ctx: CapContext, apiKey: string, skipped: string): Promise<string | null> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/key", { headers: { authorization: `Bearer ${apiKey}` } });
    if (!res.ok) {
      // An unreadable key status lets the call go: the provider limit still binds.
      console.error(`FAIL budget-cap key read ${res.status} ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const { data } = (await res.json()) as { data: { usage: number; limit: number | null } };
    if (data.limit !== null && data.usage >= data.limit) {
      await alertCap(ctx, `${data.limit}`, `${data.usage}`, skipped, "key spend at its limit");
      return "key-limit";
    }
    if (data.limit !== null && data.usage >= 0.8 * data.limit && !warned80) {
      warned80 = true;
      await alertCap(ctx, `${data.limit}`, `${data.usage}`, "none", "spend past 80 percent of key limit, still serving");
    }
    return null;
  } catch (e) {
    console.error(`FAIL budget-cap key read ${String(e)}`);
    return null;
  }
}

/** True for a provider out-of-credit or limit error; alerts when so. */
export async function alertIfLimitError(ctx: CapContext, e: unknown, skipped: string): Promise<boolean> {
  const s = `${(e as { statusCode?: number })?.statusCode ?? ""} ${String(e)}`;
  if (/\b402\b|insufficient|quota|credit|limit exceeded/i.test(s)) {
    await alertCap(ctx, "provider", "?", skipped, s.slice(0, 300));
    return true;
  }
  return false;
}
