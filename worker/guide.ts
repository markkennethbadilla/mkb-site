/**
 * POST /api/guide - the site guide's tool-calling loop.
 *
 * A visitor's question goes to a free model with three tools and nothing else.
 * The model decides which section of the page answers it, says so, and the browser
 * carries out the navigation. There is no keyword table anywhere in this path: if
 * the model does not call a tool, the run has no destination and says so.
 *
 * The guardrails are not the system prompt. Free-text input from strangers is
 * untrusted, and a prompt is a request, not a control. What actually bounds this:
 * the tool allowlist, the section enum, a hard step cap, the edge rate limiter and
 * the daily model-call ceiling. A visitor who talks the model into something odd
 * gets, at worst, a scroll to a different section of a public page.
 */

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, stepCountIs } from "ai";
import { z } from "zod";
import { buildGuidePrompt, sectionById } from "../src/lib/site-sections";
import { FACTS_BRIEF } from "../src/lib/public-facts";

const GUIDE_SYSTEM_PROMPT = buildGuidePrompt(FACTS_BRIEF);
import { buildToolbox, type GuideDecision } from "./guide-tools";
import { lookup, remember } from "./cache";
import { reserve } from "./budget";
import {
  json,
  refuseForQuota,
  GUIDE_CHAIN,
  DEEPSEEK_BASE_URL,
  type Env,
} from "./models";

const MAX_QUESTION_CHARS = 200;

/**
 * ONE model call per question, and that is the whole point.
 *
 * This was 4, because answering took navigate_to_section then answer as two
 * sequential calls. Each round trip from Cloudflare to the inference endpoint
 * measured 3 to 6 seconds, so the count dominated everything else - moving to a
 * paid key barely helped because it did not change the count. One tool that
 * carries both the destination and the words makes it structurally one.
 *
 * A step is one model call plus its tool executions, so stopping at 1 means the
 * tool result is never fed back for another turn. Nothing needs it: the guide does
 * not read its own tool output. The cost is that a grounding rejection cannot be
 * retried in-flight, which is acceptable - a rejected answer falls back to the
 * written section line, and with a real fact corpus the check has stopped firing.
 */
const MAX_STEPS = 1;

const GuideRequest = z.object({
  question: z.string().min(1).max(MAX_QUESTION_CHARS),
});

// The prompt is built from the section list and lives beside it in
// src/lib/site-sections.ts, so the probe can load it without pulling the whole
// Worker in, and so the two can never disagree about what the page contains.

