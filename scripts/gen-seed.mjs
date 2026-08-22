// @ts-nocheck
//
// The nocheck is narrow and it is here rather than hidden in scripts/tsconfig.json
// so it is visible to whoever opens the file. Under checkJs this generator reports
// 16 errors and every one is an inference artifact rather than a defect: PLANS is a
// tuple list that widens to (string|number)[], so plan[3] + seatAmt reads as
// string+number; PLANS.find() is string|undefined even though every subscription
// carries a plan id this file itself wrote; and book()'s last parameter infers as
// null from its first call site. Clearing them means annotating the billing cycle
// and the double-entry book(), which is the one part of this file worth leaving
// alone. Nothing imports this module, it runs by hand, and its output is committed
// SQL that gets reviewed as a diff.
//
// Generates migrations/0002_seed_warehouse.sql and 0003_seed_ledger.sql.
//
// Deterministic on purpose: a seeded PRNG and arithmetic dates, never Math.random
// or an argless new Date(). Re-running converges on byte-identical files (rule 36),
// so the committed SQL is reviewable as a diff instead of churning on every run.
//
// The data describes TIDEWATER ANALYTICS, a company that does not exist. Names,
// emails and domains are assembled from the word lists below - none refer to a
// real company or person, and no employer's schema is reproduced.
//
// Usage: node scripts/gen-seed.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { r, pick, int, chance, day, stamp, monthStart, q, rows } from "./seed-util.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "migrations");

// ------------------------------------------------------------------ warehouse

const PLANS = [
  [1, "starter", "Starter", 4900, 900],
  [2, "team", "Team", 19900, 1500],
  [3, "business", "Business", 49900, 2200],
  [4, "scale", "Scale", 129900, 2900],
  [5, "legacy_pro", "Pro (legacy)", 9900, 1200],
];

const HEAD = ["North", "Cedar", "Harbor", "Quill", "Vantage", "Lumen", "Bright", "Ironwood",
  "Meridian", "Saltbox", "Kestrel", "Foxglove", "Ridgeline", "Anchor", "Pinegrove", "Tessellate",
  "Copperline", "Marbleway", "Fernbank", "Oakhaven"];
const TAIL = ["Logistics", "Health", "Labs", "Robotics", "Freight", "Media", "Systems", "Foods",
  "Analytics", "Bio", "Grid", "Works", "Interactive", "Dynamics", "Retail", "Partners",
  "Security", "Studios", "Energy", "Group"];
const COUNTRY = ["US", "US", "US", "GB", "DE", "CA", "AU", "SG", "PH", "NL", "FR", "JP"];
const INDUSTRY = ["logistics", "healthcare", "fintech", "manufacturing", "media", "retail",
  "education", "energy", "gaming", "public sector"];

const customers = [];
const usedNames = new Set();
for (let id = 1; id <= 400; id++) {
  let name;
  let guard = 0;
  do {
    name = `${pick(HEAD)} ${pick(TAIL)}`;
    // 400 names out of 400 combinations: the tail of that draw never converges by
    // chance, so fall back to a numbered suffix rather than spinning forever.
    if (++guard > 400) name = `${name} ${id}`;
  } while (usedNames.has(name));
  usedNames.add(name);
  const signed = int(0, 760);
  const status = chance(0.12) ? "churned" : chance(0.08) ? "trial" : "active";
  customers.push({ id, name, country: pick(COUNTRY), industry: pick(INDUSTRY), signed, status });
}

const subscriptions = [];
for (const c of customers) {
  const n = c.status === "trial" ? 1 : int(1, 3);
  for (let k = 0; k < n; k++) {
    const started = c.signed + int(0, 40) + k * int(60, 200);
    if (started > 900) continue;
    const cancelled = c.status === "churned" ? true : chance(0.14);
    subscriptions.push({
      id: subscriptions.length + 1,
      customer_id: c.id,
      plan_id: pick(PLANS)[0],
      seats: int(2, 240),
      started,
      ended: cancelled ? Math.min(started + int(90, 420), 940) : null,
      status: cancelled ? "cancelled" : chance(0.05) ? "paused" : "active",
    });
  }
}

const invoices = [];
const invoiceLines = [];
const payments = [];
const refunds = [];
let extSeq = 0;

// Invoices start where the books do - 2026-01-01, the first period the ledger
// covers. Billing every subscription from its own start date instead produced
// 9.8k invoices and a 3.2 MB migration, all of it history that no query in this
// demo reaches back into, and none of it reconcilable against a bank statement.
const BILLING_FROM = monthStart(1);

