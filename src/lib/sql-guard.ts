/**
 * The read-only boundary around query_db.
 *
 * The ScoreAudit room hands a language model a real SQL tool, because a demo
 * where the SQL is picked from a menu proves nothing about relational modelling.
 * The model writes the statement. This file decides whether it runs.
 *
 * WHAT CHANGED, AND WHY THE OLD VERSION HAD TO GO
 *
 * This used to be 253 lines: a hand-written lexer that blanked out the contents
 * of quoted identifiers so a table called "drop_log" could not trip a keyword
 * rule, plus a list of banned table names and banned keywords tested against
 * that blanked copy. The executed statement kept the real identifier.
 *
 * So quoting a name hid it from the check and not from the database. All ten
 * hostile statements an auditor tried were allowed, including this one, which
 * returned every live per-visitor demo run on the site:
 *
 *     SELECT * FROM "ledger_race_accounts"
 *
 * The file header at the time declared that its whole purpose was to prevent a
 * check that reads one thing while the system acts on another. It was that bug.
 *
 * WHERE THE BOUNDARY ACTUALLY LIVES NOW
 *
 * Not here. The arena tables moved to a different D1 database, and the binding
 * this tool holds reaches only mkb-site-warehouse, which contains nothing but
 * invented Tidewater Analytics data. The statement above no longer needs a rule
 * to refuse it, because D1 answers it with "no such table". A name you cannot
 * write around beats a name you can.
 *
 * That leaves this file one job. Make sure the statement is a bounded read.
 *
 * HOW, IN THREE RULES AND A WRAPPER
 *
 * The rules refuse a semicolon and require the text to open with SELECT or WITH.
 * Neither is doing the heavy lifting. The wrapper is. Every accepted statement
 * runs verbatim inside a fixed frame this file owns:
 *
 *     SELECT * FROM (
 *     <the model's statement, byte for byte>
 *     ) LIMIT 100
 *
 * SQLite's grammar requires a SELECT in that position, so the wrapper is what
 * enforces read-only, not a keyword list. That distinction is load-bearing.
 * `WITH x AS (SELECT 1) DELETE FROM plans WHERE 0` is one valid SQLite statement
 * that opens with WITH, and the old keyword scan was the only thing standing in
 * front of it. Verified against D1 on 2026-08-22, the bare form runs and the
 * wrapped form fails with `near "DELETE": syntax error`.
 *
 * The invariant the old file broke twice is now structural. Nothing rewrites the
 * model's text, so the string that was analysed and the string that executes are
 * the same string, sitting inside a frame the model cannot influence.
 *
 * WHAT THIS DOES NOT STOP, STATED PLAINLY
 *
 * A read that is expensive rather than forbidden. The outer LIMIT bounds rows
 * RETURNED, never rows READ, and an unbalanced closing parenthesis can push the
 * model's own LIMIT outside the frame. A cartesian join or a runaway recursive
 * CTE is therefore not this file's problem, and it is not left unhandled either.
 * The platform ends it. Measured on D1, all verified 2026-08-22:
 *
 *   Unbounded recursive CTE   killed after roughly 39 seconds with
 *                             "D1 DB exceeded its CPU time limit and was reset"
 *   randomblob(900000000)     refused with SQLITE_TOOBIG
 *   load_extension('evil.so') refused with "not authorized"
 *   Two statements in one     refused by workerd before SQLite sees it, with
 *                             "A prepared SQL statement must contain only one
 *                             statement" (src/workerd/util/sqlite.c++)
 *
 * Spend is bounded separately by the edge rate limiters in wrangler.jsonc and by
 * the request budget in worker/budget.ts.
 *
 * Reading database internals is allowed and no longer interesting. `sqlite_master`
 * and the `pragma_` table-valued functions describe a schema that is printed in
 * full in the model's own system prompt, in a database holding a company that
 * does not exist.
 *
 * WHY NOT A REAL PARSER
 *
 * node-sql-parser was the obvious candidate and was rejected on the invariant.
 * It is a second grammar, and a second grammar can disagree with SQLite's. Every
 * disagreement is the original defect wearing a better hat, analysis reading one
 * thing while the database acts on another. SQLite is already the parser, it is
 * already installed, and asking it the question directly is both smaller and
 * strictly more correct than asking a lookalike.
 *
 * Everything here is a pure function over a string, so the corpora below run in
 * the build gate without a database.
 */

