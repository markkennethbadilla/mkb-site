import { afterEach, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { watchGeneration } from "./analytics";

afterEach(() => vi.restoreAllMocks());

it("sends one $ai_generation event with model, tokens, latency and trace id", async () => {
  const sent: { url: string; body: Record<string, any> }[] = [];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    sent.push({ url: String(url), body: JSON.parse(String(init?.body)) });
    return new Response("{}");
  });
  watchGeneration(
    { ...env, POSTHOG_KEY: "phc_test", POSTHOG_HOST: "https://us.i.posthog.com" },
    {
      traceId: "t1",
      provider: "deepseek",
      model: "deepseek-v4-flash",
      input: "hi",
      startedAt: Date.now() - 50,
      usage: { inputTokens: 21, outputTokens: 6 },
      output: "ok",
    },
  );
  await vi.waitFor(() => expect(sent).toHaveLength(1));
  expect(sent[0].url).toBe("https://us.i.posthog.com/i/v0/e/");
  expect(sent[0].body).toMatchObject({ api_key: "phc_test", event: "$ai_generation" });
  expect(sent[0].body.properties).toMatchObject({
    $ai_trace_id: "t1",
    $ai_model: "deepseek-v4-flash",
    $ai_input_tokens: 21,
    $ai_output_tokens: 6,
  });
  expect(sent[0].body.properties.$ai_latency).toBeGreaterThan(0);
});

it("sends nothing without a key", () => {
  const spy = vi.spyOn(globalThis, "fetch");
  watchGeneration({ ...env, POSTHOG_KEY: undefined }, { traceId: "t", provider: "p", model: "m", input: "i", startedAt: Date.now() });
  expect(spy).not.toHaveBeenCalled();
});
