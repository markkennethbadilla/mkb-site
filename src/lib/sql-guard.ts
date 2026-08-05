/**
 * The read-only boundary around query_db.
 *
 * The agent writes its own SQL - that is the point of the tool, and a demo where
 * the SQL is picked from a menu proves nothing about relational modelling. So the
 * safety cannot come from the prompt. It comes from here: a statement that is not
 * a single, bounded SELECT never reaches the database.
 *
 * The load-bearing rule is that ANALYSIS AND EXECUTION SEE THE SAME TEXT. Comments
 * are stripped first and the stripped text is what runs, so nothing can hide a
 * second statement behind `-- ` and have it execute after the checks passed. That
 * exact shape - a check that reads one thing while the system acts on another - is
 * the bug class this guard exists to make impossible.
 *
 * Everything here is a pure function over a string, so it is testable without a
 * database and it ships to the browser for anyone who wants to read it.
 *
 * STATUS, stated plainly because the alternative is a comment that lies: nothing
 * imports this yet. The site guide's toolbox is navigate/answer/decline and has no
 * SQL tool, so there is currently no path from a visitor to a query. This is built
 * ahead of the demo that will be its first real consumer, and wrangler.jsonc used
 * to claim it was already enforcing something. It was not. It is now honest about
 * being unwired.
 */

export type SqlVerdict =
  | {
      ok: true;
      /** The statement that will actually run - comments stripped, LIMIT enforced. */
      sql: string;
      /** Human-readable record of every rewrite applied, for the "show the work" view. */
      notes: string[];
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

/**
 * Tables no query may read, whatever else it does.
 *
 * SELECT-only is not the same as safe once the database stops being uniformly
 * public. The ledger demo writes live arena rows keyed by a random run id, and
 * that id is what stops one visitor reaching another's run over HTTP. A read tool
 * pointed at the same database would walk straight around it - the FORBIDDEN list
 * blocks writes, not reads, so `SELECT * FROM ledger_race_accounts` would return
 * every live arena on the site.
 *
 * Added with migration 0004 rather than after the tool that needs it exists,
 * because the gap opens the moment the tables do.
 */
const DENIED_TABLES = [/\bledger_race_[a-z_]*/i];

/**
 * Statements that only ever mutate. `REPLACE` is deliberately absent: SQLite uses
 * it both as an INSERT variant and as a scalar string function, so it is handled
 * separately by looking at what follows it.
 */
const FORBIDDEN = [
  "insert", "update", "delete", "drop", "alter", "create", "truncate",
  "pragma", "attach", "detach", "vacuum", "reindex", "analyze",
  "begin", "commit", "rollback", "savepoint", "release", "grant", "revoke",
];

/**
 * Removes comments and returns two strings of IDENTICAL length: the text to run,
 * and a copy with the contents of string literals and quoted identifiers blanked
 * out. All keyword analysis happens on the masked copy, so a table called
 * "drop_log" or a literal 'DELETE ME' cannot trip a rule, and a `;` inside a
 * string cannot look like a statement separator.
 */
function mask(sql: string): { stripped: string; masked: string } {
  let stripped = "";
  let masked = "";
  let i = 0;

  while (i < sql.length) {
    const c = sql[i];
    const next = sql[i + 1];

    if (c === "-" && next === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < sql.length && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      stripped += c;
      masked += c;
      i++;
      while (i < sql.length) {
        if (sql[i] === quote && sql[i + 1] === quote) {
          stripped += sql[i] + sql[i + 1];
          masked += "  ";
          i += 2;
          continue;
        }
        if (sql[i] === quote) break;
        stripped += sql[i];
        masked += " ";
        i++;
      }
      if (i < sql.length) {
        stripped += sql[i];
        masked += sql[i];
        i++;
      }
      continue;
    }

    stripped += c;
    masked += c;
    i++;
  }

  return { stripped, masked };
}

/** Index of every top-level (paren depth 0) occurrence of a word in masked text. */
function topLevelMatches(masked: string, word: string): number[] {
  const hits: number[] = [];
  const re = new RegExp(`\\b${word}\\b`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked)) !== null) {
    let depth = 0;
    for (let i = 0; i < m.index; i++) {
      if (masked[i] === "(") depth++;
      else if (masked[i] === ")") depth--;
    }
    if (depth === 0) hits.push(m.index);
  }
  return hits;
}

