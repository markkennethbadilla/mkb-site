-- Demo warehouse + books for the site agent's tools.
--
-- Everything here describes TIDEWATER ANALYTICS, a company that does not exist.
-- The shape is invented from scratch: no employer's schema is reproduced, in whole
-- or in part. That is a contract requirement, not a stylistic choice.
--
-- The dataset is READ-ONLY in production. src/lib/sql-guard.ts refuses anything
-- that is not a single SELECT/WITH, so the agent physically cannot write here even
-- if a visitor talks it into trying.
--
-- Money is stored in integer cents everywhere. A float column in a ledger is the
-- bug that produces a reconciliation that is off by a hundredth and stays off.

-- ---------------------------------------------------------------- warehouse ----

CREATE TABLE plans (
  id            INTEGER PRIMARY KEY,
  code          TEXT    NOT NULL UNIQUE,
  name          TEXT    NOT NULL,
  monthly_cents INTEGER NOT NULL,
  seat_cents    INTEGER NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE customers (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  country      TEXT NOT NULL,
  industry     TEXT NOT NULL,
  signed_up_at TEXT NOT NULL,
  status       TEXT NOT NULL CHECK (status IN ('active', 'churned', 'trial'))
);
CREATE INDEX idx_customers_status ON customers (status);

CREATE TABLE subscriptions (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers (id),
  plan_id     INTEGER NOT NULL REFERENCES plans (id),
  seats       INTEGER NOT NULL,
  started_at  TEXT NOT NULL,
  ended_at    TEXT,
  status      TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'paused'))
);
CREATE INDEX idx_subscriptions_customer ON subscriptions (customer_id);

CREATE TABLE invoices (
  id              INTEGER PRIMARY KEY,
  customer_id     INTEGER NOT NULL REFERENCES customers (id),
  subscription_id INTEGER REFERENCES subscriptions (id),
  issued_at       TEXT NOT NULL,
  due_at          TEXT NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'USD',
  total_cents     INTEGER NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible'))
);
CREATE INDEX idx_invoices_customer ON invoices (customer_id);
CREATE INDEX idx_invoices_status ON invoices (status, due_at);

CREATE TABLE invoice_lines (
  id           INTEGER PRIMARY KEY,
  invoice_id   INTEGER NOT NULL REFERENCES invoices (id),
  kind         TEXT    NOT NULL CHECK (kind IN ('subscription', 'seats', 'overage', 'discount', 'credit')),
  description  TEXT    NOT NULL,
  quantity     INTEGER NOT NULL,
  unit_cents   INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL
);
CREATE INDEX idx_invoice_lines_invoice ON invoice_lines (invoice_id);

CREATE TABLE payments (
  id           INTEGER PRIMARY KEY,
  invoice_id   INTEGER NOT NULL REFERENCES invoices (id),
  customer_id  INTEGER NOT NULL REFERENCES customers (id),
  paid_at      TEXT    NOT NULL,
  amount_cents INTEGER NOT NULL,
  method       TEXT    NOT NULL CHECK (method IN ('card', 'ach', 'wire', 'credit')),
  external_ref TEXT    NOT NULL
);
CREATE INDEX idx_payments_invoice ON payments (invoice_id);
CREATE INDEX idx_payments_ref ON payments (external_ref);

CREATE TABLE refunds (
  id           INTEGER PRIMARY KEY,
  payment_id   INTEGER NOT NULL REFERENCES payments (id),
  refunded_at  TEXT    NOT NULL,
  amount_cents INTEGER NOT NULL,
  reason       TEXT    NOT NULL
);

CREATE TABLE usage_events (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers (id),
  occurred_at TEXT    NOT NULL,
  metric      TEXT    NOT NULL,
  quantity    INTEGER NOT NULL
);
CREATE INDEX idx_usage_customer_metric ON usage_events (customer_id, metric);

CREATE TABLE support_tickets (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers (id),
  opened_at   TEXT    NOT NULL,
  closed_at   TEXT,
  priority    TEXT    NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  subject     TEXT    NOT NULL,
  status      TEXT    NOT NULL CHECK (status IN ('open', 'pending', 'resolved'))
);
CREATE INDEX idx_tickets_customer ON support_tickets (customer_id);

CREATE TABLE users (
  id           INTEGER PRIMARY KEY,
  customer_id  INTEGER NOT NULL REFERENCES customers (id),
  email        TEXT    NOT NULL UNIQUE,
  role         TEXT    NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  last_seen_at TEXT
);

CREATE TABLE feature_flags (
  id          INTEGER PRIMARY KEY,
  key         TEXT    NOT NULL UNIQUE,
  description TEXT    NOT NULL,
  rollout_pct INTEGER NOT NULL CHECK (rollout_pct BETWEEN 0 AND 100)
);

CREATE TABLE audit_log (
  id            INTEGER PRIMARY KEY,
  actor_user_id INTEGER REFERENCES users (id),
  action        TEXT    NOT NULL,
  entity        TEXT    NOT NULL,
  entity_id     INTEGER NOT NULL,
  occurred_at   TEXT    NOT NULL
);

-- ------------------------------------------------------------------- books ----
--
-- Double entry. Every transaction's debits must equal its credits; the
-- reconcile_ledger tool proves that arithmetic rather than asserting it.

CREATE TABLE ledger_accounts (
  id   INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'revenue', 'expense'))
);

CREATE TABLE ledger_entries (
  id            INTEGER PRIMARY KEY,
  txn_id        TEXT    NOT NULL,
  account_id    INTEGER NOT NULL REFERENCES ledger_accounts (id),
  booked_at     TEXT    NOT NULL,
  debit_cents   INTEGER NOT NULL DEFAULT 0,
  credit_cents  INTEGER NOT NULL DEFAULT 0,
  memo          TEXT    NOT NULL,
  -- Links a booking back to the bank line that caused it. NULL for internal
  -- journals (accruals, deferrals) that never touch the bank.
  external_ref  TEXT,
  CHECK (debit_cents >= 0 AND credit_cents >= 0),
  CHECK (NOT (debit_cents > 0 AND credit_cents > 0))
);
CREATE INDEX idx_entries_txn ON ledger_entries (txn_id);
CREATE INDEX idx_entries_period ON ledger_entries (booked_at);
CREATE INDEX idx_entries_ref ON ledger_entries (external_ref);

CREATE TABLE bank_statements (
  id            INTEGER PRIMARY KEY,
  period        TEXT    NOT NULL UNIQUE,
  opening_cents INTEGER NOT NULL,
  closing_cents INTEGER NOT NULL
);

CREATE TABLE bank_statement_lines (
  id           INTEGER PRIMARY KEY,
  statement_id INTEGER NOT NULL REFERENCES bank_statements (id),
  value_date   TEXT    NOT NULL,
  description  TEXT    NOT NULL,
  amount_cents INTEGER NOT NULL,
  external_ref TEXT    NOT NULL
);
CREATE INDEX idx_bank_lines_statement ON bank_statement_lines (statement_id);
CREATE INDEX idx_bank_lines_ref ON bank_statement_lines (external_ref);
