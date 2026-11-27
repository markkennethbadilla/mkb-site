/// <reference types="@cloudflare/vitest-plugin/types" />
import { beforeAll, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { applyD1Migrations } from "cloudflare:test";
import worker from "./index";

beforeAll(async () => {
  await applyD1Migrations(env.DEMO_DB, env.TEST_DEMO_MIGRATIONS);
});

const post = (path: string, ip: string, token?: string) =>
  worker.fetch(
    new Request(`https://markkennethbadilla.com${path}`, {
      method: "POST",
      headers: { "cf-connecting-ip": ip, "content-type": "application/json", ...(token ? { "cf-turnstile-response": token } : {}) },
      body: JSON.stringify({ question: "[TEST] what does he build?" }),
    }),
    { ...env, AI: undefined, OPENROUTER_API_KEY: undefined } as unknown as Env,
  );

describe("bot check (I06)", () => {
  it("lets the guide and a demo run through without a token (Turnstile is optional) and records both (rule 43)", async () => {
    const ip = `bot-${crypto.randomUUID()}`;
    const guide = await post("/api/guide", ip);
    const demo = await post("/api/demos/ledger-under-fire/start", ip);
    expect(guide.status).toBe(200);
    expect(demo.status).not.toBe(403);
    const { results } = await env.DEMO_DB.prepare("SELECT path FROM inbound_requests WHERE ip = ?1").bind(ip).all();
    expect(results.map((r) => r.path)).toEqual(["/api/guide", "/api/demos/ledger-under-fire/start"]);
  });

  it("lets a run with a token through to the room", async () => {
    const res = await post("/api/demos/ledger-under-fire/start", `bot-${crypto.randomUUID()}`, "XXXX.DUMMY.TOKEN");
    expect(res.status).not.toBe(403);
  });

  it("closes the endpoint when production has no secret", async () => {
    const res = await worker.fetch(
      new Request("https://markkennethbadilla.com/api/guide", { method: "POST", headers: { "cf-turnstile-response": "x" }, body: "{}" }),
      { ...env, TURNSTILE_SECRET: undefined },
    );
    expect(res.status).toBe(503);
  });
});