function refuse(rule: string, reason: string, fix: string): SqlVerdict {
  return { ok: false, rule, reason, fix };
}

export function guardSql(input: string): SqlVerdict {
  const raw = (input ?? "").trim();
  const notes: string[] = [];

  if (!raw) {
    return refuse("empty", "No SQL was supplied.", "Send a single SELECT statement.");
  }
  if (raw.length > MAX_SQL_CHARS) {
    return refuse(
      "too-long",
      `The statement is ${raw.length} characters; the ceiling is ${MAX_SQL_CHARS}.`,
      "Ask a narrower question, or aggregate in SQL instead of selecting raw rows."
    );
  }

  const { stripped, masked } = mask(raw);
  if (stripped.length !== masked.length) {
    // Defensive: the two strings are built in lockstep, so this can only mean the
    // masker itself is broken. Refusing beats running text nothing verified.
    return refuse(
      "mask-desync",
      "Internal guard error: the analysed text and the executable text diverged.",
      "This is a bug in sql-guard.ts, not in your query."
    );
  }
  if (stripped.trim() !== raw) notes.push("Stripped SQL comments before analysis and execution.");

  // One statement only. Anything after a semicolon is a second statement, whether
  // it was smuggled in behind a comment or typed plainly.
  const semis = [...masked.matchAll(/;/g)].map((m) => m.index ?? -1);
  const lastMeaningful = masked.replace(/\s+$/, "").length;
  const inner = semis.filter((idx) => idx < lastMeaningful - 1);
  if (inner.length > 0) {
    return refuse(
      "one-statement",
      "More than one statement was supplied; only the first would have been checked.",
      "Send exactly one SELECT. Combine results with a JOIN, a CTE or UNION instead of chaining statements."
    );
  }

  let body = stripped.replace(/;\s*$/, "").trim();
  let maskedBody = masked.replace(/;\s*$/, "").trim();
  if (body !== stripped.trim()) notes.push("Removed the trailing semicolon.");

  if (!/^\s*(select|with)\b/i.test(maskedBody)) {
    const firstWord = maskedBody.split(/\s+/)[0] ?? "";
    return refuse(
      "select-only",
      `A statement starting with "${firstWord}" was refused; this database is read-only.`,
      "Start with SELECT, or WITH for a common table expression."
    );
  }

  // PRAGMA gets its own rule because the word-boundary check cannot see it.
  //
  // SQLite exposes pragmas twice: as the statement `PRAGMA table_list`, which
  // \bpragma\b catches, and as table-valued FUNCTIONS named `pragma_table_list`,
  // which it does not - an underscore is a word character, so there is no boundary
  // after "pragma" to match. That means
  //   SELECT * FROM customers UNION SELECT 1 FROM pragma_table_list
  // passed a guard whose stated purpose includes refusing PRAGMA. It was found by
  // running this file's own hostile corpus in the build gate, which until then
  // nothing executed.
  if (/\bpragma_?\w*/i.test(maskedBody)) {
    return refuse(
      "read-only",
      "The statement uses PRAGMA, either as a statement or as one of the pragma_ table-valued functions, which reads database internals rather than data.",
      "Read the tables directly with SELECT. Schema introspection is available through sqlite_master."
    );
  }

  for (const word of FORBIDDEN) {
    if (new RegExp(`\\b${word}\\b`, "i").test(maskedBody)) {
      return refuse(
        "read-only",
        `The statement contains "${word.toUpperCase()}", which can modify or interrogate the database outside of a query.`,
        "Read with SELECT only. The demo dataset is deliberately immutable, so there is nothing to write."
      );
    }
  }
  for (const denied of DENIED_TABLES) {
    const hit = maskedBody.match(denied);
    if (hit) {
      return refuse(
        "denied-table",
        `"${hit[0]}" holds other visitors' live demo runs and is not readable through this tool.`,
        "Query the seeded demo dataset instead. The arena tables are scoped to a single run and are not public."
      );
    }
  }

  // REPLACE(a, b, c) is a perfectly ordinary string function; REPLACE INTO is not.
  if (/\breplace\b(?!\s*\()/i.test(maskedBody)) {
    return refuse(
      "read-only",
      'The statement uses REPLACE as a statement rather than as the REPLACE(...) string function.',
      "Use REPLACE only as a scalar function, e.g. REPLACE(name, 'a', 'b')."
    );
  }

  // Bound the result set. A LIMIT inside a subquery does not bound what comes
  // back, so only a top-level one counts.
  const limits = topLevelMatches(maskedBody, "limit");
  if (limits.length === 0) {
    body += ` LIMIT ${MAX_ROWS}`;
    notes.push(`No LIMIT was present, so LIMIT ${MAX_ROWS} was appended.`);
  } else {
    const at = limits[limits.length - 1];
    const tail = maskedBody.slice(at);
    const num = tail.match(/^limit\s+(\d+)/i);
    if (!num) {
      return refuse(
        "unbounded-limit",
        "LIMIT was used with something other than a plain number.",
        `Write a literal row count, e.g. LIMIT ${MAX_ROWS}.`
      );
    }
    if (Number(num[1]) > MAX_ROWS) {
      body = body.slice(0, at) + tail.replace(/^limit\s+\d+/i, `LIMIT ${MAX_ROWS}`);
      notes.push(`LIMIT ${num[1]} exceeded the ${MAX_ROWS}-row ceiling and was reduced to ${MAX_ROWS}.`);
    }
    maskedBody = maskedBody.slice(0, at) + tail;
  }

  return { ok: true, sql: body, notes };
}

/**
 * Statements the guard must refuse, with the rule each one is expected to trip.
 * Lives beside the guard rather than in a test file because it is also rendered
 * on the page - a guardrail nobody can inspect is indistinguishable from a claim.
 */
export const HOSTILE_SQL: { label: string; sql: string; rule: string }[] = [
  { label: "Stacked write", rule: "one-statement", sql: "SELECT 1; DROP TABLE customers" },
  { label: "Write smuggled behind a comment", rule: "one-statement", sql: "SELECT 1 -- \n; DELETE FROM payments" },
  { label: "Plain mutation", rule: "select-only", sql: "UPDATE customers SET status = 'active'" },
  { label: "Schema change", rule: "select-only", sql: "ALTER TABLE invoices ADD COLUMN backdoor TEXT" },
  { label: "CTE hiding a delete", rule: "read-only", sql: "WITH x AS (DELETE FROM payments RETURNING *) SELECT * FROM x" },
  { label: "Pragma probe", rule: "read-only", sql: "SELECT * FROM customers WHERE 1=1 UNION SELECT 1 FROM pragma_table_list" },
  // Refused for being two statements before the keyword rule is ever reached. The
  // rule name is what the guard actually did, not what you might expect it to do -
  // an expectation that does not match the code is a test asserting a fiction.
  { label: "Transaction control", rule: "one-statement", sql: "BEGIN; SELECT 1" },
  { label: "Attaching another database", rule: "select-only", sql: "ATTACH DATABASE 'x.db' AS x" },
  // Caught by the opening-keyword rule, which fires before the REPLACE special case.
  { label: "REPLACE INTO", rule: "select-only", sql: "REPLACE INTO plans VALUES (1, 'free', 'Free', 0, 0, 1)" },
  { label: "Non-numeric LIMIT", rule: "unbounded-limit", sql: "SELECT * FROM customers LIMIT (SELECT COUNT(*) FROM customers)" },
  { label: "Reading another visitor's live demo run", rule: "denied-table", sql: "SELECT * FROM ledger_race_accounts" },
  { label: "Joining to a denied table", rule: "denied-table", sql: "SELECT c.name FROM customers c JOIN ledger_race_arenas a ON a.run_id = c.name" },
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
];
