/**
 * POST /api/demos/split-brain/{start,tick,partition} and GET .../state.
 *
 * Three nodes contend for one lease over a real D1 database. The guarantee this
 * room exists to demonstrate is not a lock - a lock only answers "am I the
 * holder?" at the instant you ask it, and the failure mode here is a node that
 * WAS the holder, got cut off, came back, and still believes it is. It never asks
 * again; it just writes. A lock cannot catch that, because the write arrives
 * looking perfectly legitimate.
 *
 * A FENCING TOKEN can, because the store refuses any write carrying a token lower
 * than the one it has already accepted. The check has to live with the data - a
 * check performed anywhere else (in the node, in this handler, in the browser) is
 * exactly the kind of check a resumed node has no way to know it should run.
 *
 * TWO SEPARATE GUARANTEES, not one, and the room shows both:
 *
 *   1. LEASE ACQUISITION. One UPDATE, one WHERE clause: a node may take the lease
 *      only if it is free or its term has already lapsed. Never read-then-write -
 *      a second concurrent node could land in the gap between the read and the
 *      write, which is the exact bug this statement exists to make impossible.
 *   2. WRITE FENCING. A node that fails to acquire does not necessarily know it
 *      failed - an isolated node never even tries, so it keeps whatever token it
 *      last held. The INSERT that records its work is conditioned on that token
 *      still being current, checked again at the moment of the write, because the
 *      lease check above already happened in the past by the time the write
 *      arrives.
 *
 * A node's belief about who leads (`believes_leader`) is tracked separately from
 * the lease table on purpose. THE WHOLE DEMO IS THE GAP between what a node
 * believes and what is actually true, and an isolated node's belief is frozen the
 * instant it is cut off - nothing here ever reaches into an isolated node and
 * corrects it, because nothing could: that is what "isolated" means.
 *
 * PARTITION IS FAILOVER-LOGIC FAILURE INJECTION, NOT INFRASTRUCTURE FAILURE. No
 * process dies, no socket closes. `isolated` is a flag on the node's own row that
 * this handler checks BEFORE talking to the lease table, on that node's behalf -
 * the honest way to model "this node's outbound calls are failing" without
 * actually taking anything down.
 *
 * A tick's presented token, when the node did not just acquire or renew, is
 * reconstructed from that node's own event history rather than accepted from the
 * client. The client cannot be trusted to report its own staleness honestly - the
 * store has to be the one holding the memory of what a node last proved it knew.
 */

import { z } from "zod";
import type { DemoEnv } from "./router";
import { json } from "./router";
import { roomBySlug } from "../../src/lib/demos/registry";

export const START_ACTIONS = ["start"];

const ROOM = roomBySlug("split-brain")!;

const NODE_IDS = ["a", "b", "c"] as const;
type NodeId = (typeof NODE_IDS)[number];
const NodeIdSchema = z.enum(NODE_IDS);
const RunIdSchema = z.string().min(1).max(64);

const TickBody = z.object({ runId: RunIdSchema, node: NodeIdSchema });
const PartitionBody = z.object({ runId: RunIdSchema, node: NodeIdSchema, isolated: z.boolean() });

/** How long one term lasts. Real wall-clock time, not simulated - the countdown
 *  bar on the stage is this number counting down for real. */
const LEASE_MS = 4_000;

/** Arena housekeeping TTL, unrelated to the lease term above. Bounds how long an
 *  abandoned run's rows live before the shared sweep reclaims them. */
const ARENA_TTL_MS = 30 * 60 * 1000;

type EventKind =
  | "acquired" | "renewed" | "refused-held" | "refused-isolated"
  | "write-accepted" | "write-fenced" | "partitioned" | "healed";

