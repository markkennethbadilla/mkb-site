// Measures the guide's real task on each blessed DeepSeek model, so the model
// choice is decided by latency and correctness rather than by assumption.
//
// The question it settles: the blessed list puts deepseek-v4-pro on "chatbots and
// real applications" and deepseek-v4-flash on "small/bulk". This guide is a
// chatbot by framing but a small task by content - pick one of seven sections and
// restate a fact it was handed. If flash routes just as well at materially lower
// latency, flash is the correct primary and pro is the wrong default.
//
// Key is read from the vault by slug at point of use. Never written to disk.
//
// Usage: node scripts/bench-guide.mjs

import { readFileSync } from "node:fs";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { SECTION_IDS, buildGuidePrompt } from "../src/lib/site-sections.ts";
import { FACTS_BRIEF } from "../src/lib/public-facts.ts";

const VAULT = process.env.MKB_VAULT_CSV ?? "A:\\credentials\\personal-credential-vault.csv";

function parseCsv(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const cred = parseCsv(readFileSync(VAULT, "utf8")).find((r) => r.credential_slug === "deepseek/personal-api-key");
if (!cred?.secret_value) {
  console.error("No deepseek/personal-api-key in the vault.");
  process.exit(1);
}

const deepseek = createOpenAICompatible({
  name: "deepseek",
  baseURL: "https://api.deepseek.com",
  apiKey: cred.secret_value,
  supportsStructuredOutputs: false,
});

const SYSTEM = buildGuidePrompt(FACTS_BRIEF);

const CASES = [
  { q: "where did he go to school", want: "education" },
  { q: "what is he working on right now", want: "work" },
  { q: "how do I contact him", want: "contact" },
  { q: "does he have any pets", want: "IN-PLACE" },
  { q: "what is his favourite colour", want: "IN-PLACE" },
  { q: "what is the capital of France", want: "DECLINE" },
];

async function run(model, question) {
  let section = null, declined = false, answer = null;
  const toolbox = {
    navigate_to_section: tool({
      description: "Take the visitor to the section of the page that answers their question.",
      inputSchema: z.object({ section: z.enum(SECTION_IDS) }),
      execute: async ({ section: s }) => { section = s; return { ok: true, showing: s }; },
    }),
    answer: tool({
      description:
        "Say the answer in one or two short sentences, using only what you were told about Mark. Call this AFTER navigate_to_section when a section of the page shows the answer, or ON ITS OWN when it does not.",
      inputSchema: z.object({ text: z.string().min(1).max(320) }),
      execute: async ({ text }) => { answer = text; return { ok: true }; },
    }),
    decline: tool({
      description: "Use when the question is not about Mark, his work, or this page.",
      inputSchema: z.object({ reason: z.string().max(120) }),
      execute: async () => { declined = true; return { ok: true }; },
    }),
  };

  const t0 = Date.now();
  const result = await generateText({
    model: deepseek(model),
    system: SYSTEM,
    prompt: question,
    tools: toolbox,
    stopWhen: stepCountIs(4),
    temperature: 0.3,
    maxRetries: 1,
  });
  const ms = Date.now() - t0;

  if (!section && !answer && !declined) declined = true;
  return {
    ms,
    got: declined ? "DECLINE" : section ? section : "IN-PLACE",
    answer,
    tokens: (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0),
  };
}

for (const model of ["deepseek-v4-flash", "deepseek-v4-pro"]) {
  console.log(`\n=== ${model} ===`);
  const times = [];
  let correct = 0;
  for (const c of CASES) {
    try {
      const r = await run(model, c.q);
      times.push(r.ms);
      const ok = r.got === c.want;
      if (ok) correct++;
      console.log(
        `  ${ok ? "pass" : "FAIL"}  ${String(r.ms).padStart(5)}ms  ${r.tokens.toString().padStart(5)}tok  "${c.q}" -> ${r.got}` +
          (r.answer ? `\n           ${r.answer}` : "")
      );
    } catch (e) {
      console.log(`  ERR   "${c.q}" -> ${String(e).slice(0, 90)}`);
    }
  }
  if (times.length) {
    const sorted = [...times].sort((a, b) => a - b);
    const mean = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    console.log(`  ${correct}/${CASES.length} correct   mean ${mean}ms   median ${sorted[Math.floor(sorted.length / 2)]}ms   max ${sorted[sorted.length - 1]}ms`);
  }
}
