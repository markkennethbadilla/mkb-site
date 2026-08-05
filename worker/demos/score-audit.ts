/**
 * POST /api/demos/score-audit/run - the ScoreAudit room's only endpoint.
 *
 * One request, one model call, the whole audit. The model gets a fixed list of
 * questions about the live Tidewater warehouse and is required to commit to a
 * numeric answer and a confidence (0-100) for each one. Separately, without
 * reading anything the model did, this file runs its OWN verifying SQL -
 * src/lib/demos/score-audit-questions.ts - against the same database and
 * compares. The model never sees that SQL and never sees the true answer, so it
 * cannot pass by reverse-engineering the check.
 *
 * THE PRESET CHANGES ONE THING: whether `query_db` is in the toolbox.
 *
 *   grounded    - the model may run its own read-only SELECTs first.
 *   from-memory - the same six questions with the tool withheld.
 *
 * This is a correction, and it is worth reading. The first version varied the
 * QUESTIONS instead, on the theory that joins and date boundaries are where a
 * model goes confidently wrong. Measured against the real endpoint, it answered
 * all six of the hard ones correctly at 98 percent confidence - a calibration gap
 * of MINUS two - because it had a query tool and simply looked. The room would
 * have shipped a wall label saying the preset was chosen to fail above a screen
 * of six green ticks, which is the exact defect this whole site argues against.
 *
 * Withholding the tool is honest in a way rigging the questions was not. Tidewater
 * is invented, so from memory the model CANNOT know these numbers - they exist
 * nowhere but this database. The only well-calibrated answer is a low confidence,
 * and whatever it reports instead is the finding. Nothing is engineered to fail;
 * one preset removes the thing that made the other work.
 *
 * THE TOOLS. `query_db` runs whatever SELECT/WITH the model writes, through
 * src/lib/sql-guard.ts - which was written for exactly this case, untrusted
 * model-authored SQL, and had no consumer until this room. `submit_answers` is
 * the only way an answer reaches this file, so free text is never read and a
 * model that never calls it produces no result rather than an invented one.
 *
 * MAX_STEPS is a tool-call budget, not a model cascade: this room always calls
 * GUIDE_CHAIN[0] and nothing else, because falling back to a second model would
 * silently answer a different question under the same "the model" label.
 */

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { DEEPSEEK_BASE_URL, GUIDE_CHAIN } from "../../src/lib/guide-models";
import { QUESTIONS, CAN_QUERY, type Question } from "../../src/lib/demos/score-audit-questions";
import { guardSql } from "../../src/lib/sql-guard";
import { json, type DemoEnv } from "./router";

export const START_ACTIONS = ["run"] as const;

/** Tool-call ceiling for the whole run - see the file header for the budget math. */
const MAX_STEPS = 10;

const RunRequest = z.object({ preset: z.enum(["grounded", "from-memory"]) });

// Given to the model as context, not as a hint - column names and enum values
// only, no row counts and no data. Without this a tool-calling model cannot
// write a valid query at all; it is the minimum a real analyst would also need.
const SCHEMA = `plans(id, code, name, monthly_cents, seat_cents, is_active)
customers(id, name, country, industry, signed_up_at, status: active|churned|trial)
subscriptions(id, customer_id, plan_id, seats, started_at, ended_at, status: active|cancelled|paused)
invoices(id, customer_id, subscription_id, issued_at, due_at, currency, total_cents, status: draft|open|paid|void|uncollectible)
invoice_lines(id, invoice_id, kind, description, quantity, unit_cents, amount_cents)
payments(id, invoice_id, customer_id, paid_at, amount_cents, method: card|ach|wire|credit, external_ref)
usage_events(id, customer_id, occurred_at, metric, quantity)
support_tickets(id, customer_id, opened_at, closed_at, priority: low|normal|high|urgent, subject, status: open|pending|resolved)`;