export type SqlVerdict =
  | {
      ok: true;
      /** The wrapped statement to execute. Contains the input byte for byte. */
      sql: string;
    }
  | {
      ok: false;
      /** Stable id of the rule that refused it. */
      rule: string;
      /** What was wrong, in one sentence. */
      reason: string;
      /** What to do instead. */
      fix: string;
    };

/** Hard ceiling on rows returned to the model, whatever the query asks for. */
export const MAX_ROWS = 100;
const MAX_SQL_CHARS = 2000;

function refuse(rule: string, reason: string, fix: string): SqlVerdict {
  return { ok: false, rule, reason, fix };
}

export function guardSql(input: string): SqlVerdict {
  const sql = (input ?? "").trim();

  if (!sql) {
    return refuse("empty", "No SQL was supplied.", "Send a single SELECT statement.");
  }
  if (sql.length > MAX_SQL_CHARS) {
    return refuse(
      "too-long",
      `The statement is ${sql.length} characters; the ceiling is ${MAX_SQL_CHARS}.`,
      "Ask a narrower question, or aggregate in SQL instead of selecting raw rows."
    );
  }

  // Any semicolon at all, including a harmless trailing one and including one
  // inside a string literal. Refusing all of them is deliberate. Telling them
  // apart needs a lexer, a lexer is what just failed, and the cost of being
  // blunt here is a false refusal of `WHERE subject = 'a;b'` rather than a hole.
  if (sql.includes(";")) {
    return refuse(
      "one-statement",
      "The statement contains a semicolon, and only one statement may be sent.",
      "Send exactly one SELECT with no semicolon, not even a trailing one. Combine results with a JOIN, a CTE or UNION."
    );
  }

  // A cheap first word check so an obvious mistake gets a sentence explaining
  // itself instead of a raw SQLite syntax error from inside the wrapper.
  if (!/^(select|with)\b/i.test(sql)) {
    return refuse(
      "select-only",
      `A statement starting with "${sql.split(/\s+/)[0]}" was refused; this database is read-only.`,
      "Start with SELECT, or WITH for a common table expression."
    );
  }

  // The newline before the closing parenthesis matters. Without it a trailing
  // `-- comment` on the model's last line would swallow the frame.
  return { ok: true, sql: `SELECT * FROM (\n${sql}\n) LIMIT ${MAX_ROWS}` };
}

/**
 * Statements the guard must refuse, with the rule each one is expected to trip.
 * Read by scripts/check-guide.mjs and rendered on the room's page, because a
 * guardrail nobody can inspect is indistinguishable from a claim.
 */
export const HOSTILE_SQL: { label: string; sql: string; rule: string }[] = [
  { label: "Stacked write", rule: "one-statement", sql: "SELECT 1; DROP TABLE customers" },
  { label: "Write smuggled behind a comment", rule: "one-statement", sql: "SELECT 1 -- \n; DELETE FROM payments" },
  { label: "Plain mutation", rule: "select-only", sql: "UPDATE customers SET status = 'active'" },
  { label: "Schema change", rule: "select-only", sql: "ALTER TABLE invoices ADD COLUMN backdoor TEXT" },
  { label: "Transaction control", rule: "one-statement", sql: "BEGIN; SELECT 1" },
  { label: "Attaching another database", rule: "select-only", sql: "ATTACH DATABASE 'x.db' AS x" },
  { label: "REPLACE INTO", rule: "select-only", sql: "REPLACE INTO plans VALUES (1, 'free', 'Free', 0, 0, 1)" },
  { label: "Bare PRAGMA statement", rule: "select-only", sql: "PRAGMA table_list" },
  { label: "Oversized statement", rule: "too-long", sql: `SELECT '${"x".repeat(2100)}'` },
];

/**
 * Statements the guard must ACCEPT. A guard that only ever refuses is easy to
 * write and useless, so the corpus proves both directions.
 */
