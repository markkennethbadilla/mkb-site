/** Shared shapes for the ledger-under-fire room, matching worker/demos/ledger.ts exactly. */

export type LedgerMode = "unsafe" | "safe";

/** The account every one of the twelve payments is debited from - the one under fire. */
export const CONTENDED_ACCOUNT = "operating";

export type StartResponse = {
  runId: string;
  mode: LedgerMode;
  genesisCents: number;
  accounts: { name: string; balanceCents: number }[];
  transferCount: number;
  amountCents: number;
};

export type TransferResponse = {
  index: number;
  mode: LedgerMode;
  accepted: boolean;
  reason: "insufficient-funds" | "duplicate-idempotency-key" | null;
  detail: string | null;
  journalChanges: number | null;
  amountCents: number;
  operating: { name: string; balanceCents: number; writeSeq: number } | null;
  vendor: { name: string; balanceCents: number; writeSeq: number } | null;
  ms: number;
};

export type Attempt = {
  index: number;
  accepted: boolean;
  rejected: boolean;
  errored: boolean;
  startedMs: number;
  wallMs: number;
};

export type StateResponse = {
  runId: string;
  mode: LedgerMode;
  genesisCents: number;
  accounts: { name: string; balanceCents: number; writeSeq: number }[];
  totalCents: number;
  offByCents: number;
  balanced: boolean;
  attempts: Attempt[];
  entriesRecorded: number;
  transferCount: number;
  amountCents: number;
};

/** One of the twelve rows, built client-side from a real transfer response. */
export type LedgerRow = {
  index: number;
  status: "pending" | "landed";
  accepted?: boolean;
  reason?: string | null;
  detail?: string | null;
  writeSeq?: number;
  balanceCents?: number;
  ms?: number;
};

/** One full 12-fire run in one mode - the unit the UI shows side by side. */
export type ActResult = {
  mode: LedgerMode;
  runId: string;
  genesisCents: number;
  amountCents: number;
  operatingStartCents: number;
  rows: LedgerRow[];
  state: StateResponse | null;
  wallMs: number;
  /** Responses actually received for this act, counted one at a time as they land. */
  requestCount: number;
};
