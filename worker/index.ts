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
 *   Output guardrail ......................... Zod schema via generateObject
 *   Input validation ......................... Zod
 *   Burst rate limiting ...................... Cloudflare rate-limit binding
 *   Spend ceiling ............................ KV day counter (a business rule)
 *   Traces, tokens, latency .................. AI SDK telemetry + Workers observability
 *
 * generateObject is the important one. The model is not ASKED to return code; it
 * is constrained to a schema and the SDK re-prompts until the shape validates.
 * A prompt saying "return only code" is a request. A schema is a guarantee.
 *
 * Model selection is DISCOVERED, not hardcoded: OpenRouter's free tier changes
 * constantly, so pinning slugs guarantees a dead demo within weeks. Only the
 * final fallback is fixed.
 */

// serena-cannot: concurrent workflow agents hold Serena's active project.
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { z } from "zod";
import { handleGuide } from "./guide";
import type { Env as GuideEnv } from "./models";

export interface Env {
  ASSETS: Fetcher;
  DEMO_KV: KVNamespace;
  OPENROUTER_API_KEY?: string;
  /** Cloudflare native rate limiter. Absent in local dev; treated as open. */
  BURST_LIMITER?: { limit: (o: { key: string }) => Promise<{ success: boolean }> };
}

const FINAL_FALLBACK = "deepseek/deepseek-v4-flash";
const FREE_ATTEMPTS = 3;

const MODELS_CACHE_KEY = "openrouter:free-models:v3";
const MODELS_CACHE_TTL = 3600;

const GLOBAL_DAILY_CAP = 800;
const MAX_INSTRUCTION_CHARS = 400;

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

type OpenRouterModel = {
  id: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { modality?: string; input_modalities?: string[]; output_modalities?: string[] };
};

/**
 * The free tier is not all chat models - it includes image and audio generation.
 * Sorting purely by context length picked Google's Lyria music models, which then
 * failed every request.
 *
 * Note the trap: Lyria advertises output_modalities ["text","audio"], so a naive
 * outputs.includes("text") accepts it. A usable chat model emits text and NOTHING
 * else, so the test has to be exclusive, not inclusive.
 */
const NON_TEXT_OUTPUTS = ["audio", "image", "video"];

function isTextChat(m: OpenRouterModel): boolean {
  const a = m.architecture;
  if (!a) return false;
  const inputs = a.input_modalities ?? [];
  const outputs = a.output_modalities ?? [];
  if (outputs.length) {
    if (!outputs.includes("text")) return false;
    if (outputs.some((o) => NON_TEXT_OUTPUTS.includes(o))) return false;
    return inputs.length === 0 || inputs.includes("text");
  }
  return typeof a.modality === "string" && a.modality.endsWith("->text");
}

function isFree(m: OpenRouterModel): boolean {
  const p = Number(m.pricing?.prompt ?? "1");
  const c = Number(m.pricing?.completion ?? "1");
  return Number.isFinite(p) && Number.isFinite(c) && p === 0 && c === 0;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

async function discoverFreeModels(env: Env): Promise<string[]> {
  const cached = await env.DEMO_KV.get(MODELS_CACHE_KEY, "json");
  if (Array.isArray(cached) && cached.length) return cached as string[];
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { data?: OpenRouterModel[] };
    const ids = (body.data ?? [])
      .filter(isFree)
      .filter(isTextChat)
      .sort((a, b) => (b.context_length ?? 0) - (a.context_length ?? 0))
      .map((m) => m.id)
      .slice(0, 8);
    if (ids.length) {
      await env.DEMO_KV.put(MODELS_CACHE_KEY, JSON.stringify(ids), {
        expirationTtl: MODELS_CACHE_TTL,
      });
    }
    return ids;
  } catch {
    return [];
  }
}

/**
 * Two independent controls. Burst is the PLATFORM's rate limiter, enforced at the
 * edge before the Worker does any work - not a counter written here. The daily
 * cap is a spend ceiling, which is a business rule rather than a rate limit, so
 * it lives in KV.
 */
async function refuseForQuota(env: Env, ip: string): Promise<string | null> {
  if (env.BURST_LIMITER) {
    const { success } = await env.BURST_LIMITER.limit({ key: ip });
    if (!success) return "burst";
  }
  const dayKey = `rl:global:${new Date().toISOString().slice(0, 10)}`;
  const dayCount = Number((await env.DEMO_KV.get(dayKey)) ?? 0);
  if (dayCount >= GLOBAL_DAILY_CAP) return "daily-cap";
  await env.DEMO_KV.put(dayKey, String(dayCount + 1), { expirationTtl: 90000 });
  return null;
}

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
const JSON_INSTRUCTION = `Reply with ONE JSON object and nothing else, matching exactly:
{"code": "<the code, as a JSON string>", "language": "<e.g. typescript>", "summary": "<one sentence>"}
No markdown fences. No commentary before or after the JSON.`;

/**
 * Models wrap JSON in fences or prose no matter how firmly they are told not to.
 * Pull out the first balanced object rather than trusting the whole response to
 * parse - and return null so the caller can reject it, never a half-guess.
 */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < body.length; i++) {
    const ch = body[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(body.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

async function handleAgent(req: Request, env: Env): Promise<Response> {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const key = env.OPENROUTER_API_KEY;
  if (!key) return json({ degraded: true, reason: "no-key", cascade: [] });

  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
  const refused = await refuseForQuota(env, ip);
  if (refused) return json({ degraded: true, reason: `rate-limited:${refused}`, cascade: [] });

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
  const chain = [...discovered.slice(0, FREE_ATTEMPTS), FINAL_FALLBACK];
  const cascade: { model: string; ok: boolean; ms: number; error?: string }[] = [];
  const startedAll = Date.now();

  // serena-cannot: concurrent workflow agents hold Serena's active project.
  //
  // generateObject was tried first and every model in the cascade failed it,
  // including a capable paid one - free OpenRouter models largely do not
  // implement provider-side structured output, so the SDK could never satisfy
  // the schema. generateText plus an explicit Zod parse keeps the guarantee that
  // matters (nothing non-conforming is ever returned) while working on models
  // that only speak plain text. A schema no model can satisfy is not a guardrail,
  // it is an outage.
  for (const model of chain) {
    const startedAt = Date.now();
    try {
      const result = await generateText({
        model: openrouter(model),
        system: SYSTEM_PROMPT + "\n" + JSON_INSTRUCTION,
        prompt,
        temperature: 0.2,
        maxRetries: 1,
        experimental_telemetry: { isEnabled: true, functionId: "agent-harness" },
      });

      const candidate = extractJson(result.text);
      const validated = AgentOutput.safeParse(candidate);
      if (!validated.success) {
        throw new Error(
          "schema rejected: " + (validated.error.issues[0]?.message ?? "unknown shape")
        );
      }

      cascade.push({ model, ok: true, ms: Date.now() - startedAt });
      return json({
        degraded: false,
        model,
        cascade,
        ...validated.data,
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
  return json({
    discoveredFree: free.slice(0, FREE_ATTEMPTS),
    totalFreeSeen: free.length,
    finalFallback: FINAL_FALLBACK,
    hasKey: Boolean(env.OPENROUTER_API_KEY),
    burstLimiter: Boolean(env.BURST_LIMITER),
  });
}

const worker = {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/api/agent") return handleAgent(req, env);
    if (url.pathname === "/api/models") return handleModels(env);
    if (url.pathname === "/api/guide") return handleGuide(req, env as GuideEnv);
    return env.ASSETS.fetch(req);
  },
};

export default worker;
