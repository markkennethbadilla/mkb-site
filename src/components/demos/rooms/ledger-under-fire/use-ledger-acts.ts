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
 *
 * requestCount is incremented once per response actually received, for the same
 * reason. The telemetry strip prints it, and a request count derived by arithmetic
 * is a number with the authority of a measurement and the reliability of a comment.
 */

import { useCallback, useState } from "react";
import { fetchJson } from "@/lib/demos/fetch-json";
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

const post = <T,>(action: string, body: unknown) =>
  fetchJson<T>(`${BASE}/${action}`, { method: "POST", body: JSON.stringify(body) });

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
      const started = await post<StartResponse>("start", { mode });
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
        requestCount: 1,
      });

      await Promise.all(
        rows.map(async ({ index }) => {
          let landed: LedgerRow;
          let answered = true;
          try {
            const data = await post<TransferResponse>("transfer", {
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
            answered = false;
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
              ? {
                  ...prev,
                  rows: prev.rows.map((r) => (r.index === index ? landed : r)),
                  requestCount: prev.requestCount + (answered ? 1 : 0),
                }
              : prev
          );
        })
      );

      // Not swallowed. This read is where the verdict, the invariant and every
      // telemetry number come from, so a run that loses it has nothing to show and
      // should say so rather than sit there looking finished.
      const stateRes = await fetchJson<StateResponse>(
        `${BASE}/state?runId=${encodeURIComponent(started.runId)}`
      );

      setAct((prev) =>
        prev && prev.runId === started.runId
          ? {
              ...prev,
              state: stateRes,
              wallMs: Date.now() - startedAll,
              requestCount: prev.requestCount + 1,
            }
          : prev
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