for (const s of subscriptions) {
  const plan = PLANS.find((p) => p[0] === s.plan_id);
  const last = Math.min(s.ended ?? 900, 900);
  // Keep the billing anniversary aligned to the subscription's own start day, so
  // issue dates still land on a believable monthly cycle instead of all at once.
  const skipped = Math.max(0, Math.ceil((BILLING_FROM - s.started) / 30));
  for (let issued = s.started + skipped * 30; issued <= last; issued += 30) {
    const inv = { id: invoices.length + 1, customer_id: s.customer_id, subscription_id: s.id, issued };
    const lines = [];
    lines.push(["subscription", `${plan[2]} plan - monthly`, 1, plan[3], plan[3]]);
    const seatAmt = s.seats * plan[4];
    lines.push(["seats", `${s.seats} seats at $${(plan[4] / 100).toFixed(2)}`, s.seats, plan[4], seatAmt]);
    if (chance(0.22)) {
      const units = int(1, 60);
      lines.push(["overage", `API overage - ${units}k calls`, units, 350, units * 350]);
    }
    if (chance(0.09)) {
      const disc = -Math.round((plan[3] + seatAmt) * 0.1);
      lines.push(["discount", "Annual commitment discount", 1, disc, disc]);
    }
    const total = lines.reduce((a, l) => a + l[4], 0);
    if (total <= 0) continue;

    // Anything issued after day ~880 is still in flight, so a realistic mix of
    // open and overdue invoices exists for the agent to actually find.
    const roll = r();
    const status = issued > 880
      ? (roll < 0.5 ? "open" : "paid")
      : roll < 0.88 ? "paid"
      : roll < 0.96 ? "open"
      : roll < 0.99 ? "uncollectible"
      : "void";

    inv.due = issued + 30;
    inv.total = total;
    inv.status = status;
    invoices.push(inv);
    for (const l of lines) {
      invoiceLines.push({ invoice_id: inv.id, kind: l[0], description: l[1], quantity: l[2], unit_cents: l[3], amount_cents: l[4] });
    }

    if (status === "paid") {
      const paid = issued + int(1, 34);
      const ref = `PAY-${String(++extSeq).padStart(6, "0")}`;
      payments.push({ id: payments.length + 1, invoice_id: inv.id, customer_id: inv.customer_id, paid, amount_cents: total, method: pick(["card", "card", "card", "ach", "wire", "credit"]), external_ref: ref });
      if (chance(0.025)) {
        refunds.push({ payment_id: payments.length, refunded: paid + int(3, 40), amount_cents: chance(0.5) ? total : Math.round(total * 0.5), reason: pick(["Duplicate charge", "Downgrade credit", "Service credit - incident", "Cancelled within trial"]) });
      }
    }
  }
}

const METRICS = ["api_calls", "seats_active", "reports_generated", "storage_gb", "exports"];
const usage = [];
for (let i = 0; i < 4000; i++) {
  const c = pick(customers);
  usage.push({ customer_id: c.id, occurred: int(Math.max(0, c.signed), 900), metric: pick(METRICS), quantity: int(1, 5000) });
}

const SUBJECTS = ["Export times out on large accounts", "SSO login loop after password reset",
  "Invoice total does not match the dashboard", "Webhook retries arriving out of order",
  "Cannot invite a user with a plus-addressed email", "Report scheduler skipped a run",
  "Seat count wrong after downgrade", "API returns 429 below the documented limit",
  "Data residency question for an EU tenant", "CSV import rejects valid dates"];
const tickets = [];
for (let i = 1; i <= 500; i++) {
  const c = pick(customers);
  const opened = int(Math.max(0, c.signed), 900);
  const resolved = chance(0.78);
  tickets.push({ id: i, customer_id: c.id, opened, closed: resolved ? opened + int(0, 25) : null, priority: pick(["low", "normal", "normal", "high", "urgent"]), subject: pick(SUBJECTS), status: resolved ? "resolved" : chance(0.5) ? "open" : "pending" });
}

const FIRST = ["ana", "ben", "cleo", "dev", "elin", "faye", "gus", "hana", "ivo", "juno",
  "kira", "lena", "milo", "nadia", "omar", "pia", "quinn", "rhys", "sana", "theo"];
const users = [];
const usedEmails = new Set();
for (const c of customers) {
  const domain = c.name.toLowerCase().replaceAll(" ", "") + ".example";
  const n = int(1, 4);
  for (let k = 0; k < n; k++) {
    const email = `${pick(FIRST)}${int(1, 99)}@${domain}`;
    if (usedEmails.has(email)) continue;
    usedEmails.add(email);
    users.push({ id: users.length + 1, customer_id: c.id, email, role: k === 0 ? "owner" : pick(["admin", "member", "member", "viewer"]), last_seen: chance(0.85) ? int(700, 900) : null });
  }
}

