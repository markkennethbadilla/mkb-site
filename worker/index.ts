// serena-cannot: concurrent background workflow agents keep re-activating a different
// Serena project, so relative-path edits resolve into the wrong repository.
/**
 * Worker for markkennethbadilla.com.
 *
 * Serves the static export for everything except /api/*, which backs the live
 * agent demo. Deliberately assembled from existing libraries rather than
 * hand-rolled plumbing, because "we wired an LLM into a page" is not the claim
 * being made here - the claim is that the thing AROUND the model is engineered:
 *
 *   Provider abstraction, retries, cascade ... Vercel AI SDK v7
 *   Output guardrail ......................... Zod schema via Output.object()
 *   Fence-stripping and JSON parsing ......... extractJsonMiddleware, same SDK
 *   Input validation ......................... Zod
 *   Burst rate limiting ...................... Cloudflare rate-limit binding
 *   Spend ceiling ............................ worker/budget.ts, one atomic D1 row
 *   Expired-arena sweep ...................... scheduled() below, on a cron trigger
 *   Traces, tokens, latency .................. AI SDK telemetry + Workers observability
 *
 * The schema is the important one. The model is not ASKED to return code; the SDK
 * parses what came back and validates it against the schema before this file sees
 * it. A prompt saying "return only code" is a request. A schema is a guarantee.
 *
 * Model selection is DISCOVERED, not hardcoded: OpenRouter's free tier changes
 * constantly, so pinning slugs guarantees a dead demo within weeks. Only the
 * final fallback is fixed.
 */

// serena-cannot: concurrent workflow agents hold Serena's active project.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { extractJsonMiddleware, generateText, Output, wrapLanguageModel } from "ai";
import { z } from "zod";
import { handleGuide } from "./guide";
import { budgetStatus, reserve } from "./budget";
import { handleDemos } from "./demos/router";
import { discoverFreeModels, json, FINAL_FALLBACK, MAX_ATTEMPTS } from "./models";

const MAX_INSTRUCTION_CHARS = 400;

/**
 * One model call, one ceiling on how long a visitor stares at a spinner.
 *
 * There was no timeout here at all. A model that accepts the connection and then
 * stops sending held the request open until the platform killed it, and the
 * cascade below never advanced, because nothing had failed yet.
 */
const MODEL_TIMEOUT_MS = 20_000;

// serena-cannot: concurrent workflow agents hold Serena's active project.
/**
 * The output contract. The model cannot return anything else and be accepted.
 *
 * Kept deliberately shallow - three flat fields, no enum, no nesting. Small free
 * models fail structured output on anything more elaborate, and a schema the
 * model cannot satisfy is a guardrail that only ever produces outages.
 */
const AgentOutput = z.object({
  code: z.string().min(1).max(4000).describe("The code change. No markdown fences, no prose."),
  language: z.string().max(24).describe("Language of the code, e.g. typescript or sql."),
  summary: z.string().max(200).describe("One sentence describing what the change does."),
});

/** The request contract. */
const AgentRequest = z.object({
  instruction: z.string().min(1).max(MAX_INSTRUCTION_CHARS),
  previous: z.string().max(6000).optional(),
  gateFeedback: z.string().max(4000).optional(),
});

// serena-cannot: concurrent workflow agents hold Serena's active project.
//
// "Do not explore" earns its place: weak free models answer a change request by
// printing a directory walk, which produces no change for the gates to inspect
// and makes the demo look broken when the model, not the harness, is at fault.
const SYSTEM_PROMPT = `You are a coding agent editing ONE file in a Node/TypeScript web service.
Write the actual code change and nothing else.
Do NOT explore the repository, list files, print directory trees, or describe a plan.
Do NOT write tests or tooling. Produce the concrete change that was asked for, as it would appear in the file.
Keep it under 25 lines.
If you are given gate feedback from a previous attempt, rewrite the code so it satisfies every gate while still doing as much of the original task as is legitimate.
If the request cannot be done safely at all, produce the safe equivalent instead.`;

