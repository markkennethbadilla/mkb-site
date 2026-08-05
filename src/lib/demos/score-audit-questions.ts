/**
 * The fixed question bank for the ScoreAudit room (/demos/score-audit).
 *
 * Every question carries its own verifying SQL. worker/demos/score-audit.ts runs
 * that SQL server-side to get the true answer and NEVER sends it to the model.
 * The room's UI reads this same `sql` field to print the check beside the model's
 * answer, so the query a visitor reads is provably the one that ran, not a
 * paraphrase of it typed a second time.
 *
 * A leaf module, no imports, matching registry.ts and sql-guard.ts: nothing here
 * needs the Worker runtime, so the Worker (extensionless relative import) and the
 * room's client component (@/ alias) load the identical data.
 *
 * ONE QUESTION SET, AND THE PRESET CHANGES THE MODEL'S ACCESS, NOT THE QUESTIONS.
 * That is a correction, and the room is better for it. The first version had a
 * "fair" set and a "hard" set, on the theory that joins and date boundaries are
 * where a model goes confidently wrong. Run against the real endpoint, the model
 * answered all six hard questions correctly at 98 percent confidence, for a
 * calibration gap of MINUS two - because it had a query tool and simply looked.
 * The room would have shipped a wall label saying the preset was chosen to fail,
 * above a screen showing six green ticks.
 *
 * So the variable is the tool. Same six questions both ways:
 *
 *   grounded    - the model may query the warehouse before answering.
 *   from-memory - the same questions with the tool withheld.
 *
 * From memory the model CANNOT know: Tidewater is invented, so these numbers
 * exist nowhere outside this database. The only well-calibrated answer is a low
 * confidence, and whatever it actually reports is the finding. Nothing is rigged
 * to fail - one preset simply removes the thing that made the other one work,
 * which is also the honest engineering point: a stated confidence is worth
 * nothing without an independent check, and a real tool is what closes the gap.
 *
 * Every true answer is a plain non-negative integer - a COUNT, always aliased
 * `n` - so comparison is exact equality with no rounding band to argue about.
 */

export type Preset = "grounded" | "from-memory";

export type Question = {
  id: string;
  /** Put to the model verbatim. Never hints at the join or boundary underneath. */
  prompt: string;
  /** Runs server-side only. Always returns exactly one row, one column: n. */
  sql: string;
};

/**
 * Six questions, mixed in shape on purpose: two single-table counts, two joins,
 * one date boundary and one aggregate with a HAVING-shaped filter. A set that was
 * all one shape would measure one skill; this measures whether the model knows
 * what it does not know, which is the same across all six.
 */
export const QUESTIONS: Question[] = [
  {
    id: "active-customers",
    prompt: "How many customers currently have status = 'active'?",
    sql: "SELECT COUNT(*) AS n FROM customers WHERE status = 'active'",
  },
  {
    id: "urgent-tickets",
    prompt: "How many support tickets are marked priority = 'urgent'?",
    sql: "SELECT COUNT(*) AS n FROM support_tickets WHERE priority = 'urgent'",
  },
  {
    id: "overdue-customers",
    prompt:
      "How many distinct customers currently have at least one invoice that is status = 'open' and due before 2026-06-01?",
    sql: "SELECT COUNT(DISTINCT customer_id) AS n FROM invoices WHERE status = 'open' AND due_at < '2026-06-01'",
  },
  {
    id: "business-plan-active-subs",
    prompt: "How many currently active subscriptions are on the 'business' plan?",
    sql: "SELECT COUNT(*) AS n FROM subscriptions s JOIN plans p ON p.id = s.plan_id WHERE p.code = 'business' AND s.status = 'active'",
  },
  {
    id: "big-spenders",
    prompt:
      "How many distinct customers have paid a combined total of at least 100000 (in amount_cents) across all their payments?",
    sql: "WITH totals AS (SELECT customer_id, SUM(amount_cents) AS paid FROM payments GROUP BY customer_id) SELECT COUNT(*) AS n FROM totals WHERE paid >= 100000",
  },
  {
    id: "unpaid-legacy",
    prompt: "How many invoices tied to a subscription on the legacy 'legacy_pro' plan are still status = 'open'?",
    sql: "SELECT COUNT(*) AS n FROM invoices i JOIN subscriptions s ON s.id = i.subscription_id JOIN plans p ON p.id = s.plan_id WHERE p.code = 'legacy_pro' AND i.status = 'open'",
  },
];

/** Whether this preset lets the model look the answer up. The only difference. */
export const CAN_QUERY: Record<Preset, boolean> = {
  grounded: true,
  "from-memory": false,
};
