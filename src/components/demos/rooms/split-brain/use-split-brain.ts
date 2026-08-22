"use client";

/**
 * All the state for one cluster, plus the derived "next guided step" - computed
 * from the real node rows every render, never a script the UI plays back. The
 * only client-only memory is WHICH node this session isolated first and WHETHER
 * its post-heal tick has happened yet: both are UX bookkeeping for which
 * instruction to show next, not facts about the system, which always come
 * straight from the last server response.
 */

import { useCallback, useState } from "react";
import { startRun, tickNode, setPartition, fetchState } from "./api";
import { NODE_IDS, type NodeId, type NodeState, type LeaseState, type EventRow, type WorkRow } from "./types";

export type StepId = "elect" | "isolate" | "wait-round" | "heal" | "prove" | "done";

type State = {
  runId: string | null;
  leaseMs: number;
  nodes: NodeState[];
  lease: LeaseState | null;
  events: EventRow[];
  work: WorkRow[];
  busy: boolean;
  error: string | null;
  requestCount: number;
  lastMs: number;
};

const INITIAL: State = {
  runId: null, leaseMs: 0, nodes: [], lease: null, events: [], work: [],
  busy: false, error: null, requestCount: 0, lastMs: 0,
};

export function useSplitBrain() {
  const [state, setState] = useState<State>(INITIAL);
  // State, not refs. Both of these are read during render to decide which
  // instruction the guided panel shows next, and a ref read during render is a
  // value React has not been told to re-render for - the panel would sit on a
  // stale step until something else happened to move it.
  const [isolatedFirst, setIsolatedFirst] = useState<NodeId | null>(null);
  const [proved, setProved] = useState(false);

  const refresh = useCallback(async (runId: string) => {
    const data = await fetchState(runId);
    setState((s) => ({
      ...s,
      leaseMs: data.leaseMs, nodes: data.nodes, lease: data.lease, events: data.events, work: data.work,
      requestCount: s.requestCount + 1, lastMs: data.ms,
    }));
  }, []);

  /** Every mutating action shares this shape: mark busy, clear the previous
   *  error optimistically, run the real calls, surface whatever the server
   *  actually said if one failed. Nothing here invents a result. */
  const run = useCallback((fn: () => Promise<void>) => {
    setState((s) => ({ ...s, busy: true, error: null }));
    return fn()
      .catch((e: unknown) => {
        const detail = e instanceof Error ? e.message : String(e);
        setState((s) => ({ ...s, error: detail }));
      })
      .finally(() => setState((s) => ({ ...s, busy: false })));
  }, []);

  const doStart = useCallback(() => run(async () => {
    const data = await startRun();
    setIsolatedFirst(null);
    setProved(false);
    setState((s) => ({
      ...s, runId: data.runId, leaseMs: data.leaseMs, nodes: data.nodes,
      requestCount: s.requestCount + 1, lastMs: data.ms,
    }));
    await refresh(data.runId);
  }), [run, refresh]);

  /** A round: all three nodes tick CONCURRENTLY, real parallel fetches, not
   *  sequential awaits dressed up to look that way. allSettled so one node's
   *  failure does not hide what the other two genuinely did. */
  const doRound = useCallback((runId: string) => run(async () => {
    const results = await Promise.allSettled(NODE_IDS.map((n) => tickNode(runId, n)));
    const oks = results.filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof tickNode>>> => r.status === "fulfilled");
    if (oks.length) {
      setState((s) => ({ ...s, requestCount: s.requestCount + oks.length, lastMs: Math.max(...oks.map((r) => r.value.ms)) }));
    }
    await refresh(runId);
    const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (failed) throw failed.reason instanceof Error ? failed.reason : new Error(String(failed.reason));
  }), [run, refresh]);

  const doTickOne = useCallback((runId: string, node: NodeId) => run(async () => {
    const data = await tickNode(runId, node);
    setState((s) => ({ ...s, requestCount: s.requestCount + 1, lastMs: data.ms }));
    await refresh(runId);
    if (node === isolatedFirst) setProved(true);
  }), [run, refresh, isolatedFirst]);

  const doPartition = useCallback((runId: string, node: NodeId, isolated: boolean) => run(async () => {
    if (isolated) setIsolatedFirst(node);
    const data = await setPartition(runId, node, isolated);
    setState((s) => ({ ...s, requestCount: s.requestCount + 1, lastMs: data.ms }));
    await refresh(runId);
  }), [run, refresh]);

  const leader = state.nodes.find((n) => !n.isolated && n.believesLeader) ?? null;
  const isolatedNode = state.nodes.find((n) => n.isolated) ?? null;
  const hasIsolatedBefore = isolatedFirst !== null;

  let step: StepId = "elect";
  if (isolatedNode && !leader) step = "wait-round";
  else if (isolatedNode && leader) step = "heal";
  else if (leader && !hasIsolatedBefore) step = "isolate";
  else if (!isolatedNode && hasIsolatedBefore && !proved) step = "prove";
  else if (proved) step = "done";

  return {
    state, step, leader, isolatedNode,
    actions: {
      doStart,
      doRound: () => (state.runId ? doRound(state.runId) : undefined),
      doTickOne: (node: NodeId) => (state.runId ? doTickOne(state.runId, node) : undefined),
      doPartition: (node: NodeId, isolated: boolean) => (state.runId ? doPartition(state.runId, node, isolated) : undefined),
    },
  };
}