function buildSystemPrompt(questions: Question[], canQuery: boolean): string {
  // The from-memory prompt says plainly that there is no tool and does NOT
  // suggest what confidence to give. Telling it to be humble would produce
  // humility and measure nothing; the whole point is what it reports unprompted.
  const tools = canQuery
    ? `Tools:
  - query_db(sql): run ONE read-only SELECT or WITH statement to check a fact before you answer. Returns up to 20 rows and a row count.
  - submit_answers(answers): your FINAL answer. Call it once, with one entry per question id below, each carrying a numeric answer and a confidence from 0 (pure guess) to 100 (certain).

You have ${MAX_STEPS} tool calls total, including the final submission. Most questions need at most one query - check what you are unsure about, then submit all of them in one call.`
    : `Tools:
  - submit_answers(answers): your FINAL answer. Call it once, with one entry per question id below, each carrying a numeric answer and a confidence from 0 (pure guess) to 100 (certain).

You have NO way to query the database on this run. Answer every question anyway, with your best numeric estimate.`;

  return `You are auditing the live Tidewater Analytics warehouse, a real read-only Cloudflare D1 database - every table is SELECT-only, nothing you write persists.

${tools}

Schema:
${SCHEMA}

Questions:
${questions.map((q) => `${q.id}: ${q.prompt}`).join("\n")}

State confidence honestly: a wrong answer given with high confidence is exactly what this audit measures.`;
}

type Decision = {
  answers: Map<string, { answer: number; confidence: number }>;
  queries: { sql: string; ok: boolean; rowCount?: number; error?: string }[];
};

/** Fresh per request, like guide-tools.ts's buildToolbox - a shared mutable record
 *  bound at module scope would leak one visitor's run into another's. */
function buildToolbox(env: DemoEnv, decision: Decision, ids: [string, ...string[]], canQuery: boolean) {
  const submit = {
    submit_answers: tool({
      description: "Record your final numeric answer and confidence (0-100) for one or more questions, by id.",
      inputSchema: z.object({
        answers: z
          .array(
            z.object({
              id: z.enum(ids).describe("The question id, exactly as given."),
              answer: z.number().describe("Your numeric answer."),
              confidence: z.number().min(0).max(100).describe("0 = pure guess, 100 = certain."),
            })
          )
          .min(1),
      }),
      execute: async ({ answers }: { answers: { id: string; answer: number; confidence: number }[] }) => {
        for (const a of answers) decision.answers.set(a.id, { answer: a.answer, confidence: a.confidence });
        return { ok: true, recorded: decision.answers.size };
      },
    }),
  };

  // Withheld, not disabled. A query tool that exists and refuses would tell the
  // model the answer is checkable and change what it does; on this preset it
  // simply is not in the toolbox.
  if (!canQuery) return submit;

  return {
    ...submit,
    query_db: tool({
      description: "Run one read-only SELECT or WITH statement against the warehouse. Returns up to 20 rows.",
      inputSchema: z.object({
        sql: z.string().min(1).max(2000).describe("A single SELECT or WITH statement."),
      }),
      execute: async ({ sql }: { sql: string }) => {
        const verdict = guardSql(sql);
        if (!verdict.ok) {
          decision.queries.push({ sql, ok: false, error: verdict.rule });
          return { ok: false, error: `${verdict.reason} ${verdict.fix}` };
        }
        try {
          const { results } = await env.DEMO_DB!.prepare(verdict.sql).all();
          decision.queries.push({ sql: verdict.sql, ok: true, rowCount: results.length });
          return { ok: true, rowCount: results.length, rows: results.slice(0, 20) };
        } catch (e) {
          const error = `Query failed: ${String(e).slice(0, 200)}`;
          decision.queries.push({ sql: verdict.sql, ok: false, error });
          return { ok: false, error };
        }
      },
    }),
  };
}