const FLAGS = [
  ["usage_based_billing", "Meter API calls and bill overage monthly", 35],
  ["sso_scim", "SCIM provisioning for enterprise directories", 100],
  ["new_report_builder", "Rebuilt report designer behind a flag", 20],
  ["eu_data_residency", "Route EU tenants to the Frankfurt region", 60],
  ["invoice_pdf_v2", "New invoice PDF renderer", 100],
  ["webhook_replay", "Let customers replay failed webhook deliveries", 45],
  ["seat_autoscale", "Auto-adjust seat count at period close", 5],
  ["audit_export", "Self-serve audit log export", 80],
];

const ACTIONS = ["subscription.updated", "invoice.voided", "user.invited", "plan.changed",
  "payment.refunded", "flag.toggled", "seat.adjusted", "export.requested"];
const audit = [];
for (let i = 0; i < 600; i++) {
  const u = pick(users);
  audit.push({ actor: u.id, action: pick(ACTIONS), entity: pick(["subscription", "invoice", "user", "plan"]), entity_id: int(1, 900), occurred: int(600, 900) });
}

const warehouse = [
  "-- Generated by scripts/gen-seed.mjs. Do not hand-edit; regenerate instead.",
  "-- Fictional data for TIDEWATER ANALYTICS, a company that does not exist.",
  "",
  rows("plans", ["id", "code", "name", "monthly_cents", "seat_cents", "is_active"],
    PLANS.map((p) => `(${p[0]}, ${q(p[1])}, ${q(p[2])}, ${p[3]}, ${p[4]}, ${p[1] === "legacy_pro" ? 0 : 1})`)),
  "",
  rows("customers", ["id", "name", "country", "industry", "signed_up_at", "status"],
    customers.map((c) => `(${c.id}, ${q(c.name)}, ${q(c.country)}, ${q(c.industry)}, ${q(day(c.signed))}, ${q(c.status)})`)),
  "",
  rows("subscriptions", ["id", "customer_id", "plan_id", "seats", "started_at", "ended_at", "status"],
    subscriptions.map((s) => `(${s.id}, ${s.customer_id}, ${s.plan_id}, ${s.seats}, ${q(day(s.started))}, ${s.ended === null ? "NULL" : q(day(s.ended))}, ${q(s.status)})`)),
  "",
  rows("invoices", ["id", "customer_id", "subscription_id", "issued_at", "due_at", "currency", "total_cents", "status"],
    invoices.map((i) => `(${i.id}, ${i.customer_id}, ${i.subscription_id}, ${q(day(i.issued))}, ${q(day(i.due))}, 'USD', ${i.total}, ${q(i.status)})`)),
  "",
  rows("invoice_lines", ["invoice_id", "kind", "description", "quantity", "unit_cents", "amount_cents"],
    invoiceLines.map((l) => `(${l.invoice_id}, ${q(l.kind)}, ${q(l.description)}, ${l.quantity}, ${l.unit_cents}, ${l.amount_cents})`)),
  "",
  rows("payments", ["id", "invoice_id", "customer_id", "paid_at", "amount_cents", "method", "external_ref"],
    payments.map((p) => `(${p.id}, ${p.invoice_id}, ${p.customer_id}, ${q(stamp(p.paid))}, ${p.amount_cents}, ${q(p.method)}, ${q(p.external_ref)})`)),
  "",
  rows("refunds", ["payment_id", "refunded_at", "amount_cents", "reason"],
    refunds.map((f) => `(${f.payment_id}, ${q(stamp(f.refunded))}, ${f.amount_cents}, ${q(f.reason)})`)),
  "",
  rows("usage_events", ["customer_id", "occurred_at", "metric", "quantity"],
    usage.map((u) => `(${u.customer_id}, ${q(stamp(u.occurred, 12))}, ${q(u.metric)}, ${u.quantity})`)),
  "",
  rows("support_tickets", ["id", "customer_id", "opened_at", "closed_at", "priority", "subject", "status"],
    tickets.map((t) => `(${t.id}, ${t.customer_id}, ${q(stamp(t.opened))}, ${t.closed === null ? "NULL" : q(stamp(t.closed))}, ${q(t.priority)}, ${q(t.subject)}, ${q(t.status)})`)),
  "",
  rows("users", ["id", "customer_id", "email", "role", "last_seen_at"],
    users.map((u) => `(${u.id}, ${u.customer_id}, ${q(u.email)}, ${q(u.role)}, ${u.last_seen === null ? "NULL" : q(stamp(u.last_seen, 15))})`)),
  "",
  rows("feature_flags", ["key", "description", "rollout_pct"],
    FLAGS.map((f) => `(${q(f[0])}, ${q(f[1])}, ${f[2]})`)),
  "",
  rows("audit_log", ["actor_user_id", "action", "entity", "entity_id", "occurred_at"],
    audit.map((a) => `(${a.actor}, ${q(a.action)}, ${q(a.entity)}, ${a.entity_id}, ${q(stamp(a.occurred, 11))})`)),
  "",
].join("\n");

