/**
 * Free-model discovery and the two spend controls, shared by both demos.
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

export interface Env {
  ASSETS: Fetcher;
  DEMO_KV: KVNamespace;
  DEMO_DB?: D1Database;
  OPENROUTER_API_KEY?: string;
  /** Mark's own DeepSeek key. The guide runs on this; the old harness does not. */
  DEEPSEEK_API_KEY?: string;
  /** Cloudflare native rate limiter, 6/60s. Absent in local dev; treated as open. */
  BURST_LIMITER?: { limit: (o: { key: string }) => Promise<{ success: boolean }> };
  /** 60/60s, for endpoints a single click legitimately calls in a burst. */
  DEMO_LIMITER?: { limit: (o: { key: string }) => Promise<{ success: boolean }> };
}

import { reserve } from "./budget";

export const FINAL_FALLBACK = "deepseek/deepseek-v4-flash";
export const MAX_ATTEMPTS = 3;

// The guide's model chain lives in src/lib/guide-models.ts, a leaf module, so the
// probe can load it under Node and test what actually ships. Re-exported here
// because the Worker is where callers expect to find it.
export { GUIDE_CHAIN, DEEPSEEK_BASE_URL } from "../src/lib/guide-models";

const CACHE_PREFIX = "openrouter:free-models:v4";
const CACHE_TTL = 3600;

/**
 * A ceiling on MODEL CALLS, not requests. One guide question can spend several
 * calls, so counting requests would let a single visitor burn the day's budget in
 * a handful of clicks.
 */
/**
 * Tightened hard when the guide moved from free inference to a paid key. 1500
 * calls a day was a sensible ceiling when a call cost nothing; at roughly 5k
 * tokens a call against a metered balance it is not. The cache absorbs repeats,
 * so this bounds genuinely distinct questions per day, and the key's own spending
 * cap is the backstop underneath it.
 */
const DAILY_MODEL_CALLS = 300;

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
 * The guide's quota, which is now TWO different ceilings measuring two different
 * scarce things:
 *
 *   - MODEL CALLS, counted here. This is inference spend. One question can cost
 *     several calls, so counting requests would let a handful of clicks drain the
 *     day's free-tier inference.
 *   - WORKER REQUESTS, counted in budget.ts against a pool reserved for the guide.
 *     This is the platform's 100k/day, shared with every other route on the site.
 *
 * They are separate because they run out for different reasons. Before the pools
 * existed, a demo firing its fan-out could exhaust the shared request quota and
 * silently take the guide down with it; now the guide's allocation is its own and
 * nothing else can spend it.
 *
 * Both reserve up front rather than incrementing per call: a request that is going
 * to blow a ceiling should be refused before it starts, not halfway through a run
 * the visitor is already watching.
 */
export async function refuseForQuota(env: Env, ip: string, calls = 1): Promise<string | null> {
  const refused = await reserve(env, "guide", ip, 1);
  if (refused) return refused.reason === "burst" ? "burst" : "daily-cap";

  const dayKey = `rl:calls:${new Date().toISOString().slice(0, 10)}`;
  const spent = Number((await env.DEMO_KV.get(dayKey)) ?? 0);
  if (spent + calls > DAILY_MODEL_CALLS) return "daily-cap";
  await env.DEMO_KV.put(dayKey, String(spent + calls), { expirationTtl: 90000 });
  return null;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
