-- Rule 43: every POST to /api/* is kept, whole, before the budget, the parser or
-- the cache decide anything about it. A refused or malformed request is still a
-- row. Additive: nothing reads or deletes this table. Rollback: DROP TABLE.
CREATE TABLE inbound_requests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  received_at TEXT    NOT NULL DEFAULT (datetime('now')),
  path        TEXT    NOT NULL,
  ip          TEXT    NOT NULL,
  country     TEXT,
  user_agent  TEXT,
  body        TEXT    NOT NULL
);
