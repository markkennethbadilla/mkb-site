/// <reference types="@cloudflare/vitest-plugin/types" />
/// <reference types="vite/client" />
/**
 * Rule 43: every POST to /api/* is a row in inbound_requests before any handler
 * can refuse it - malformed, over budget, or keyless. Proved against real local D1,
 * plus a source-order check so the record cannot drift below a route.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import worker from "./index";
import src from "./index.ts?raw";

beforeAll(async () => {
  await applyD1Migrations(env.DEMO_DB, env.TEST_DEMO_MIGRATIONS);
});

const rows = (ip: string) =>
  env.DEMO_DB.prepare("SELECT path, body FROM inbound_requests WHERE ip = ?1 ORDER BY id").bind(ip).all<{ path: string; body: string }>();

describe("records first", () => {
  it("keeps a malformed guide question and a refused agent call, whole", async () => {
    const ip = `rec-${crypto.randomUUID()}`;
    const send = (path: string, body: string) =>
      worker.fetch(new Request(`https://markkennethbadilla.com${path}`, { method: "POST", headers: { "cf-connecting-ip": ip }, body }), env);
    const junk = "not json {" + "x".repeat(5000);
    await send("/api/guide", junk);
    await send("/api/agent", '{"instruction":""}');
    const { results } = await rows(ip);
    expect(results).toEqual([
      { path: "/api/guide", body: junk },
      { path: "/api/agent", body: '{"instruction":""}' },
    ]);
  });

  it("records before the first route in the fetch handler", () => {
    const fetchAt = src.indexOf("async fetch(req");
    const record = src.indexOf("await recordInbound(", fetchAt);
    const firstRoute = src.indexOf("return handle", fetchAt);
    expect(fetchAt).toBeGreaterThan(-1);
    expect(record).toBeGreaterThan(fetchAt);
    expect(record).toBeLessThan(firstRoute);
  });
});