export async function handleGuide(req: Request, env: Env): Promise<Response> {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const startedAll = Date.now();
  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";

  // The REQUEST budget is reserved before anything else, including the key check.
  // A request costs a Worker request whether or not it can do any work, and
  // bounding Worker requests is the whole point - charging only the requests that
  // succeed would leave a loop against a misconfigured endpoint free.
  // The body is read first because the cache lookup needs the question, then the
  // budget reserve and the cache lookup run TOGETHER - neither depends on the
  // other, and each is several KV round trips. Serialised, they were the single
  // largest cost on a cache hit, which does no thinking at all.
  const body = await req.json().catch(() => null);
  const parsed = GuideRequest.safeParse(body);

  const [overBudget, cached] = await Promise.all([
    reserve(env, "guide", ip, 1),
    parsed.success ? lookup(env.DEMO_DB, parsed.data.question) : Promise.resolve(null),
  ]);

  if (overBudget) return json(degraded(`rate-limited:${overBudget.reason}`, overBudget.detail));
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "invalid request" }, 400);
  }
  if (cached) {
    return json({
      ...cached.hit,
      steps: [{ tool: "cache", args: { matched: cached.matched, similarity: cached.score } }],
      cached: true,
      model: null,
      ms: Date.now() - startedAll,
    });
  }

  const key = env.DEEPSEEK_API_KEY;
  if (!key) return json(degraded("no-key"));

  // Inference spend is a separate ceiling, reserved only once there is a key and
  // model calls are actually going to happen.
  const refused = await refuseForQuota(env, ip, MAX_STEPS);
  if (refused) return json(degraded(`rate-limited:${refused}`));

  // Runtime discovery is gone from this path. It existed because the free tier
  // churns and a pinned slug guarantees a dead demo within weeks; a key Mark owns
  // has a stable, published model list, so discovery would be a network round trip
  // to learn something already known. The chain is pinned to exact versioned ids -
  // never a floating alias, which would repoint the model and the price under a
  // running site.
  const deepseek = createOpenAICompatible({
    name: "deepseek",
    baseURL: DEEPSEEK_BASE_URL,
    apiKey: key,
    supportsStructuredOutputs: false,
  });

  const chain = [...GUIDE_CHAIN];

  for (const model of chain) {
    const decision: GuideDecision = {
      section: null,
      answer: null,
      declined: false,
      steps: [],
      rejected: [],
    };
    const startedAt = Date.now();
    try {
      const result = await generateText({
        model: deepseek(model),
        system: GUIDE_SYSTEM_PROMPT,
        prompt: parsed.data.question,
        tools: buildToolbox(decision),
        stopWhen: stepCountIs(MAX_STEPS),
        temperature: 0.3,
        maxRetries: 1,
        experimental_telemetry: { isEnabled: true, functionId: "site-guide" },
      });

      // Three legitimate shapes, not two:
      //
      //   navigate + answer -> the page shows it, so take them there
      //   answer alone      -> the corpus covers it but no section does (pets,
      //                        what he watches, favourite colour). Answer where
      //                        they are. Navigating to an unrelated section to
      //                        satisfy a rule is worse than standing still.
      //   decline           -> outside what it knows
      //
      // What is NOT a shape is prose with no tool call at all. The model's free
      // text never reaches the visitor: it bypasses the grounding check, so it is
      // exactly the ungrounded assertion this whole design exists to stop. That
      // becomes a decline, which is also what a jailbreak attempt should get.
      // A run that called nothing is a FAILED run, not a decline. Weaker models
      // answer a conversational question in prose instead of reaching for a tool,
      // and that prose never reaches the visitor because it bypasses the grounding
      // check. Turning it into "I only know about Mark and this page" told the
      // visitor the guide could not help when the next model in the chain answers
      // it fine - measurably: nemotron answers "does he have any pets" in place,
      // the two behind it produce prose. So advance the cascade instead.
      if (!decision.section && !decision.answer && !decision.declined) {
        throw new Error("no tool call - the model wrote prose, which is discarded");
      }

      // The model's own words only survive if they passed the grounding check.
      // Otherwise the written section line stands in - always true, never blank.
      const answer = decision.declined
        ? OFF_TOPIC
        : decision.answer
          ? decision.answer
          : sectionById(decision.section!).bubble;

      // Only remember runs worth repeating. A degraded response would pin an
      // outage in place for a week, and an ungrounded one would make a single bad
      // answer permanent - so neither is stored.
      if (decision.answer || decision.declined) {
        await remember(env.DEMO_DB, parsed.data.question, {
          section: decision.declined ? null : decision.section,
          answer,
          declined: decision.declined,
          grounded: Boolean(decision.answer),
        });
      }

      return json({
        section: decision.declined ? null : decision.section,
        answer,
        declined: decision.declined,
        steps: decision.steps,
        grounded: Boolean(decision.answer),
        rejectedCount: decision.rejected.length,
        model,
        ms: Date.now() - startedAt,
        totalMs: Date.now() - startedAll,
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
      });
    } catch {
      // Try the next model. Nothing has been sent to the browser yet, so this is
      // invisible to the visitor - which is the whole reason the loop is not
      // streamed.
    }
  }

  // Every model produced nothing usable. For a visitor that is indistinguishable
  // from a question this guide cannot answer, and the decline copy is the more
  // useful of the two messages, so it is what they get. `degraded` still records
  // the real cause for anyone reading the response or the logs.
  return json({
    ...degraded("all-models-failed", OFF_TOPIC),
    declined: true,
  });
}

const OFF_TOPIC =
  "I only know about Mark and this page. Ask me about his work, his stack, where he studied, or how to reach him.";

/**
 * Degradation is announced, never faked. Each reason names the actual cause so a
 * visitor - and Mark reading his own logs - can tell "no key configured" from
 * "every model is down" from "you are going too fast".
 */
function degraded(reason: string, detail?: string) {
  return {
    section: null,
    answer: detail ?? DEGRADED_COPY[reason] ?? `The guide is unavailable right now (${reason}).`,
    declined: false,
    degraded: reason,
    steps: [],
    model: null,
    ms: 0,
  };
}

const DEGRADED_COPY: Record<string, string> = {
  "no-key": "The guide is not configured with a model key right now, so it cannot think. Everything on the page is still here to read.",
  "rate-limited:ip-daily-cap": "You have used your share of today's guide budget. It resets at midnight UTC.",
  "rate-limited:pool-exhausted": "The guide has used today's request budget. It is back at midnight UTC.",
  "rate-limited:burst": "That was a lot of questions at once. Give it a few seconds and ask again.",
  "rate-limited:daily-cap": "The guide has used up today's free inference budget. It will be back tomorrow.",
  "all-models-failed": "Every model in the chain failed on that question. Nothing was made up to cover for it.",
};
