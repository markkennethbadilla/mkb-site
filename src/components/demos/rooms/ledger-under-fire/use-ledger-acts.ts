"use client";

/**
 * Orchestrates one act: start the arena, fire all twelve transfers genuinely
 * concurrently with Promise.all, then read back the authoritative state.
 *
 * Each transfer updates ITS OWN row the moment its own response lands - rows in
 * the table arrive in real network order, not index order, which is the point.
 * The state read afterwards is what the verdict and telemetry are built from, not
 * a client-side tally, so the numbers on screen come from the database that just
 * did the work.
 */

import { useCallback, useState } from "react";
import { roomBySlug } from "@/lib/demos/registry";
import {
  CONTENDED_ACCOUNT,
  type ActResult,
  type LedgerMode,
  type LedgerRow,
  type StartResponse,
  type StateResponse,
  type TransferResponse,
} from "./types";

const room = roomBySlug("ledger-under-fire")!;
const BASE = `/api/demos/${room.slug}`;

async function postJson<T>(action: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `${action} failed with status ${res.status}`);
  return data as T;
}

export function useLedgerActs() {
  const [unsafeAct, setUnsafeAct] = useState<ActResult | null>(null);
  const [safeAct, setSafeAct] = useState<ActResult | null>(null);
  const [running, setRunning] = useState<LedgerMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (mode: LedgerMode) => {
    setRunning(mode);
    setError(null);
    const setAct = mode === "unsafe" ? setUnsafeAct : setSafeAct;
    const startedAll = Date.now();

    try {
      const started = await postJson<StartResponse>("start", { mode });
      const operatingStartCents =
        started.accounts.find((a) => a.name === CONTENDED_ACCOUNT)?.balanceCents ?? 0;
      const rows: LedgerRow[] = Array.from({ length: started.transferCount }, (_, index) => ({
        index,
        status: "pending",
      }));
      setAct({
        mode,
        runId: started.runId,
        genesisCents: started.genesisCents,
        amountCents: started.amountCents,
        operatingStartCents,
        rows,
        state: null,
        wallMs: 0,
      });

      await Promise.all(
        rows.map(async ({ index }) => {
          let landed: LedgerRow;
          try {
            const data = await postJson<TransferResponse>("transfer", {
              runId: started.runId,
              idemKey: `${started.runId}:${index}`,
              mode,
              index,
            });
            landed = {
              index,
              status: "landed",
              accepted: data.accepted,
              reason: data.reason,
              detail: data.detail,
              writeSeq: data.operating?.writeSeq,
              balanceCents: data.operating?.balanceCents,
              ms: data.ms,
            };
          } catch (e) {
            landed = {
              index,
              status: "landed",
              accepted: false,
              reason: "request-failed",
              detail: e instanceof Error ? e.message : String(e),
            };
          }
          setAct((prev) =>
            prev && prev.runId === started.runId
              ? { ...prev, rows: prev.rows.map((r) => (r.index === index ? landed : r)) }
              : prev
          );
        })
      );

      const stateRes = (await fetch(`${BASE}/state?runId=${encodeURIComponent(started.runId)}`)
        .then((r) => r.json())
        .catch(() => null)) as StateResponse | null;

      setAct((prev) =>
        prev && prev.runId === started.runId ? { ...prev, state: stateRes, wallMs: Date.now() - startedAll } : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(null);
    }
  }, []);

  return {
    unsafeAct,
    safeAct,
    running,
    error,
    runUnsafe: useCallback(() => run("unsafe"), [run]),
    runSafe: useCallback(() => run("safe"), [run]),
  };
}
