-- Arena tables for the "Split-Brain Sandbox" demo (/demos/split-brain).
--
-- Three nodes contend for one lease. Only the holder may do the job, and the
-- guarantee is not a lock - it is a FENCING TOKEN checked at the store.
--
-- WHY A TOKEN AND NOT A LOCK. A lock answers "am I the holder?" at the moment you
-- ask. The failure this room exists to show is a node that WAS the holder, got cut
-- off, came back, and still believes it is - so it asks nobody and simply writes.
-- A lock cannot catch that; the write arrives looking legitimate. A monotonically
-- increasing token can, because the store refuses any write carrying a token lower
-- than the one it has already seen. The check lives with the data, which is the
-- only place a check like this is worth anything.
--
-- ISOLATION IS A PRIMARY KEY, NOT A HOPE. Every row is namespaced by run_id, minted
-- per run. Two visitors firing at the same instant never touch the same row, so one
-- person's cluster cannot elect the other person's leader. Arenas carry an expiry
-- and are swept in bounded batches.
--
-- Time is stored as integer epoch milliseconds. A lease boundary compared as text
-- is a lease boundary that fails an hour into a timezone.

CREATE TABLE split_brain_arenas (
  run_id       TEXT    PRIMARY KEY,
  lease_ms     INTEGER NOT NULL,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL,
  -- Row-write budget reserved up front, including the event log and the sweep.
  -- Charging only the happy path is how the ledger arena under-counted by five
  -- times before anyone noticed.
  reserved_rows INTEGER NOT NULL
);
CREATE INDEX idx_split_brain_arenas_expiry ON split_brain_arenas (expires_at);

CREATE TABLE split_brain_nodes (
  run_id     TEXT    NOT NULL REFERENCES split_brain_arenas (run_id),
  node       TEXT    NOT NULL,
  -- The partition flag. THE NODE'S OWN CODE CHECKS THIS - nothing is killed, no
  -- process dies, no socket closes. It is failover-logic failure injection, and
  -- the room says so on the wall rather than in a comment only.
  isolated   INTEGER NOT NULL DEFAULT 0,
  -- What this node currently believes about who holds the lease. Kept separately
  -- from the lease table on purpose: the whole demo is the gap between what a node
  -- believes and what is true.
  believes_leader INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (run_id, node)
);

CREATE TABLE split_brain_leases (
  run_id      TEXT    PRIMARY KEY REFERENCES split_brain_arenas (run_id),
  holder      TEXT,
  expires_at  INTEGER NOT NULL,
  -- The fencing token. Incremented on every ACQUISITION, never on a renewal, so it
  -- names a term rather than a heartbeat. A write carrying a lower token than this
  -- is refused by the store, which is what makes a resumed node's stale belief
  -- harmless instead of catastrophic.
  token       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE split_brain_events (
  run_id     TEXT    NOT NULL REFERENCES split_brain_arenas (run_id),
  seq        INTEGER NOT NULL,
  at_ms      INTEGER NOT NULL,
  node       TEXT    NOT NULL,
  -- 'acquired' | 'renewed' | 'refused-held' | 'refused-isolated' | 'write-accepted'
  -- | 'write-fenced' | 'partitioned' | 'healed'
  kind       TEXT    NOT NULL,
  token      INTEGER NOT NULL,
  detail     TEXT    NOT NULL,
  PRIMARY KEY (run_id, seq)
);

-- The protected resource. One row, and every accepted write stamps the token that
-- authorised it - so the log itself is the evidence of who was allowed to write and
-- under which term.
CREATE TABLE split_brain_work (
  run_id       TEXT    NOT NULL REFERENCES split_brain_arenas (run_id),
  seq          INTEGER NOT NULL,
  written_by   TEXT    NOT NULL,
  token        INTEGER NOT NULL,
  at_ms        INTEGER NOT NULL,
  PRIMARY KEY (run_id, seq)
);
