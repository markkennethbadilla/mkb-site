-- Lets SQLite number the split-brain event log, instead of counting for it.
--
-- Every appended event ran an INSERT ... SELECT with a correlated
-- COALESCE((SELECT MAX(seq) ... WHERE run_id = ?), 0) + 1 to work out its own
-- sequence number. That is a scan of the run's events on every write, to
-- reproduce a number the database already assigns to every row for free. An
-- INTEGER PRIMARY KEY is an alias for the rowid, so `id` is filled in by SQLite
-- and ordering by it is insertion order.
--
-- WHY THIS TABLE AND NOT split_brain_work. Event order is internal: the browser
-- uses it as a list key and never prints it. The work table's seq is printed on
-- the stage as "unit #N" for that run, so it has to restart at 1 per run and stays
-- exactly as it was. Same-looking SQL, different jobs.
--
-- SQLite cannot add an INTEGER PRIMARY KEY to an existing table, so this is the
-- standard rebuild. EVERY ROW IS COPIED - the old rows keep their order because
-- the copy is ordered by the column being replaced. Arena rows live 30 minutes,
-- so in practice this moves a handful of rows from runs still open when it lands.
CREATE TABLE split_brain_events_new (
  -- The rowid, by another name. Assigned by SQLite, monotonic within the table,
  -- and ordering by it is the order the events happened.
  id         INTEGER PRIMARY KEY,
  run_id     TEXT    NOT NULL REFERENCES split_brain_arenas (run_id),
  at_ms      INTEGER NOT NULL,
  node       TEXT    NOT NULL,
  -- 'acquired' | 'renewed' | 'refused-held' | 'refused-isolated' | 'write-accepted'
  -- | 'write-fenced' | 'partitioned' | 'healed'
  kind       TEXT    NOT NULL,
  token      INTEGER NOT NULL,
  detail     TEXT    NOT NULL
);

INSERT INTO split_brain_events_new (run_id, at_ms, node, kind, token, detail)
SELECT run_id, at_ms, node, kind, token, detail
FROM split_brain_events
ORDER BY run_id, seq;

DROP TABLE split_brain_events;

ALTER TABLE split_brain_events_new RENAME TO split_brain_events;

-- Reading is always "this run's events, in order", which the old composite
-- primary key covered and the rowid alone does not.
CREATE INDEX idx_split_brain_events_run ON split_brain_events (run_id, id);