// serena-cannot: concurrent workflow agents hold Serena's active project.
//
// The field names still have to be said out loud. With supportsStructuredOutputs
// off the schema is never sent to the provider - the request asks for JSON mode
// and nothing more - so this text is the only thing telling the model what shape
// to produce. The schema is still what DECIDES whether the answer is accepted.
const JSON_INSTRUCTION = `Reply with ONE JSON object and nothing else, matching exactly:
{"code": "<the code, as a JSON string>", "language": "<e.g. typescript>", "summary": "<one sentence>"}`;

async function handleAgent(req: Request, env: Env): Promise<Response> {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const key = env.OPENROUTER_API_KEY;
  if (!key) return json({ degraded: true, reason: "no-key", cascade: [] });

  // The same atomic counter every other route uses. This endpoint kept its own
  // daily counter in KV - read it, add one, write it back - which is two separate
  // bugs. Workers KV Free allows 1,000 writes a day and this wrote once per
  // request against a declared cap of 800, so the counter froze and the ceiling
  // stopped being a ceiling. And read-then-write from concurrent isolates loses
  // updates, so a burst of ten could count as one. That is the exact defect the
  // ledger demo on this site exists to exhibit, and it was in the code guarding
  // the site.
  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
  const refused = await reserve(env, "demo", ip, 1);
  if (refused) {
    return json({ degraded: true, reason: `rate-limited:${refused.reason}`, detail: refused.detail, cascade: [] });
  }

  const parsed = AgentRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "invalid request" }, 400);
  }
  const { instruction, previous, gateFeedback } = parsed.data;

  // serena-cannot: concurrent workflow agents hold Serena's active project.
  //
  // supportsStructuredOutputs is FALSE on purpose. Most free OpenRouter models do
  // not implement OpenAI strict-schema mode, and asking for it made all four
  // cascade entries fail with AI_NoObjectGeneratedError. With it off the SDK
  // switches to JSON mode plus repair, which weak models can actually satisfy -
  // and the Zod schema still validates the result, so the guarantee is unchanged.
  const openrouter = createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: key,
    supportsStructuredOutputs: false,
    headers: {
      "HTTP-Referer": "https://markkennethbadilla.com",
      "X-Title": "markkennethbadilla.com agent harness",
    },
  });

  const prompt =
    previous && gateFeedback
      ? `${instruction}\n\nYour previous attempt was BLOCKED by the gates:\n${previous}\n\nGate feedback:\n${gateFeedback}\n\nRewrite it so every gate passes.`
      : instruction;

  const discovered = await discoverFreeModels(env);
  const chain = [...discovered.slice(0, MAX_ATTEMPTS), FINAL_FALLBACK];
  const cascade: { model: string; ok: boolean; ms: number; error?: string }[] = [];
  const startedAll = Date.now();

  // serena-cannot: concurrent workflow agents hold Serena's active project.
  //
  // generateObject was tried first and every model in the cascade failed it,
  // including a capable paid one - free OpenRouter models largely do not
  // implement provider-side structured output, so the SDK could never satisfy the
  // schema. So the model is asked for JSON in plain text, and the SDK does the
  // rest: extractJsonMiddleware strips the markdown fences models wrap it in, and
  // Output.object parses what is left and validates it against the Zod schema
  // before this code sees it. Nothing non-conforming can be returned.
  //
  // That was 40 lines here until recently - a fenced-block regex, a balanced-brace
  // scanner tracking string and escape state, and a manual safeParse - all of it
  // re-implementing a middleware the installed SDK documents as being for exactly
  // this: "extracts JSON from text content by stripping markdown code fences...
  // useful when using Output.object() with models that wrap JSON responses in
  // markdown code blocks".
  for (const model of chain) {
    const startedAt = Date.now();
    try {
      const result = await generateText({
        model: wrapLanguageModel({
          model: openrouter(model),
          middleware: extractJsonMiddleware(),
        }),
        output: Output.object({ schema: AgentOutput }),
        system: SYSTEM_PROMPT + "\n" + JSON_INSTRUCTION,
        prompt,
        temperature: 0.2,
        maxRetries: 1,
        timeout: { totalMs: MODEL_TIMEOUT_MS },
        experimental_telemetry: { isEnabled: true, functionId: "agent-harness" },
      });

      // Reading `output` is where the schema is enforced. It throws if the model
      // produced nothing parseable or nothing that validates, and that throw is
      // caught below as this model failing, which advances the cascade.
      const validated = result.output;

      cascade.push({ model, ok: true, ms: Date.now() - startedAt });
      return json({
        degraded: false,
        model,
        cascade,
        ...validated,
        stats: {
          latencyMs: Date.now() - startedAt,
          totalElapsedMs: Date.now() - startedAll,
          inputTokens: result.usage?.inputTokens ?? null,
          outputTokens: result.usage?.outputTokens ?? null,
          totalTokens: result.usage?.totalTokens ?? null,
          finishReason: result.finishReason,
          modelsTried: cascade.length,
          freeModelsAvailable: discovered.length,
          costUsd: 0,
          schemaEnforced: "AgentOutput (zod)",
        },
      });
    } catch (e) {
      cascade.push({ model, ok: false, ms: Date.now() - startedAt, error: String(e).slice(0, 140) });
    }
  }

  return json({ degraded: true, reason: "all-models-failed", cascade });
}