export async function handle(action: string, req: Request, env: DemoEnv): Promise<Response> {
  // Every action here needs real rows - there is no mock fallback. A visitor
  // running `wrangler dev` without --remote sees this exact message instead of a
  // silently invented cluster.
  if (!env.DEMO_DB) {
    return json(
      {
        error:
          "No D1 database is bound (DEMO_DB is absent). This demo has no local fallback - run against --remote or the deployed Worker to see it live.",
      },
      503
    );
  }
  const db = env.DEMO_DB;

  switch (action) {
    case "start":
      return req.method === "POST" ? startRun(db) : json({ error: "start is POST only" }, 405);
    case "tick":
      return req.method === "POST" ? tick(db, req) : json({ error: "tick is POST only" }, 405);
    case "partition":
      return req.method === "POST" ? partition(db, req) : json({ error: "partition is POST only" }, 405);
    case "state":
      return req.method === "GET" ? getState(db, req) : json({ error: "state is GET only" }, 405);
    default:
      return json({ error: `Unknown split-brain action "${action}".` }, 404);
  }
}

/** Appends one log line. seq is computed in the same INSERT via a correlated
 *  subquery, so there is no separate read-then-write that a concurrent tick from
 *  another node could land in between. */
async function logEvent(
  db: D1Database, runId: string, node: string, kind: EventKind, token: number, detail: string
): Promise<void> {
  await db.prepare(
    `INSERT INTO split_brain_events (run_id, seq, at_ms, node, kind, token, detail)
     SELECT ?1, COALESCE((SELECT MAX(seq) FROM split_brain_events WHERE run_id = ?1), 0) + 1, ?2, ?3, ?4, ?5, ?6`
  ).bind(runId, Date.now(), node, kind, token, detail).run();
}

async function startRun(db: D1Database): Promise<Response> {
  const startedAt = Date.now();
  const runId = crypto.randomUUID();
  const now = Date.now();

  // Every row this run will ever need is inserted in one batch, so a client can
  // never observe a half-built arena - nodes with no lease row, or a lease with
  // no nodes to contend for it.
  await db.batch([
    db.prepare(
      `INSERT INTO split_brain_arenas (run_id, lease_ms, created_at, expires_at, reserved_rows)
       VALUES (?1, ?2, ?3, ?4, ?5)`
    ).bind(runId, LEASE_MS, now, now + ARENA_TTL_MS, ROOM.rowsPerRun),
    db.prepare(`INSERT INTO split_brain_leases (run_id, holder, expires_at, token) VALUES (?1, NULL, ?2, 0)`)
      .bind(runId, now),
    ...NODE_IDS.map((node) =>
      db.prepare(`INSERT INTO split_brain_nodes (run_id, node, isolated, believes_leader) VALUES (?1, ?2, 0, 0)`)
        .bind(runId, node)
    ),
  ]);

  return json({
    runId,
    leaseMs: LEASE_MS,
    nodes: NODE_IDS.map((node) => ({ node, isolated: false, believesLeader: false })),
    ms: Date.now() - startedAt,
  });
}