// --------------------------------------------------------------------- books

const ACCOUNTS = [
  [1, "1000", "Bank - operating", "asset"],
  [2, "1100", "Accounts receivable", "asset"],
  [3, "2000", "Accounts payable", "liability"],
  [4, "2100", "Deferred revenue", "liability"],
  [5, "3000", "Retained earnings", "equity"],
  [6, "4000", "Subscription revenue", "revenue"],
  [7, "4100", "Overage revenue", "revenue"],
  [8, "5000", "Payment processing fees", "expense"],
  [9, "5100", "Hosting and infrastructure", "expense"],
  [10, "5200", "Contractors", "expense"],
];
const BANK = 1, AR = 2, AP = 3, REV = 6, FEES = 8, HOSTING = 9, CONTRACTORS = 10;

const entries = [];
const bankLines = [];
const statements = [];
let txnSeq = 0;
const txn = (p) => `${p}-${String(++txnSeq).padStart(5, "0")}`;

/** One balanced transaction: equal debits and credits, or it is not a transaction. */
function book(id, when, legs, memo, ref = null) {
  const d = legs.reduce((a, l) => a + (l[1] > 0 ? l[1] : 0), 0);
  const c = legs.reduce((a, l) => a + (l[1] < 0 ? -l[1] : 0), 0);
  if (d !== c) throw new Error(`unbalanced txn ${id}: debits ${d} != credits ${c}`);
  for (const [account, amount] of legs) {
    entries.push({
      txn_id: id, account_id: account, booked_at: when,
      debit_cents: amount > 0 ? amount : 0,
      credit_cents: amount < 0 ? -amount : 0,
      memo, external_ref: ref,
    });
  }
}

// Six monthly periods, Jan-Jun 2026. Cash in from settlements, cash out for fees,
// hosting and contractors. The bank statement is the independent record; the
// ledger is what the books say. reconcile_ledger compares the two.
let balance = 4_820_000;
for (let m = 1; m <= 6; m++) {
  const first = monthStart(m);
  const next = monthStart(m + 1);
  const period = `2026-${String(m).padStart(2, "0")}`;
  const opening = balance;
  const lines = [];

  // Cap the volume per period so an expanded reconciliation stays readable.
  const inPeriod = payments.filter((p) => p.paid >= first && p.paid < next).slice(0, 42);
  for (const p of inPeriod) {
    const ref = p.external_ref;
    lines.push({ date: p.paid, description: `Card settlement ${ref}`, amount: p.amount_cents, ref });
    book(txn("TXN"), day(p.paid), [[BANK, p.amount_cents], [AR, -p.amount_cents]], `Customer payment ${ref}`, ref);
    book(txn("TXN"), day(p.paid), [[AR, p.amount_cents], [REV, -p.amount_cents]], `Revenue recognised ${ref}`, null);
  }

  const hosting = 180_000 + int(0, 60_000);
  const hRef = `HOST-${period}`;
  lines.push({ date: first + 4, description: "Cloud hosting - monthly", amount: -hosting, ref: hRef });
  book(txn("EXP"), day(first + 4), [[HOSTING, hosting], [BANK, -hosting]], "Cloud hosting", hRef);

  const contractors = 420_000 + int(0, 140_000);
  const cRef = `CONT-${period}`;
  lines.push({ date: first + 12, description: "Contractor invoices", amount: -contractors, ref: cRef });
  book(txn("EXP"), day(first + 12), [[CONTRACTORS, contractors], [BANK, -contractors]], "Contractors", cRef);

  const fee = Math.round(inPeriod.reduce((a, p) => a + p.amount_cents, 0) * 0.029);
  const fRef = `FEE-${period}`;
  lines.push({ date: next - 1, description: "Payment processor fees", amount: -fee, ref: fRef });
  // JUNE PLANT #2 - the processor fee leaves the bank and is never booked.
  if (m !== 6) book(txn("FEE"), day(next - 1), [[FEES, fee], [BANK, -fee]], "Processor fees", fRef);

  if (m === 6) {
    // JUNE PLANT #1 - one settlement booked twice against a single bank line, so
    // the books claim more cash arrived than the bank says.
    const dup = inPeriod[3];
    if (dup) {
      book(txn("TXN"), day(dup.paid), [[BANK, dup.amount_cents], [AR, -dup.amount_cents]],
        `Customer payment ${dup.external_ref} (re-posted)`, dup.external_ref);
    }
    // JUNE PLANT #3 - money that landed on 30 June and was booked on 1 July.
    // Unmatched within June, but a timing difference rather than an error.
    const late = { ref: "TXN-LATE-0630", amount: 128_400 };
    lines.push({ date: next - 1, description: `Wire receipt ${late.ref}`, amount: late.amount, ref: late.ref });
    book(txn("TXN"), day(next), [[BANK, late.amount], [AR, -late.amount]], "Wire received 30 Jun, booked 1 Jul", late.ref);
    book(txn("TXN"), day(next), [[AR, late.amount], [REV, -late.amount]], `Revenue recognised ${late.ref}`, null);
  }

  // A payable accrual with no bank movement at all - proves the reconciliation
  // distinguishes "never touched the bank" from "missing from the bank".
  const accrual = 96_000 + int(0, 20_000);
  book(txn("ACR"), day(next - 2), [[HOSTING, accrual], [AP, -accrual]], "Accrued hosting - invoice not yet received", null);

  balance = opening + lines.reduce((a, l) => a + l.amount, 0);
  statements.push({ id: m, period, opening, closing: balance });
  for (const l of lines) {
    bankLines.push({ statement_id: m, value_date: day(l.date), description: l.description, amount_cents: l.amount, external_ref: l.ref });
  }
}