async function handleModels(env: Env): Promise<Response> {
  const free = await discoverFreeModels(env);
  // Budget is reported here rather than hidden: the site's argument is that limits
  // should be visible, and a reader can see exactly how much of today's free tier
  // is gone and which pool spent it.
  const budget = await budgetStatus(env);
  return json({
    discoveredFree: free.slice(0, MAX_ATTEMPTS),
    totalFreeSeen: free.length,
    finalFallback: FINAL_FALLBACK,
    hasKey: Boolean(env.OPENROUTER_API_KEY),
    burstLimiter: Boolean(env.BURST_LIMITER),
    demoLimiter: Boolean(env.DEMO_LIMITER),
    budget,
  });
}

/**
 * How many expired arenas one invocation clears, per room, plus the same ceiling
 * on stale cache rows.
 *
 * Bounded because a sweep that deletes everything it finds is a sweep that, after
 * a quiet fortnight, tries to delete a hundred thousand rows inside one cron
 * invocation and is killed halfway. Fifty an hour clears far more than this site
 * creates, and if it ever falls behind it catches up next hour rather than falling
 * over.
 */
const SWEEP_ARENAS_PER_RUN = 50;

/**
 * Deletes expired demo arenas. Runs hourly on the cron trigger in wrangler.jsonc.
 *
 * Every arena table has had an expires_at column and an index on it since the
 * migration that created it. Migration 0004 and migration 0006 both say arenas
 * "expire and are swept in bounded batches", src/lib/demos/registry.ts charges
 * every run for its share of that sweep, and split-brain.ts names it in the
 * comment above its own TTL. There was no sweep. Four places described a job
 * nothing did, and the tables grew forever - which is the exact defect this site
 * is an argument against.
 *
 * Nothing is thrown away quietly: a failure here rejects, so the invocation shows
 * up as failed rather than as an hour that swept nothing.
 *
 * Children first, then the arena, because the child tables carry a foreign key to
 * it. Each delete re-runs the same ORDER BY expires_at subquery, so all of them
 * name the same batch, and the arena delete comes last so the subquery still has
 * rows to find.
 */
