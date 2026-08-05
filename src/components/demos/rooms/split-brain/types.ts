/**
 * Wire types for the split-brain room, hand-mirrored against
 * worker/demos/split-brain.ts because the static export and the Worker are two
 * separate bundles with nothing to share a type across at build time.
 */

export const NODE_IDS = ["a", "b", "c"] as const;
export type NodeId = (typeof NODE_IDS)[number];

export const NODE_LETTER: Record<NodeId, string> = { a: "A", b: "B", c: "C" };

export type NodeState = {
  node: NodeId;
  isolated: boolean;
  believesLeader: boolean;
};

export type LeaseState = {
  holder: NodeId | null;
  expiresAt: number;
  token: number;
};

export type EventKind =
  | "acquired" | "renewed" | "refused-held" | "refused-isolated"
  | "write-accepted" | "write-fenced" | "partitioned" | "healed";

export type EventRow = {
  seq: number;
  atMs: number;
  node: string;
  kind: EventKind;
  token: number;
  detail: string;
};

export type WorkRow = {
  seq: number;
  writtenBy: string;
  token: number;
  atMs: number;
};

export type StartResult = {
  runId: string;
  leaseMs: number;
  nodes: NodeState[];
  ms: number;
};

export type TickResult = {
  ok: true;
  node: NodeId;
  isolated: boolean;
  lease: "acquired" | "renewed" | "refused" | "skipped";
  write: "accepted" | "fenced" | "skipped";
  believesLeader: boolean;
  presentedToken: number | null;
  currentToken: number | null;
  holder: NodeId | null;
  expiresAt: number | null;
  writeSeq: number | null;
  detail: string;
  ms: number;
};

export type PartitionResult = {
  ok: true;
  node: NodeId;
  isolated: boolean;
  ms: number;
};

export type StateResult = {
  runId: string;
  leaseMs: number;
  nodes: NodeState[];
  lease: LeaseState | null;
  events: EventRow[];
  work: WorkRow[];
  ms: number;
};