export const ALLOWED_SQL: { label: string; sql: string }[] = [
  { label: "Schema introspection", sql: "SELECT name FROM sqlite_master WHERE type = 'table'" },
  { label: "Three-table join", sql: "SELECT c.name, p.code, s.seats FROM customers c JOIN subscriptions s ON s.customer_id = c.id JOIN plans p ON p.id = s.plan_id WHERE s.status = 'active'" },
  { label: "Aggregate with a CTE", sql: "WITH overdue AS (SELECT customer_id, SUM(total_cents) owed FROM invoices WHERE status = 'open' AND due_at < '2026-06-01' GROUP BY customer_id) SELECT COUNT(*) FROM overdue" },
  { label: "A literal that looks like a keyword", sql: "SELECT * FROM support_tickets WHERE subject = 'DROP TABLE users'" },
  { label: "REPLACE as a string function", sql: "SELECT REPLACE(name, ' ', '-') FROM customers" },
  { label: "Already limited", sql: "SELECT id FROM payments ORDER BY paid_at DESC LIMIT 10" },
  { label: "Quoted identifier", sql: 'SELECT "name" FROM "customers"' },
  { label: "Trailing line comment", sql: "SELECT COUNT(*) FROM plans -- how many plans" },
];

/**
 * Statements the guard lets through ON PURPOSE, each naming the layer that
 * actually stops it.
 *
 * This corpus exists because the previous version of this file claimed a ceiling
 * it did not have. Six of these are the auditor's bypasses. The guard allowed
 * every one of them before the fix and allows most of them still. The difference
 * is that the thing which stops them is now real, named, and was executed against
 * D1 rather than assumed.
 *
 * `stoppedBy` is prose for a human reading the page. `refusedByDatabase` marks
 * the ones D1 rejects outright, as opposed to the ones it answers harmlessly.
 */
export const OUT_OF_SCOPE_SQL: {
  label: string;
  sql: string;
  stoppedBy: string;
  refusedByDatabase: boolean;
}[] = [
  {
    label: "Quoted arena table",
    sql: 'SELECT * FROM "ledger_race_accounts"',
    stoppedBy:
      "The database split. Arena tables live in mkb-site-demo and this tool holds a binding to mkb-site-warehouse, so D1 answers \"no such table: ledger_race_accounts\".",
    refusedByDatabase: true,
  },
  {
    label: "Backtick arena table",
    sql: "SELECT * FROM `ledger_race_accounts`",
    stoppedBy: "The database split, same as above. Quoting style cannot conjure a table into a database that has none.",
    refusedByDatabase: true,
  },
  {
    label: "Quoted pragma function",
    sql: 'SELECT * FROM "pragma_table_list"',
    stoppedBy:
      "Nothing, and nothing needs to. It lists the schema of a company that does not exist, which the model is already given in full in its system prompt.",
    refusedByDatabase: false,
  },
  {
    label: "WITH clause in front of a DELETE",
    sql: "WITH x AS (SELECT 1) DELETE FROM plans WHERE 0",
    stoppedBy:
      "SQLite's grammar, via the wrapper. This is a valid single statement that opens with WITH and it runs when sent bare. Inside SELECT * FROM ( ... ) it fails with `near \"DELETE\": syntax error`.",
    refusedByDatabase: true,
  },
  {
    label: "Unbounded recursive CTE",
    sql: "WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM c) SELECT COUNT(*) FROM c",
    stoppedBy:
      "D1's own CPU ceiling. Measured at roughly 39 seconds before \"D1 DB exceeded its CPU time limit and was reset\". No string check can tell this apart from a legitimate recursive query, so the platform is the right place to end it.",
    refusedByDatabase: true,
  },
  {
    label: "Enormous blob allocation",
    sql: "SELECT randomblob(900000000)",
    stoppedBy: "SQLite's own length ceiling, which refuses it with SQLITE_TOOBIG.",
    refusedByDatabase: true,
  },
  {
    label: "Loading a native extension",
    sql: "SELECT load_extension('evil.so')",
    stoppedBy: "D1's SQLite authorizer, which refuses it with \"not authorized\".",
    refusedByDatabase: true,
  },
];
