"use client";

/**
 * The four endpoints of /api/demos/split-brain/*, and nothing else. Every call
 * returns exactly what the Worker sent - no client-side guessing, no default values
 * standing in for a field the server did not report.
 *
 * The strictness that used to live here (a 200 carrying an `error` key is a
 * failure, and the server's own message is thrown verbatim) now lives in
 * src/lib/demos/fetch-json.ts, where all three rooms share it.
 */

import { fetchJson } from "@/lib/demos/fetch-json";
import type { NodeId, StartResult, TickResult, PartitionResult, StateResult } from "./types";

const BASE = "/api/demos/split-brain";

const call = <T,>(path: string, init?: RequestInit) => fetchJson<T>(`${BASE}/${path}`, init);

export const startRun = () => call<StartResult>("start", { method: "POST" });

export const tickNode = (runId: string, node: NodeId) =>
  call<TickResult>("tick", { method: "POST", body: JSON.stringify({ runId, node }) });

export const setPartition = (runId: string, node: NodeId, isolated: boolean) =>
  call<PartitionResult>("partition", { method: "POST", body: JSON.stringify({ runId, node, isolated }) });

export const fetchState = (runId: string) =>
  call<StateResult>(`state?runId=${encodeURIComponent(runId)}`);
