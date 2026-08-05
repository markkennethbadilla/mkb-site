"use client";

/**
 * Thin fetch wrappers over /api/demos/split-brain/*. Every call returns exactly
 * what the Worker sent - no client-side guessing, no default values standing in
 * for a field the server did not report.
 */

import type { NodeId, StartResult, TickResult, PartitionResult, StateResult } from "./types";

const BASE = "/api/demos/split-brain";

/** Thrown with the server's own error/detail string, verbatim - never rewritten
 *  into something generic on the way up to the component. */
export class ApiError extends Error {}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    ...init,
    headers: init?.body ? { "content-type": "application/json" } : undefined,
  });
  const body: unknown = await res.json().catch(() => null);
  const asRecord = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  if (!res.ok || !asRecord || typeof asRecord.error === "string") {
    throw new ApiError(
      asRecord && typeof asRecord.error === "string" ? asRecord.error : `Request to ${path} failed with status ${res.status}.`
    );
  }
  return body as T;
}

export const startRun = () => call<StartResult>("start", { method: "POST" });

export const tickNode = (runId: string, node: NodeId) =>
  call<TickResult>("tick", { method: "POST", body: JSON.stringify({ runId, node }) });

export const setPartition = (runId: string, node: NodeId, isolated: boolean) =>
  call<PartitionResult>("partition", { method: "POST", body: JSON.stringify({ runId, node, isolated }) });

export const fetchState = (runId: string) =>
  call<StateResult>(`state?runId=${encodeURIComponent(runId)}`);
