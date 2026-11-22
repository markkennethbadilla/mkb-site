import { waitUntil } from "cloudflare:workers";

export type GenerationEvent = {
  traceId: string;
  provider: string;
  model: string;
  input: string;
  startedAt: number;
  usage?: { inputTokens?: number; outputTokens?: number };
  output?: unknown;
  error?: unknown;
};

/** One PostHog `$ai_generation` event per model call, sent after the response is returned. */
export function watchGeneration(env: Env, e: GenerationEvent): void {
  if (!env.POSTHOG_KEY) return;
  const properties = {
    $ai_trace_id: e.traceId,
    $ai_provider: e.provider,
    $ai_model: e.model,
    $ai_input: [{ role: "user", content: e.input }],
    $ai_input_tokens: e.usage?.inputTokens,
    $ai_output_tokens: e.usage?.outputTokens,
    $ai_output_choices: e.output === undefined ? undefined : [{ role: "assistant", content: e.output }],
    $ai_latency: (Date.now() - e.startedAt) / 1000,
    ...(e.error ? { $ai_is_error: true, $ai_error: String(e.error).slice(0, 300) } : {}),
    site: "mkb-site",
  };
  waitUntil(
    fetch(`${env.POSTHOG_HOST ?? "https://us.i.posthog.com"}/i/v0/e/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ api_key: env.POSTHOG_KEY, event: "$ai_generation", distinct_id: "mkb-site-worker", properties }),
    }).catch((err) => console.error("posthog capture FAIL", String(err))),
  );
}