const books = [
  "-- Generated by scripts/gen-seed.mjs. Do not hand-edit; regenerate instead.",
  "-- Six periods of double-entry books plus the matching bank statements.",
  "-- June 2026 carries three deliberate reconciliation breaks: a settlement booked",
  "-- twice, a processor fee that never reached the ledger, and a receipt that",
  "-- landed on 30 June but was booked on 1 July. The first two are errors; the",
  "-- third is a timing difference, and reconcile_ledger must tell them apart.",
  "",
  rows("ledger_accounts", ["id", "code", "name", "type"],
    ACCOUNTS.map((a) => `(${a[0]}, ${q(a[1])}, ${q(a[2])}, ${q(a[3])})`)),
  "",
  rows("ledger_entries", ["txn_id", "account_id", "booked_at", "debit_cents", "credit_cents", "memo", "external_ref"],
    entries.map((e) => `(${q(e.txn_id)}, ${e.account_id}, ${q(e.booked_at)}, ${e.debit_cents}, ${e.credit_cents}, ${q(e.memo)}, ${e.external_ref === null ? "NULL" : q(e.external_ref)})`)),
  "",
  rows("bank_statements", ["id", "period", "opening_cents", "closing_cents"],
    statements.map((s) => `(${s.id}, ${q(s.period)}, ${s.opening}, ${s.closing})`)),
  "",
  rows("bank_statement_lines", ["statement_id", "value_date", "description", "amount_cents", "external_ref"],
    bankLines.map((b) => `(${b.statement_id}, ${q(b.value_date)}, ${q(b.description)}, ${b.amount_cents}, ${q(b.external_ref)})`)),
  "",
].join("\n");

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "0002_seed_warehouse.sql"), warehouse, "utf8");
writeFileSync(join(OUT, "0003_seed_ledger.sql"), books, "utf8");

const debits = entries.reduce((a, e) => a + e.debit_cents, 0);
const credits = entries.reduce((a, e) => a + e.credit_cents, 0);
console.log([
  `customers      ${customers.length}`,
  `subscriptions  ${subscriptions.length}`,
  `invoices       ${invoices.length}`,
  `invoice_lines  ${invoiceLines.length}`,
  `payments       ${payments.length}`,
  `refunds        ${refunds.length}`,
  `usage_events   ${usage.length}`,
  `tickets        ${tickets.length}`,
  `users          ${users.length}`,
  `audit_log      ${audit.length}`,
  `ledger_entries ${entries.length}`,
  `bank_lines     ${bankLines.length}`,
  `trial balance  ${debits} debits vs ${credits} credits -> ${debits === credits ? "BALANCED" : "UNBALANCED"}`,
].join("\n"));
