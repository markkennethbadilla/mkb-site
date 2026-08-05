/**
 * Ledger Under Fire - POST start, POST transfer, GET state.
 *
 * Twelve HTTP requests fire concurrently at ONE account (`operating`), paired
 * with a credit to a second account (`vendor`) that never races: crediting is a
 * single atomic `balance_cents = balance_cents + ?` in both modes, so the bug on
 * display stays isolated to the one read-then-write gap the unsafe path takes on
 * the debit. Two racing sides would tell two stories at once; one contended
 * account tells this one clearly, which is what registry.injectionPoint promises.
 *
 * THE TWO PATHS, and the whole demo is the size of the diff between them:
 *
 *   unsafe - SELECT balance, await a real write (the journal insert), then
 *     UPDATE the row to the number this request computed from that SELECT. A
 *     concurrent write landing in the awaited gap is silently overwritten. No
 *     funds check either - the unsafe path was never taught to refuse.
 *
 *   safe - INSERT OR IGNORE the journal row keyed (run_id, idem_key) first, so a
 *     retry of the same attempt is a no-op. Then ONE conditional UPDATE whose
 *     WHERE clause carries its own precondition: enough balance, AND a row in the
 *     journal proving THIS attempt (its nonce) is the one that won the insert.
 *     Nothing is read into JS and written back, so there is no gap for a
 *     concurrent write to land in.
 *
 * Every account, amount and company here is invented (registry.scope.staged).
 * The race itself is real: twelve genuinely concurrent fetches against a real D1
 * database. D1 serialises writes per database - the bug is the application's
 * read-then-write gap, not the storage engine, which is exactly what
 * registry.scope.real says and what the two code paths below are built to prove.
 *
 * Money and time are integers throughout: cents on every balance, epoch
 * milliseconds on every timestamp. Nothing here ever computes a fractional cent.
 *
 * KNOWN, UNFIXED GAP: the debit and the vendor credit are two separate D1 round
 * trips within one request, not one batched transaction. If the credit statement
 * itself throws after the debit already committed (a transient D1 failure, not
 * the race this room demonstrates), the request 500s with the debit already
 * applied and no matching credit - a real off-by that is not the one this room is
 * teaching. It is not batched here because the credit is conditioned on the
 * debit's JS-side outcome, which db.batch() cannot express, and replicating the
 * debit's WHERE-clause precondition onto the credit statement to make both
 * batchable was judged a bigger risk than the rare failure it would close.
 */

import { z } from "zod";
import type { DemoEnv } from "./router";
import { json } from "./router";
import { roomBySlug } from "../../src/lib/demos/registry";

const ROOM = roomBySlug("ledger-under-fire")!;

const OPERATING = "operating";
const VENDOR = "vendor";

const OPERATING_START_CENTS = 25_000;
const VENDOR_START_CENTS = 5_000;
const AMOUNT_CENTS = 4_000;
const TRANSFER_COUNT = 12;
const ARENA_TTL_MS = 30 * 60 * 1000;

export const START_ACTIONS = ["start"];

const RunIdSchema = z.string().min(1).max(64);
const StartBody = z.object({ mode: z.enum(["unsafe", "safe"]) });

const TransferBody = z.object({
  runId: RunIdSchema,
  idemKey: z.string().min(1).max(80),
  mode: z.enum(["unsafe", "safe"]),
  index: z.number().int().min(0).max(TRANSFER_COUNT - 1),
});

export async function handle(action: string, req: Request, env: DemoEnv): Promise<Response> {
  if (!env.DEMO_DB) {
    return json(
      {
        error:
          "DEMO_DB is not bound. Local dev without --remote has no D1 database, so this is refused rather than run unaccounted.",
      },
      503
    );
  }
  if (action === "start") return start(req, env.DEMO_DB);
  if (action === "transfer") return transfer(req, env.DEMO_DB);
  if (action === "state") return state(req, env.DEMO_DB);
  return json({ error: `unknown ledger-under-fire action "${action}"` }, 404);
}

