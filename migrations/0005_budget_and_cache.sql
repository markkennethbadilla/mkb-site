-- Moves the request budget and the guide's answer cache off KV and onto D1.
--
-- WHY, and it is a live defect rather than a tidy-up:
--
-- Workers KV free tier allows 1,000 WRITES per day. The budget did two KV writes
-- per request and declared daily pools of 12,000 and 20,000 - 64,000 writes
-- against a 1,000 allowance. The answer cache added two more writes per uncached
-- question. Once the day's writes are gone, put() stops succeeding, every counter
-- freezes at its last value, and the budget silently stops budgeting. Because the
-- guide and the demos share one namespace, the control built to protect the
-- centrepiece is what would have taken it down.
--
-- KV was also the wrong shape for a counter. Read-then-write from several
-- concurrent invocations all read the same number and all write the same
-- increment, so a burst of ten requests could count as one. That is not eventual
-- consistency, it is a lost update - the exact bug the ledger demo exists to
-- illustrate, sitting in the code that guards it.
--
-- D1 fixes both: 100,000 writes a day, and INSERT ... ON CONFLICT DO UPDATE SET
-- n = n + 1 RETURNING n is a single atomic statement that returns the value it
-- just produced. No read-modify-write, so no lost update.
--
-- KV keeps only what it is good at: the model-discovery list, which is written
-- roughly once an hour.

CREATE TABLE budget_counters (
  -- UTC day, matching the platform's own reset boundary.
  day     TEXT    NOT NULL,
  -- 'guide' or 'demo'. Separate rows are what make the pools genuinely separate:
  -- a demo cannot decrement the guide's allocation because it never touches its row.
  scope   TEXT    NOT NULL,
  -- 'pool' for the shared allowance, or 'ip:<address>' for one visitor's share.
  key     TEXT    NOT NULL,
  n       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, scope, key)
);
CREATE INDEX idx_budget_counters_day ON budget_counters (day);

CREATE TABLE guide_cache (
  -- The normalised, stemmed, synonym-collapsed token string. Two phrasings of one
  -- question collapse onto the same key rather than growing the table forever.
  token_key  TEXT    PRIMARY KEY,
  -- The token list, stored so similarity can be scored against past questions
  -- without re-tokenising the original text.
  tokens     TEXT    NOT NULL,
  -- The cached response, as JSON.
  payload    TEXT    NOT NULL,
  created_at TEXT    NOT NULL
);
CREATE INDEX idx_guide_cache_created ON guide_cache (created_at);
