/// <reference types="@cloudflare/vitest-plugin/types" />
import { beforeAll, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import { getSimplePaths } from "xstate/graph";
import worker from "./index";
import { remember } from "./cache";
import { guideFlow } from "./guide-flow";

const STATUS = { NO_TOKEN: 403, BAD_BODY: 400, VALID_UNCACHED: 200, VALID_CACHED: 200 } as const;
type Step = keyof typeof STATUS;
const CACHED_Q = "[TEST] where did he study";

beforeAll(async () => {
  await applyD1Migrations(env.DEMO_DB, env.TEST_DEMO_MIGRATIONS);
  await remember(env.DEMO_DB, CACHED_Q, { section: "education", answer: "[TEST] cached", declined: false, grounded: true });
});

const send = (type: Step, ip: string) =>
  worker.fetch(
    new Request("https://markkennethbadilla.com/api/guide", {
      method: "POST",
      headers: { "cf-connecting-ip": ip, "content-type": "application/json", ...(type === "NO_TOKEN" ? {} : { "cf-turnstile-response": "XXXX.DUMMY.TOKEN" }) },
      body: JSON.stringify({ question: type === "BAD_BODY" ? "" : type === "VALID_CACHED" ? CACHED_Q : "[TEST] qzxv wkjh plmn" }),
    }),
    { ...env, DEEPSEEK_API_KEY: undefined },
  );

it("every simple path of the guide flow machine reaches its state on the real handler", async () => {
  const reached = new Set<string>();
  for (const path of getSimplePaths(guideFlow)) {
    const ip = `flow-${crypto.randomUUID()}`;
    const steps = path.steps.filter(({ event }) => event.type in STATUS);
    path.steps.forEach(({ state }) => reached.add(String(state.value)));
    for (const { event } of steps) {
      const res = await send(event.type as Step, ip);
      expect(res.status, `${event.type} on the path to ${String(path.state.value)}`).toBe(STATUS[event.type as Step]);
      if (event.type === "VALID_CACHED") expect(((await res.json()) as { cached: boolean }).cached).toBe(true);
    }
    const { results } = await env.DEMO_DB.prepare("SELECT path FROM inbound_requests WHERE ip = ?1").bind(ip).all();
    expect(results.length, "rule 43: one record per request").toBe(steps.length);
  }
  expect([...reached].sort()).toEqual(Object.keys(guideFlow.states).sort());
});