async function tick(db: D1Database, req: Request): Promise<Response> {
  const startedAt = Date.now();
  const parsed = TickBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "invalid tick body" }, 400);
  }
  const { runId, node } = parsed.data;

  const arena = await db.prepare(`SELECT lease_ms FROM split_brain_arenas WHERE run_id = ?1`)
    .bind(runId).first<{ lease_ms: number }>();
  if (!arena) {
    return json({ error: `No split-brain arena found for run "${runId}". It may have expired or never existed.` }, 404);
  }

  const nodeRow = await db.prepare(`SELECT isolated, believes_leader FROM split_brain_nodes WHERE run_id = ?1 AND node = ?2`)
    .bind(runId, node).first<{ isolated: number; believes_leader: number }>();
  if (!nodeRow) return json({ error: `Node "${node}" does not exist in run "${runId}".` }, 404);

  const now = Date.now();

  // The node's own code checks isolation BEFORE it ever reaches for the store.
  // Nothing dies, nothing is attempted - which is the honest shape of "this
  // node's outbound calls are failing" - and it is why an isolated node's belief
  // never gets corrected: it simply never asks.
  if (nodeRow.isolated) {
    await logEvent(db, runId, node, "refused-isolated", 0, `${node} is cut off from the store and did not attempt to contact it.`);
    return json({
      ok: true, node, isolated: true, lease: "skipped", write: "skipped",
      believesLeader: Boolean(nodeRow.believes_leader),
      presentedToken: null, currentToken: null, holder: null, expiresAt: null, writeSeq: null,
      detail: `${node} is isolated and never reached the store this tick.`,
      ms: Date.now() - startedAt,
    });
  }

  // RENEW first, since it is the common case for an already-healthy leader. It
  // succeeds only within the current term - once expires_at has passed, even the
  // rightful holder must go through ACQUIRE below and take a fresh token, because
  // by then another node may already have moved in.
  const renewed = await db.prepare(
    `UPDATE split_brain_leases SET expires_at = ?1
     WHERE run_id = ?2 AND holder = ?3 AND expires_at > ?4
     RETURNING token, expires_at`
  ).bind(now + arena.lease_ms, runId, node, now).first<{ token: number; expires_at: number }>();

  let won: { token: number; expires_at: number } | null = renewed ?? null;
  let kind: EventKind = renewed ? "renewed" : "refused-held";

  if (!won) {
    // THE GUARANTEE. One UPDATE, one WHERE clause: this node gets the lease only
    // if it is free or the current term has already lapsed - decided by the
    // database in the same statement that takes it, never by reading the row
    // first and deciding here. A second concurrent tick cannot land in a gap
    // that does not exist.
    const acquired = await db.prepare(
      `UPDATE split_brain_leases SET holder = ?1, expires_at = ?2, token = token + 1
       WHERE run_id = ?3 AND (holder IS NULL OR expires_at <= ?4)
       RETURNING token, expires_at`
    ).bind(node, now + arena.lease_ms, runId, now).first<{ token: number; expires_at: number }>();
    if (acquired) {
      won = acquired;
      kind = "acquired";
    }
  }

  await db.prepare(`UPDATE split_brain_nodes SET believes_leader = ?1 WHERE run_id = ?2 AND node = ?3`)
    .bind(won ? 1 : 0, runId, node).run();

  // The token this node presents to the write. A fresh win hands it back
  // directly. A refusal means falling back to whatever THIS node last proved it
  // knew - reconstructed from its own event history, never from anything a
  // client could supply, since a node's own honesty about its staleness is
  // exactly the thing this room exists to not rely on.
  let presentedToken: number;
  let currentHolder: NodeId | null;
  let currentToken: number;
  let currentExpiresAt: number;

  if (won) {
    presentedToken = won.token;
    currentHolder = node;
    currentToken = won.token;
    currentExpiresAt = won.expires_at;
  } else {
    const last = await db.prepare(
      `SELECT token FROM split_brain_events WHERE run_id = ?1 AND node = ?2 AND kind IN ('acquired', 'renewed') ORDER BY seq DESC LIMIT 1`
    ).bind(runId, node).first<{ token: number }>();
    presentedToken = last?.token ?? 0;
    const lease = await db.prepare(`SELECT holder, token, expires_at FROM split_brain_leases WHERE run_id = ?1`)
      .bind(runId).first<{ holder: NodeId | null; token: number; expires_at: number }>();
    currentHolder = lease?.holder ?? null;
    currentToken = lease?.token ?? 0;
    currentExpiresAt = lease?.expires_at ?? now;
  }

  await logEvent(
    db, runId, node, kind, presentedToken,
    kind === "refused-held"
      ? `${node} tried to acquire or renew; the lease is held by ${currentHolder ?? "nobody"} until ${new Date(currentExpiresAt).toISOString()}.`
      : `${node} ${kind === "acquired" ? "acquired" : "renewed"} the lease under term ${presentedToken}.`
  );

  // THE MONEY SHOT. Failing to acquire the lease does not stop a node from
  // trying to write - a node with a stale belief has no way to know it should
  // stop. So the write is checked again, independently, against whatever term
  // the store is actually on right now, in one statement with no read-then-write
  // gap: the comparison and the insert are the same operation.
  const writeResult = await db.prepare(
    `INSERT INTO split_brain_work (run_id, seq, written_by, token, at_ms)
     SELECT ?1, COALESCE((SELECT MAX(seq) FROM split_brain_work WHERE run_id = ?1), 0) + 1, ?2, ?3, ?4
     WHERE ?3 >= (SELECT token FROM split_brain_leases WHERE run_id = ?1)
     RETURNING seq`
  ).bind(runId, node, presentedToken, now).first<{ seq: number }>();

  await logEvent(
    db, runId, node, writeResult ? "write-accepted" : "write-fenced", presentedToken,
    writeResult
      ? `${node} wrote unit #${writeResult.seq} under term ${presentedToken}.`
      : `${node} tried to write under term ${presentedToken}; the store is on term ${currentToken} and refused it.`
  );

  return json({
    ok: true, node, isolated: false,
    lease: kind === "refused-held" ? "refused" : kind,
    write: writeResult ? "accepted" : "fenced",
    believesLeader: Boolean(won),
    presentedToken, currentToken, holder: currentHolder, expiresAt: currentExpiresAt,
    writeSeq: writeResult?.seq ?? null,
    detail: kind === "refused-held"
      ? `Refused: the lease is held by ${currentHolder ?? "nobody"}.`
      : `${kind === "acquired" ? "Acquired" : "Renewed"} term ${presentedToken}; write ${writeResult ? "accepted" : "fenced"}.`,
    ms: Date.now() - startedAt,
  });
}

