-- Proves the seeded demo data is what the tools assume. Run against the remote
-- database after applying migrations:
--   node scripts/cf.mjs d1 execute mkb-site-demo --remote --file scripts/verify-seed.sql
--
-- Expected:
--   1. every table populated
--   2. trial balance difference is exactly 0
--   3. June 2026 shows exactly THREE bank lines that do not have exactly one
--      matching bank-account entry booked in June - the duplicate, the unbooked
--      fee, and the 30-Jun-booked-1-Jul timing difference
--
-- Counts are scalar subqueries rather than a UNION ALL chain: D1 caps the number
-- of terms in a compound SELECT, and fifteen is already over that limit.

SELECT
  (SELECT COUNT(*) FROM customers)            AS customers,
  (SELECT COUNT(*) FROM subscriptions)        AS subscriptions,
  (SELECT COUNT(*) FROM invoices)             AS invoices,
  (SELECT COUNT(*) FROM invoice_lines)        AS invoice_lines,
  (SELECT COUNT(*) FROM payments)             AS payments,
  (SELECT COUNT(*) FROM refunds)              AS refunds,
  (SELECT COUNT(*) FROM usage_events)         AS usage_events,
  (SELECT COUNT(*) FROM support_tickets)      AS tickets,
  (SELECT COUNT(*) FROM users)                AS users,
  (SELECT COUNT(*) FROM feature_flags)        AS flags,
  (SELECT COUNT(*) FROM audit_log)            AS audit_log,
  (SELECT COUNT(*) FROM ledger_accounts)      AS ledger_accounts,
  (SELECT COUNT(*) FROM ledger_entries)       AS ledger_entries,
  (SELECT COUNT(*) FROM bank_statements)      AS bank_statements,
  (SELECT COUNT(*) FROM bank_statement_lines) AS bank_lines;

SELECT SUM(debit_cents) AS debits,
       SUM(credit_cents) AS credits,
       SUM(debit_cents) - SUM(credit_cents) AS difference
FROM ledger_entries;

SELECT b.external_ref,
       b.amount_cents,
       (SELECT COUNT(*) FROM ledger_entries e
         WHERE e.external_ref = b.external_ref AND e.account_id = 1) AS bank_entries_any_period,
       (SELECT COUNT(*) FROM ledger_entries e
         WHERE e.external_ref = b.external_ref AND e.account_id = 1
           AND e.booked_at LIKE '2026-06%') AS bank_entries_in_june
FROM bank_statement_lines b
JOIN bank_statements s ON s.id = b.statement_id
WHERE s.period = '2026-06'
  AND (SELECT COUNT(*) FROM ledger_entries e
        WHERE e.external_ref = b.external_ref AND e.account_id = 1
          AND e.booked_at LIKE '2026-06%') <> 1;