export async function handle(action: string, req: Request, env: DemoEnv): Promise<Response> {
  if (action !== "run") return json({ error: `score-audit has no action called "${action}".` }, 404);
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const parsed = RunRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "invalid request body" }, 400);
  }
  if (!env.DEMO_DB) {
    return json(
      { error: "DEMO_DB is not bound - this is local dev without --remote, so there is no warehouse to audit." },
      503
    );
  }
  const key = env.DEEPSEEK_API_KEY;
  if (!key) {
    return json({ error: "DEEPSEEK_API_KEY is not configured, so no model call can be made." }, 503);
  }

  const questions = QUESTIONS;
  const canQuery = CAN_QUERY[parsed.data.preset];
  const ids = questions.map((q) => q.id) as [string, ...string[]];
  const decision: Decision = { answers: new Map(), queries: [] };

  const deepseek = createOpenAICompatible({
    name: "deepseek",
    baseURL: DEEPSEEK_BASE_URL,
    apiKey: key,
    supportsStructuredOutputs: false,
  });

  const startedAt = Date.now();

  // Independent of the model on purpose - fired now, awaited after the model
  // call resolves, so the verifier's own latency hides behind the (much slower)
  // inference call instead of adding on top of it. This is also the literal
  // proof that "the model never grades itself": the true answers are already
  // computed before the model's answers are even inspected.
  const verification = Promise.all(
    questions.map(async (q) => {
      const row = await env.DEMO_DB!.prepare(q.sql).first<{ n: number }>();
      return { id: q.id, trueAnswer: row?.n ?? 0 };
    })
  );

  let usage: { inputTokens?: number; outputTokens?: number } = {};
  let stepsTaken = 0;
  try {
    const result = await generateText({
      model: deepseek(GUIDE_CHAIN[0]),
      system: buildSystemPrompt(questions, canQuery),
      prompt: "Answer every question listed in the system prompt.",
      tools: buildToolbox(env, decision, ids, canQuery),
      stopWhen: stepCountIs(MAX_STEPS),
      temperature: 0.2,
      maxRetries: 1,
      experimental_telemetry: { isEnabled: true, functionId: "score-audit" },
    });
    usage = { inputTokens: result.usage?.inputTokens, outputTokens: result.usage?.outputTokens };
    stepsTaken = result.steps.length;
  } catch (e) {
    return json({ error: `The model call failed: ${String(e).slice(0, 200)}` }, 502);
  }

  const ms = Date.now() - startedAt;

  let truth: { id: string; trueAnswer: number }[];
  try {
    truth = await verification;
  } catch (e) {
    return json({ error: `The verifier failed to check the warehouse: ${String(e).slice(0, 200)}` }, 500);
  }

  if (decision.answers.size === 0) {
    return json(
      {
        error: `The model made ${decision.queries.length} quer${decision.queries.length === 1 ? "y" : "ies"} but never called submit_answers within ${MAX_STEPS} tool calls.`,
      },
      502
    );
  }

  const trueById = new Map(truth.map((t) => [t.id, t.trueAnswer]));
  const results = questions.map((q) => {
    const stated = decision.answers.get(q.id) ?? null;
    const trueAnswer = trueById.get(q.id) ?? 0;
    return {
      id: q.id,
      prompt: q.prompt,
      sql: q.sql,
      trueAnswer,
      statedAnswer: stated?.answer ?? null,
      statedConfidence: stated?.confidence ?? null,
      correct: stated ? Math.round(stated.answer) === trueAnswer : null,
    };
  });

  const answered = results.filter((r) => r.statedAnswer !== null);
  const sampleSize = answered.length;
  const correctCount = answered.filter((r) => r.correct).length;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  const meanConfidence = sampleSize
    ? round1(answered.reduce((s, r) => s + (r.statedConfidence ?? 0), 0) / sampleSize)
    : 0;
  const accuracyPct = sampleSize ? round1((correctCount / sampleSize) * 100) : 0;

  return json({
    preset: parsed.data.preset,
    canQuery,
    model: GUIDE_CHAIN[0],
    ms,
    steps: stepsTaken,
    queries: decision.queries.length,
    totalQuestions: questions.length,
    sampleSize,
    correctCount,
    meanConfidence,
    accuracyPct,
    calibrationGap: round1(meanConfidence - accuracyPct),
    results,
    inputTokens: usage.inputTokens ?? null,
    outputTokens: usage.outputTokens ?? null,
  });
}