async function partition(db: D1Database, req: Request): Promise<Response> {
  const startedAt = Date.now();
  const parsed = PartitionBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "invalid partition body" }, 400);
  }
  const { runId, node, isolated } = parsed.data;

  const updated = await db.prepare(
    `UPDATE split_brain_nodes SET isolated = ?1 WHERE run_id = ?2 AND node = ?3 RETURNING isolated`
  ).bind(isolated ? 1 : 0, runId, node).first<{ isolated: number }>();
  if (!updated) return json({ error: `No node "${node}" in run "${runId}" - the arena may not exist.` }, 404);

  const lease = await db.prepare(`SELECT token FROM split_brain_leases WHERE run_id = ?1`).bind(runId).first<{ token: number }>();

  await logEvent(
    db, runId, node, isolated ? "partitioned" : "healed", lease?.token ?? 0,
    isolated
      ? `${node} was cut off from the store. Whatever it currently believes about the lease is now frozen until it reconnects.`
      : `${node} reconnected to the store. Its belief has not been corrected yet - only its next tick will tell it the truth.`
  );

  return json({ ok: true, node, isolated, ms: Date.now() - startedAt });
}

async function getState(db: D1Database, req: Request): Promise<Response> {
  const startedAt = Date.now();
  const runId = new URL(req.url).searchParams.get("runId") ?? "";
  const parsed = RunIdSchema.safeParse(runId);
  if (!parsed.success) return json({ error: "runId query parameter is required" }, 400);

  const arena = await db.prepare(`SELECT lease_ms FROM split_brain_arenas WHERE run_id = ?1`)
    .bind(runId).first<{ lease_ms: number }>();
  if (!arena) return json({ error: `No split-brain arena found for run "${runId}".` }, 404);

  const [nodes, lease, events, work] = await Promise.all([
    db.prepare(`SELECT node, isolated, believes_leader AS "believesLeader" FROM split_brain_nodes WHERE run_id = ?1 ORDER BY node`)
      .bind(runId).all<{ node: string; isolated: number; believesLeader: number }>(),
    db.prepare(`SELECT holder, expires_at AS "expiresAt", token FROM split_brain_leases WHERE run_id = ?1`)
      .bind(runId).first<{ holder: string | null; expiresAt: number; token: number }>(),
    db.prepare(`SELECT seq, at_ms AS "atMs", node, kind, token, detail FROM split_brain_events WHERE run_id = ?1 ORDER BY seq ASC LIMIT 200`)
      .bind(runId).all(),
    db.prepare(`SELECT seq, written_by AS "writtenBy", token, at_ms AS "atMs" FROM split_brain_work WHERE run_id = ?1 ORDER BY seq ASC LIMIT 200`)
      .bind(runId).all(),
  ]);

  return json({
    runId,
    leaseMs: arena.lease_ms,
    nodes: (nodes.results ?? []).map((n) => ({ node: n.node, isolated: Boolean(n.isolated), believesLeader: Boolean(n.believesLeader) })),
    lease,
    events: events.results ?? [],
    work: work.results ?? [],
    ms: Date.now() - startedAt,
  });
}
