/// <reference types="@cloudflare/vitest-plugin/types" />
import { beforeAll, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import { getSimplePaths } from "xstate/graph";
import type { AnyStateMachine } from "xstate";
import worker from "./index";
import { remember } from "./cache";
import { agentFlow, demoFlow, guideFlow } from "./flows";

const CACHED_Q = "[TEST] where did he study";
const TOKEN = { "cf-turnstile-response": "XXXX.DUMMY.TOKEN" };
const ROOM = "ledger-under-fire";

beforeAll(async () => {
  await applyD1Migrations(env.DEMO_DB, env.TEST_DEMO_MIGRATIONS);
  await remember(env.DEMO_DB, CACHED_Q, { section: "education", answer: "[TEST] cached", declined: false, grounded: true });
});

type Call = { path: string; method?: string; headers?: Record<string, string>; body?: unknown; env?: object };
type Case = { call: Call; ok: (status: number) => boolean; check?: (res: Response) => Promise<void> };

const send = (c: Call, ip: string) =>
  worker.fetch(
    new Request(`https://markkennethbadilla.com${c.path}`, {
      method: c.method ?? "POST",
      headers: { "cf-connecting-ip": ip, "content-type": "application/json", ...c.headers },
      body: (c.method ?? "POST") === "POST" ? JSON.stringify(c.body ?? {}) : undefined,
    }),
    { ...env, ...c.env } as typeof env,
  );

// Walks every simple path of a machine against the real handler, then asserts every state was reached and each request recorded (rule 43).
async function walk(machine: AnyStateMachine, cases: Record<string, Case>) {
  const reached = new Set<string>();
  for (const path of getSimplePaths(machine)) {
    const ip = `flow-${crypto.randomUUID()}`;
    const steps = path.steps.filter(({ event }) => event.type in cases);
    path.steps.forEach(({ state }) => reached.add(String(state.value)));
    for (const { event } of steps) {
      const c = cases[event.type];
      const res = await send(c.call, ip);
      expect(c.ok(res.status), `${event.type} on the path to ${String(path.state.value)}: ${res.status}`).toBe(true);
      await c.check?.(res);
    }
    const { results } = await env.DEMO_DB.prepare("SELECT path FROM inbound_requests WHERE ip = ?1").bind(ip).all();
    expect(results.length, "rule 43: one record per request").toBe(steps.filter(({ event }) => cases[event.type].call.method !== "GET").length);
  }
  expect([...reached].sort()).toEqual(Object.keys(machine.config.states ?? {}).sort());
}

const is = (n: number) => (s: number) => s === n;
const guide = (body: unknown, headers: Record<string, string> = TOKEN): Call => ({ path: "/api/guide", body, headers, env: { OPENROUTER_API_KEY: undefined, AI: undefined } });

it("every simple path of the guide flow reaches its state on the real handler", () =>
  walk(guideFlow, {
    NO_TOKEN: { call: guide({ question: "[TEST] qzxv" }, {}), ok: is(403) },
    BAD_BODY: { call: guide({ question: "" }), ok: is(400) },
    VALID_UNCACHED: { call: guide({ question: "[TEST] qzxv wkjh plmn" }), ok: is(200) },
    VALID_CACHED: {
      call: guide({ question: CACHED_Q }),
      ok: is(200),
      check: async (r) => expect(((await r.json()) as { cached: boolean }).cached).toBe(true),
    },
  }));

it("every simple path of the demo room flow reaches its state on the real handler", () =>
  walk(demoFlow, {
    UNKNOWN_ROOM: { call: { path: "/api/demos/nope/start" }, ok: is(404) },
    NO_ACTION: { call: { path: `/api/demos/${ROOM}` }, ok: is(404) },
    NO_RUN_ID: { call: { path: `/api/demos/${ROOM}/bogus-action` }, ok: is(400) },
    START_NO_TOKEN: { call: { path: `/api/demos/${ROOM}/start` }, ok: is(403) },
    START_WITH_TOKEN: { call: { path: `/api/demos/${ROOM}/start`, headers: TOKEN }, ok: (s) => s !== 403 && s < 500 },
  }));

it("every simple path of the agent flow reaches its state on the real handler", () =>
  walk(agentFlow, {
    NOT_POST: { call: { path: "/api/agent", method: "GET" }, ok: is(405) },
    NO_KEY: { call: { path: "/api/agent", env: { OPENROUTER_API_KEY: undefined } }, ok: is(200) },
    BAD_BODY: { call: { path: "/api/agent", body: { instruction: "" }, env: { OPENROUTER_API_KEY: "x" } }, ok: is(400) },
  }));
