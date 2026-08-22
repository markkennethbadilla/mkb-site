/**
 * Free-model discovery and the inference ceiling, shared by every route that
 * talks to a model.
 *
 * ONE COPY, and it is worth saying why that is a fix. worker/index.ts carried a
 * near-identical fork of the discovery code below, down to the same filters and
 * the same sort - but with its own KV cache key, so the same model list was
 * fetched, filtered and stored twice and the two copies could disagree about which
 * models a page was allowed to use. Same code in two files is not duplication you
 * pay for once. It is two behaviours wearing one name.
 *
 * Models are DISCOVERED, never hardcoded: OpenRouter's free tier churns, and a
 * pinned slug guarantees a dead demo within weeks. Only the final fallback is
 * fixed.
 *
 * The guide needs models that can actually call tools, which is a narrower set
 * than "free and text-only" - so discovery takes a capability filter rather than
 * the guide hoping and failing. At the time of writing 14 of the 15 free
 * text-only models advertise tool support, so the filter costs almost nothing and
 * removes a whole class of runtime failure.
 */

import { reserve } from "./budget";

export const FINAL_FALLBACK = "deepseek/deepseek-v4-flash";
export const MAX_ATTEMPTS = 3;

// The guide's model chain lives in src/lib/guide-models.ts, a leaf module, so the
// probe can load it under Node and test what actually ships. Re-exported here
// because the Worker is where callers expect to find it.
export { GUIDE_CHAIN, DEEPSEEK_BASE_URL } from "../src/lib/guide-models";

const CACHE_PREFIX = "openrouter:free-models:v4";
const CACHE_TTL = 3600;

type OpenRouterModel = {
  id: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
  supported_parameters?: string[];
  architecture?: { modality?: string; input_modalities?: string[]; output_modalities?: string[] };
};

/**
 * The free tier is not all chat models - it includes image and audio generation.
 *
 * Note the trap: Google's Lyria advertises output_modalities ["text","audio"], so
 * a naive outputs.includes("text") accepts a music model. A usable chat model
 * emits text and NOTHING else, so the test has to be exclusive, not inclusive.
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

function supportsTools(m: OpenRouterModel): boolean {
  return Array.isArray(m.supported_parameters) && m.supported_parameters.includes("tools");
}

export async function discoverFreeModels(
  env: Env,
  { requireTools = false } = {}
): Promise<string[]> {
  const key = requireTools ? `${CACHE_PREFIX}:tools` : CACHE_PREFIX;
  const cached = await env.DEMO_KV.get(key, "json");
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
      .filter((m) => (requireTools ? supportsTools(m) : true))
      .sort((a, b) => (b.context_length ?? 0) - (a.context_length ?? 0))
      .map((m) => m.id)
      .slice(0, 8);
    if (ids.length) {
      await env.DEMO_KV.put(key, JSON.stringify(ids), { expirationTtl: CACHE_TTL });
    }
    return ids;
  } catch {
    return [];
  }
}

/**
 * The INFERENCE ceiling, which is a different scarce thing from the request
 * ceiling and runs out for different reasons.
 *
 *   - MODEL CALLS are inference spend. One question can cost several, so counting
 *     requests alone would let a handful of clicks drain the day's budget.
 *   - WORKER REQUESTS are the platform's 100k a day, shared with every other route
 *     on the site. The caller reserves those before it gets here.
 *
 * Two ceilings, ONE STORE. This used to reserve the request pool a second time and
 * then keep its own KV counter, which double-charged the guide's request budget,
 * spent two of its six-a-minute edge limiter hits per question, and left the model
 * counter on the read-then-write pattern budget.ts exists to delete. It is now one
 * atomic reserve against a third pool in the same table.
 *
 * It reserves up front rather than counting per call: a question that is going to
 * blow the ceiling should be refused before it starts, not halfway through an
 * answer the visitor is already reading.
 */
export async function refuseForQuota(env: Env, ip: string, calls = 1): Promise<string | null> {
  const refused = await reserve(env, "calls", ip, calls);
  return refused ? "daily-cap" : null;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