async function sweepExpired(env: Env): Promise<void> {
  const db = env.DEMO_DB;
  if (!db) return;

  // Two arena families, two time formats, and mixing them up would delete either
  // nothing or everything. Ledger arenas store an ISO 8601 string, so they are
  // compared against another ISO string of the same shape rather than SQLite's
  // datetime(), whose space separator sorts before the 'T' and would make every
  // comparison wrong. Split-brain arenas store epoch milliseconds.
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  const expiredLedger = `SELECT run_id FROM ledger_race_arenas WHERE expires_at < ?1 ORDER BY expires_at LIMIT ?2`;
  const expiredSplit = `SELECT run_id FROM split_brain_arenas WHERE expires_at < ?1 ORDER BY expires_at LIMIT ?2`;

  const purge = (table: string, expired: string, now: string | number) =>
    db
      .prepare(`DELETE FROM ${table} WHERE run_id IN (${expired})`)
      .bind(now, SWEEP_ARENAS_PER_RUN);

  await db.batch([
    purge("ledger_race_entries", expiredLedger, nowIso),
    purge("ledger_race_shards", expiredLedger, nowIso),
    purge("ledger_race_accounts", expiredLedger, nowIso),
    purge("ledger_race_arenas", expiredLedger, nowIso),
    purge("split_brain_events", expiredSplit, nowMs),
    purge("split_brain_work", expiredSplit, nowMs),
    purge("split_brain_nodes", expiredSplit, nowMs),
    purge("split_brain_leases", expiredSplit, nowMs),
    purge("split_brain_arenas", expiredSplit, nowMs),
    // The guide's answer cache expires by age rather than by arena. worker/cache.ts
    // already ignores anything older than seven days when it reads, so this only
    // stops the table growing forever behind that filter.
    db
      .prepare(
        `DELETE FROM guide_cache WHERE token_key IN (
           SELECT token_key FROM guide_cache WHERE created_at < datetime('now', '-7 days')
           ORDER BY created_at LIMIT ?1)`
      )
      .bind(SWEEP_ARENAS_PER_RUN),
  ]);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/api/agent") return handleAgent(req, env);
    if (url.pathname === "/api/models") return handleModels(env);
    if (url.pathname === "/api/guide") return handleGuide(req, env);
    // One prefix, one router. Every room endpoint goes through worker/demos/router.ts
    // so the request budget is charged in exactly one place - see the docstring
    // there for why three rooms accounting for themselves is three chances to
    // spend the site guide's allowance by accident.
    if (url.pathname.startsWith("/api/demos/")) return handleDemos(req, env);

    const asset = await env.ASSETS.fetch(req);
    if (asset.status !== 404 || (req.method !== "GET" && req.method !== "HEAD")) return asset;

    // ONE PLACE WHERE `output: "export"` WRITES A FILE UNDER A NAME THE CLIENT
    // DOES NOT ASK FOR. Retried exactly once, only after a real 404, and it asks
    // for a specific file the exporter demonstrably wrote rather than rewriting
    // arbitrary paths. If the retry misses too, the original 404 stands.
    //
    // Segment prefetch payloads. Next writes them nested -
    // out/demos/split-brain/__next.demos/split-brain/__PAGE__.txt - and the client
    // asks for the segments joined with dots -
    // __next.demos.split-brain.__PAGE__.txt. Every one 404s, seven of them on the
    // gallery alone.
    //
    // Nothing breaks: a missed segment prefetch falls back to the full payload.
    // What it costs is a console full of red on a site whose whole argument is
    // that you should open it and check, which is the one place a harmless error
    // is expensive. The experimental flag that would turn this off does not exist
    // in this version, so it is fixed here.
    const last = url.pathname.split("/").pop() ?? "";
    if (!/^__next\..+\.txt$/.test(last)) return asset;

    const parts = last.slice("__next.".length, -".txt".length).split(".");
    const retryUrl = new URL(req.url);
    retryUrl.pathname = `${url.pathname.slice(0, -last.length)}__next.${parts.join("/")}.txt`;
    const retry = await env.ASSETS.fetch(new Request(retryUrl, req));
    return retry.status === 404 ? asset : retry;
  },

  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    await sweepExpired(env);
  },
} satisfies ExportedHandler<Env>;