async function start(req: Request, db: D1Database): Promise<Response> {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const parsed = StartBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "invalid request body" }, 400);
  }
  const { mode } = parsed.data;

  const runId = crypto.randomUUID();
  const now = Date.now();
  const genesisCents = OPERATING_START_CENTS + VENDOR_START_CENTS;

  try {
    await db.batch([
      db
        .prepare(
          `INSERT INTO ledger_race_arenas
             (run_id, mode, transfer_count, amount_cents, shard_size, genesis_cents, created_at, expires_at, reserved_rows)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
        )
        .bind(
          runId,
          mode,
          TRANSFER_COUNT,
          AMOUNT_CENTS,
          1,
          genesisCents,
          new Date(now).toISOString(),
          new Date(now + ARENA_TTL_MS).toISOString(),
          ROOM.rowsPerRun
        ),
      db
        .prepare(`INSERT INTO ledger_race_accounts (run_id, name, balance_cents, write_seq) VALUES (?1, ?2, ?3, 0)`)
        .bind(runId, OPERATING, OPERATING_START_CENTS),
      db
        .prepare(`INSERT INTO ledger_race_accounts (run_id, name, balance_cents, write_seq) VALUES (?1, ?2, ?3, 0)`)
        .bind(runId, VENDOR, VENDOR_START_CENTS),
    ]);
  } catch (e) {
    throw new Error(`could not create arena: ${String(e).slice(0, 160)}`);
  }

  return json({
    runId,
    mode,
    genesisCents,
    accounts: [
      { name: OPERATING, balanceCents: OPERATING_START_CENTS },
      { name: VENDOR, balanceCents: VENDOR_START_CENTS },
    ],
    transferCount: TRANSFER_COUNT,
    amountCents: AMOUNT_CENTS,
  });
}

type DebitOutcome = {
  accepted: boolean;
  reason?: "insufficient-funds" | "duplicate-idempotency-key";
  detail?: string;
  account?: { balance_cents: number; write_seq: number };
  journalChanges?: number;
};

async function unsafeDebit(
  db: D1Database,
  runId: string,
  idemKey: string,
  nonce: string,
  amountCents: number,
  bookedAt: string
): Promise<DebitOutcome> {
  const before = await db
    .prepare(`SELECT balance_cents FROM ledger_race_accounts WHERE run_id = ?1 AND name = ?2`)
    .bind(runId, OPERATING)
    .first<{ balance_cents: number }>();
  if (!before) throw new Error(`operating account missing for run ${runId}`);

  await db
    .prepare(
      `INSERT INTO ledger_race_entries (run_id, idem_key, attempt_nonce, amount_cents, booked_at)
       VALUES (?1, ?2, ?3, ?4, ?5)`
    )
    .bind(runId, idemKey, nonce, amountCents, bookedAt)
    .run();

  const after = await db
    .prepare(
      `UPDATE ledger_race_accounts SET balance_cents = ?1, write_seq = write_seq + 1
       WHERE run_id = ?2 AND name = ?3 RETURNING balance_cents, write_seq`
    )
    .bind(before.balance_cents - amountCents, runId, OPERATING)
    .first<{ balance_cents: number; write_seq: number }>();

  return { accepted: true, account: after ?? undefined };
}

async function safeDebit(
  db: D1Database,
  runId: string,
  idemKey: string,
  nonce: string,
  amountCents: number,
  bookedAt: string
): Promise<DebitOutcome> {
  const journal = await db
    .prepare(
      `INSERT OR IGNORE INTO ledger_race_entries (run_id, idem_key, attempt_nonce, amount_cents, booked_at)
       VALUES (?1, ?2, ?3, ?4, ?5)`
    )
    .bind(runId, idemKey, nonce, amountCents, bookedAt)
    .run();
  const journalChanges = journal.meta.changes ?? 0;

  if (journalChanges === 0) {
    return {
      accepted: false,
      reason: "duplicate-idempotency-key",
      detail: `idempotency key "${idemKey}" was already used on this run - a retry is a no-op, not a second payment.`,
      journalChanges,
    };
  }

  const after = await db
    .prepare(
      `UPDATE ledger_race_accounts
       SET balance_cents = balance_cents - ?1, write_seq = write_seq + 1
       WHERE run_id = ?2 AND name = ?3 AND balance_cents >= ?1
         AND EXISTS (
           SELECT 1 FROM ledger_race_entries
           WHERE run_id = ?2 AND idem_key = ?4 AND attempt_nonce = ?5
         )
       RETURNING balance_cents, write_seq`
    )
    .bind(amountCents, runId, OPERATING, idemKey, nonce)
    .first<{ balance_cents: number; write_seq: number }>();

  if (!after) {
    const current = await db
      .prepare(`SELECT balance_cents FROM ledger_race_accounts WHERE run_id = ?1 AND name = ?2`)
      .bind(runId, OPERATING)
      .first<{ balance_cents: number }>();
    return {
      accepted: false,
      reason: "insufficient-funds",
      detail: `operating held ${current?.balance_cents ?? 0} cents, short of the ${amountCents} this payment needed - refused before anything moved.`,
      journalChanges,
    };
  }

  return { accepted: true, account: after, journalChanges };
}

async function recordShard(
  db: D1Database,
  runId: string,
  index: number,
  outcome: { accepted: boolean; errored?: boolean },
  startedMs: number,
  wallMs: number
): Promise<void> {
  const accepted = outcome.accepted && !outcome.errored ? 1 : 0;
  const errored = outcome.errored ? 1 : 0;
  const rejected = !outcome.accepted && !outcome.errored ? 1 : 0;
  await db
    .prepare(
      `INSERT INTO ledger_race_shards (run_id, shard, phase, started_ms, wall_ms, accepted, rejected, errored)
       VALUES (?1, ?2, 'fire', ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT (run_id, shard, phase) DO UPDATE SET
         wall_ms = excluded.wall_ms, accepted = excluded.accepted,
         rejected = excluded.rejected, errored = excluded.errored`
    )
    .bind(runId, index, startedMs, wallMs, accepted, rejected, errored)
    .run();
}

async function transfer(req: Request, db: D1Database): Promise<Response> {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const parsed = TransferBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "invalid request body" }, 400);
  }
  const { runId, idemKey, mode, index } = parsed.data;
  const startedMs = Date.now();

  const arena = await db
    .prepare(`SELECT mode, amount_cents FROM ledger_race_arenas WHERE run_id = ?1`)
    .bind(runId)
    .first<{ mode: string; amount_cents: number }>();
  if (!arena) {
    return json({ error: `no arena found for runId "${runId}" - it may have expired or never existed` }, 404);
  }
  if (arena.mode !== mode) {
    return json({ error: `arena ${runId} was started in "${arena.mode}" mode, not "${mode}"` }, 400);
  }

  const bookedAt = new Date().toISOString();
  const nonce = crypto.randomUUID();

  try {
    const outcome =
      arena.mode === "unsafe"
        ? await unsafeDebit(db, runId, idemKey, nonce, arena.amount_cents, bookedAt)
        : await safeDebit(db, runId, idemKey, nonce, arena.amount_cents, bookedAt);

    const credited = outcome.accepted
      ? await db
          .prepare(
            `UPDATE ledger_race_accounts SET balance_cents = balance_cents + ?1, write_seq = write_seq + 1
             WHERE run_id = ?2 AND name = ?3 RETURNING balance_cents, write_seq`
          )
          .bind(arena.amount_cents, runId, VENDOR)
          .first<{ balance_cents: number; write_seq: number }>()
      : null;

    await recordShard(db, runId, index, outcome, startedMs, Date.now() - startedMs);

    return json({
      index,
      mode: arena.mode,
      accepted: outcome.accepted,
      reason: outcome.reason ?? null,
      detail: outcome.detail ?? null,
      journalChanges: outcome.journalChanges ?? null,
      amountCents: arena.amount_cents,
      operating: outcome.account
        ? { name: OPERATING, balanceCents: outcome.account.balance_cents, writeSeq: outcome.account.write_seq }
        : null,
      vendor: credited ? { name: VENDOR, balanceCents: credited.balance_cents, writeSeq: credited.write_seq } : null,
      ms: Date.now() - startedMs,
    });
  } catch (e) {
    await recordShard(db, runId, index, { accepted: false, errored: true }, startedMs, Date.now() - startedMs).catch(
      () => {}
    );
    throw new Error(`transfer ${index} on run ${runId} failed: ${String(e).slice(0, 160)}`);
  }
}

async function state(req: Request, db: D1Database): Promise<Response> {
  if (req.method !== "GET") return json({ error: "GET only" }, 405);
  const rawRunId = new URL(req.url).searchParams.get("runId") ?? "";
  const parsedRunId = RunIdSchema.safeParse(rawRunId);
  if (!parsedRunId.success) return json({ error: "runId query parameter is required" }, 400);
  const runId = parsedRunId.data;

  const arena = await db
    .prepare(`SELECT mode, genesis_cents, transfer_count, amount_cents FROM ledger_race_arenas WHERE run_id = ?1`)
    .bind(runId)
    .first<{ mode: string; genesis_cents: number; transfer_count: number; amount_cents: number }>();
  if (!arena) {
    return json({ error: `no arena found for runId "${runId}" - it may have expired or never existed` }, 404);
  }

  const [accountRes, shardRes, entriesCount] = await Promise.all([
    db
      .prepare(`SELECT name, balance_cents, write_seq FROM ledger_race_accounts WHERE run_id = ?1 ORDER BY name`)
      .bind(runId)
      .all<{ name: string; balance_cents: number; write_seq: number }>(),
    db
      .prepare(
        `SELECT shard, started_ms, wall_ms, accepted, rejected, errored
         FROM ledger_race_shards WHERE run_id = ?1 AND phase = 'fire' ORDER BY shard`
      )
      .bind(runId)
      .all<{ shard: number; started_ms: number; wall_ms: number; accepted: number; rejected: number; errored: number }>(),
    db.prepare(`SELECT COUNT(*) AS n FROM ledger_race_entries WHERE run_id = ?1`).bind(runId).first<{ n: number }>(),
  ]);

  const accounts = (accountRes.results ?? []).map((r) => ({
    name: r.name,
    balanceCents: r.balance_cents,
    writeSeq: r.write_seq,
  }));
  const totalCents = accounts.reduce((sum, a) => sum + a.balanceCents, 0);

  return json({
    runId,
    mode: arena.mode,
    genesisCents: arena.genesis_cents,
    accounts,
    totalCents,
    offByCents: totalCents - arena.genesis_cents,
    balanced: totalCents === arena.genesis_cents,
    attempts: (shardRes.results ?? []).map((r) => ({
      index: r.shard,
      accepted: r.accepted === 1,
      rejected: r.rejected === 1,
      errored: r.errored === 1,
      startedMs: r.started_ms,
      wallMs: r.wall_ms,
    })),
    entriesRecorded: entriesCount?.n ?? 0,
    transferCount: arena.transfer_count,
    amountCents: arena.amount_cents,
  });
}
