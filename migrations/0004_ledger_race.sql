-- Arena tables for the "Ledger Under Fire" demo (/demos/ledger-under-fire).
--
-- These are the ONLY writable tables in this database. Everything in 0001-0003 is
-- the read-only Tidewater dataset and is untouched here.
--
-- THE PREFIX IS NOT DECORATION. 0001 already defines `ledger_accounts` and
-- `ledger_entries`, and they mean something completely different: the seeded
-- double-entry books the reconciliation demo reads. Every table here carries a
-- `ledger_race_` prefix so the two can never be confused by a future reader or a
-- careless join.
--
-- ISOLATION IS A PRIMARY KEY, NOT A HOPE. Every row is namespaced by run_id, 128
-- bits minted per run. Two visitors firing at the same instant never touch the
-- same row, so one person's race cannot corrupt another's arithmetic. Arenas
-- expire and are swept in bounded batches.
--
-- Money is integer cents throughout. A float column in a ledger is the bug that
-- produces a reconciliation off by a hundredth that then stays off forever.

CREATE TABLE ledger_race_arenas (
  run_id           TEXT    PRIMARY KEY,
  mode             TEXT    NOT NULL CHECK (mode IN ('unsafe', 'safe')),
  transfer_count   INTEGER NOT NULL,
  amount_cents     INTEGER NOT NULL,
  shard_size       INTEGER NOT NULL,
  -- What the books MUST still total when the run finishes. The invariant check is
  -- this number against the live sum, so it is recorded before anything moves.
  genesis_cents    INTEGER NOT NULL,
  created_at       TEXT    NOT NULL,
  expires_at       TEXT    NOT NULL,
  -- Row-write budget reserved up front for this arena, including the replay phase,
  -- index maintenance and its share of the sweep. An earlier version charged only
  -- the happy path and under-counted the true cost by roughly five times.
  reserved_rows    INTEGER NOT NULL
);
CREATE INDEX idx_ledger_race_arenas_expiry ON ledger_race_arenas (expires_at);

CREATE TABLE ledger_race_accounts (
  run_id        TEXT    NOT NULL REFERENCES ledger_race_arenas (run_id),
  name          TEXT    NOT NULL,
  balance_cents INTEGER NOT NULL,
  -- The single most important column here.
  --
  -- The demo's hero chart plots what the stored balance actually held over the
  -- run. Without this it would have to be drawn from what each invocation READ or
  -- WROTE, and neither of those is the stored value at a point in time - the whole
  -- premise is that reads go stale and writes clobber. Drawing a line labelled
  -- "what the balance actually held" over those numbers would fabricate a time
  -- series, on the biggest visual on the page.
  --
  -- Incremented by the database on every write and returned via RETURNING, so it
  -- is a true serialisation order assigned by SQLite rather than two isolates'
  -- clocks compared across threads. Costs no extra round trip.
  write_seq     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (run_id, name)
);

CREATE TABLE ledger_race_entries (
  run_id       TEXT    NOT NULL REFERENCES ledger_race_arenas (run_id),
  -- The idempotency key. UNIQUE with run_id is what makes a retry safe on the SAFE
  -- path: the second attempt's INSERT OR IGNORE is a no-op and the balance moves
  -- are gated on having written the row THIS attempt.
  idem_key     TEXT    NOT NULL,
  -- Fresh per HTTP attempt, not per idempotency key. The debit and credit fire
  -- only when a journal row exists with this key AND this nonce, so a first
  -- attempt proceeds and a retry finds the original nonce and does nothing. Retry
  -- safety in one transaction with no extra round trip and no application-side
  -- "have I seen this key" lookup.
  attempt_nonce TEXT   NOT NULL,
  amount_cents INTEGER NOT NULL,
  booked_at    TEXT    NOT NULL,
  PRIMARY KEY (run_id, idem_key)
);

CREATE TABLE ledger_race_shards (
  run_id     TEXT    NOT NULL REFERENCES ledger_race_arenas (run_id),
  shard      INTEGER NOT NULL,
  -- 'fire' and 'replay' are separate phases against one arena. They are keyed
  -- apart because a replay is a genuinely different run of the same transfers -
  -- and because charging only the fire phase is how the row budget under-counted.
  phase      TEXT    NOT NULL CHECK (phase IN ('fire', 'replay')),
  started_ms INTEGER NOT NULL,
  wall_ms    INTEGER NOT NULL,
  accepted   INTEGER NOT NULL,
  rejected   INTEGER NOT NULL,
  errored    INTEGER NOT NULL,
  PRIMARY KEY (run_id, shard, phase)
);
