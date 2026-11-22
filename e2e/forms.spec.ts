import { readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import type { Page } from "@playwright/test";

import { asVisitor, expect, test } from "./fixtures";

type Row = { path: string; ip: string; body: string };

const D1_DIR = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";

// Reads the local D1 file the dev server writes (rule 43 record), never production.
function rowsFor(ip: string): Row[] {
  for (const file of readdirSync(D1_DIR).filter((f) => f.endsWith(".sqlite") && f !== "metadata.sqlite")) {
    const db = new DatabaseSync(`${D1_DIR}/${file}`, { readOnly: true });
    try {
      if (!db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'inbound_requests'").get()) continue;
      return db.prepare("SELECT path, ip, body FROM inbound_requests WHERE ip = ? ORDER BY id").all(ip) as Row[];
    } finally {
      db.close();
    }
  }
  throw new Error("no local DEMO_DB with inbound_requests under " + D1_DIR);
}

const stamp = () => `${Date.now()}`.slice(-9);
const ipOf = () => `198.51.100.${(Number(stamp()) % 250) + 1}`;

const ask = async (page: Page, question: string) => {
  await page.goto("/");
  const input = page.locator("#site-guide-question");
  await page.getByLabel("Ask anything about his work").first().focus();
  await expect(input).toBeVisible({ timeout: 20_000 });
  await input.fill(question);
  return input;
};

test("a guide question is stored whole before the answer shows", async ({ browser }) => {
  const ip = ipOf();
  const page = await (await browser.newContext(asVisitor(ip))).newPage();
  const question = `[TEST] who is Mark ${stamp()}`;
  await ask(page, question);
  const reply = page.waitForResponse((r) => r.url().endsWith("/api/guide"));
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  expect((await reply).status()).toBe(200);
  const rows = rowsFor(ip);
  expect(rows).toHaveLength(1);
  expect(rows[0].path).toBe("/api/guide");
  expect(JSON.parse(rows[0].body)).toEqual({ question });
});

test("a double submit of the guide sends and stores one request", async ({ browser }) => {
  const ip = ipOf();
  const page = await (await browser.newContext(asVisitor(ip))).newPage();
  const posts: string[] = [];
  page.on("request", (r) => r.method() === "POST" && posts.push(r.url()));
  await ask(page, `[TEST] double ${stamp()}`);
  await page.getByRole("button", { name: "Ask", exact: true }).dblclick();
  await page.waitForResponse((r) => r.url().endsWith("/api/guide"));
  expect(posts.filter((u) => u.endsWith("/api/guide"))).toHaveLength(1);
  expect(rowsFor(ip)).toHaveLength(1);
});

// Rule 91 gap: nothing saves a half-typed guide question yet, so this fails by design until a partial endpoint exists.
test("an abandoned guide question leaves a server record", async ({ browser }) => {
  test.fail(true, "rule 91: partial guide input is not saved yet");
  const ip = ipOf();
  const page = await (await browser.newContext(asVisitor(ip))).newPage();
  await ask(page, `[TEST] abandoned ${stamp()}`);
  await page.goto("/resume/");
  expect(rowsFor(ip)).toHaveLength(1);
});

test("a demo run left mid-flight is already recorded", async ({ browser }) => {
  const ip = ipOf();
  const page = await (await browser.newContext(asVisitor(ip))).newPage();
  await page.goto("/demos/ledger-under-fire/");
  const started = page.waitForRequest((r) => r.url().includes("/api/demos/ledger-under-fire/start"));
  await page.getByRole("button", { name: "Fire 12 concurrent payments" }).click();
  await started;
  await page.goto("/resume/");
  const rows = rowsFor(ip);
  expect(rows.filter((r) => r.path === "/api/demos/ledger-under-fire/start")).toHaveLength(1);
});

test("a double submit of a demo run starts one run", async ({ browser }) => {
  const ip = ipOf();
  const page = await (await browser.newContext(asVisitor(ip))).newPage();
  await page.goto("/demos/ledger-under-fire/");
  const done = page.waitForResponse((r) => r.url().includes("/api/demos/ledger-under-fire/start"));
  await page.getByRole("button", { name: "Fire 12 concurrent payments" }).dblclick();
  await done;
  expect(rowsFor(ip).filter((r) => r.path === "/api/demos/ledger-under-fire/start")).toHaveLength(1);
});

test("the same body posted twice is stored twice, and junk is stored too", async ({ request }) => {
  const ip = ipOf();
  const headers = { "cf-connecting-ip": ip, "content-type": "application/json" };
  const body = JSON.stringify({ question: `[TEST] replay ${stamp()}` });
  await request.post("/api/guide", { headers, data: Buffer.from(body) });
  await request.post("/api/guide", { headers, data: Buffer.from(body) });
  await request.post("/api/guide", { headers, data: Buffer.from("[TEST] not json {") });
  const rows = rowsFor(ip);
  expect(rows.map((r) => r.body)).toEqual([body, body, "[TEST] not json {"]);
});
