// BUDGET-CAP: openrouter/personal-api-key 1USD-monthly (provider key limit), 0.10USD-per-run via src/lib/spend-cap.ts
// BUDGET-ALERT: ops-alert
/**
 * Which LLMs the guide falls back to when the decision model (worker/decide.ts) finds no answer on the page.
 *
 * A leaf module with no imports, so scripts/probe-guide.mjs can load it under plain Node.
 *
 * Measured on the real task through OpenRouter (scripts/bench-guide.mjs, six
 * representative questions, one round trip each, 2026-11-27):
 *
 *   openai/gpt-oss-120b:nitro          mean  952 ms  6/6  $0.05 / $0.25 per M
 *   google/gemini-3.1-flash-lite:nitro mean 1012 ms  6/6  $0.25 / $1.50 per M
 *   openai/gpt-oss-20b:nitro           mean 1159 ms  6/6  $0.03 / $0.13 per M
 *   deepseek/deepseek-v4-flash-0731    mean 2173 ms  5/6
 *   qwen/qwen3.7-flash                 mean 3092 ms  6/6
 *
 * `:nitro` routes to the fastest host for the model. Fastest first, cheapest second.
 */

export const GUIDE_CHAIN = ["openai/gpt-oss-120b:nitro", "openai/gpt-oss-20b:nitro"] as const;

export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// The score-audit room's SQL agent was validated on DeepSeek; it keeps that model and key.
export const AUDIT_MODEL = "deepseek-v4-flash";
export const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
