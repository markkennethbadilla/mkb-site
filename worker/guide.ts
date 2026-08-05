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
  discoverFreeModels,
  json,
  refuseForQuota,
  FINAL_FALLBACK,
  MAX_ATTEMPTS,
  type Env,
} from "./models";

const MAX_QUESTION_CHARS = 200;

/** One question is at most this many model calls: navigate, answer, and slack. */
const MAX_STEPS = 4;

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
  const overBudget = await reserve(env, "guide", ip, 1);
  if (overBudget) return json(degraded(`rate-limited:${overBudget.reason}`, overBudget.detail));

  const key = env.OPENROUTER_API_KEY;
  if (!key) return json(degraded("no-key"));

  // Inference spend is a separate ceiling, reserved only once there is a key and
  // model calls are actually going to happen.
  const refused = await refuseForQuota(env, ip, MAX_STEPS);
  if (refused) return json(degraded(`rate-limited:${refused}`));

  const parsed = GuideRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "invalid request" }, 400);
  }

  // Before any inference: has this question, or one close enough to it, already
  // been answered? A portfolio gets the same dozen questions in different words,
  // and paying six seconds and a model call for each rephrasing is waste in both
  // directions. Cache hits are labelled as such rather than passed off as a run.
  const cached = await lookup(env.DEMO_KV, parsed.data.question);
  if (cached) {
    return json({
      ...cached.hit,
      steps: [{ tool: "cache", args: { matched: cached.matched, similarity: cached.score } }],
      cached: true,
      model: null,
      ms: Date.now() - startedAll,
    });
  }

  const openrouter = createOpenAICompatible({
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: key,
    supportsStructuredOutputs: false,
    headers: {
      "HTTP-Referer": "https://markkennethbadilla.com",
      "X-Title": "markkennethbadilla.com site guide",
    },
  });

  const discovered = await discoverFreeModels(env, { requireTools: true });
  if (!discovered.length && !FINAL_FALLBACK) return json(degraded("no-tool-capable-model"));
  const chain = [...discovered.slice(0, MAX_ATTEMPTS), FINAL_FALLBACK];

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
        model: openrouter(model),
        system: GUIDE_SYSTEM_PROMPT,
        prompt: parsed.data.question,
        tools: buildToolbox(decision),
        stopWhen: stepCountIs(MAX_STEPS),
        temperature: 0.3,
        maxRetries: 1,
        experimental_telemetry: { isEnabled: true, functionId: "site-guide" },
      });

      // No tool call means no destination. The model's free text is NOT a
      // fallback: it has been told no facts about Mark, so anything it wrote is a
      // guess. Treated as a decline - the guide stays put and says it cannot help,
      // which is both honest and what a jailbreak attempt should get. The probe
      // showed two of four models answering prompt-injection this way.
      if (!decision.section && !decision.declined) {
        decision.declined = true;
        decision.steps.push({ tool: "decline", args: { reason: "no tool call" } });
      }

      // The model's own words only survive if they passed the grounding check.
      // Otherwise the written section line stands in - always true, never blank.
      const answer = decision.declined
        ? OFF_TOPIC
        : (decision.answer ?? sectionById(decision.section!).bubble);

      // Only remember runs worth repeating. A degraded response would pin an
      // outage in place for a week, and an ungrounded one would make a single bad
      // answer permanent - so neither is stored.
      if (decision.answer || decision.declined) {
        await remember(env.DEMO_KV, parsed.data.question, {
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

  return json(degraded("all-models-failed"));
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
  "rate-limited:burst": "That was a lot of questions at once. Give it a few seconds and ask again.",
  "rate-limited:daily-cap": "The guide has used up today's free inference budget. It will be back tomorrow.",
  "no-tool-capable-model": "No free model that can use tools is available right now, and the guide will not pretend to navigate without one.",
  "all-models-failed": "Every model in the chain failed on that question. Nothing was made up to cover for it.",
};
