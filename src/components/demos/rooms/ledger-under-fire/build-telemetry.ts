import type { ActResult } from "./types";

/** requests/ms/source are required by the room contract; the rest is what this run measured. */
export function buildTelemetry(unsafeAct: ActResult | null, safeAct: ActResult | null) {
  const acts = [unsafeAct, safeAct].filter((a): a is ActResult => a !== null && a.state !== null);
  const items: { label: string; value: string }[] = [];
  if (acts.length === 0) return items;

  // Counted by the hook as each response lands, never derived. The arithmetic that
  // used to sit here (start + transfers + state) reported a request as successful
  // even when the trailing state read had failed.
  const requests = acts.reduce((sum, a) => sum + a.requestCount, 0);
  const totalMs = acts.reduce((sum, a) => sum + a.wallMs, 0);

  items.push({ label: "requests", value: `${requests} of the demo pool` });
  items.push({ label: "ms", value: String(totalMs) });
  items.push({ label: "source", value: "live D1 - ledger_race_* tables" });

  for (const act of acts) {
    const s = act.state!;
    const accepted = s.attempts.filter((a) => a.accepted).length;
    const refused = s.attempts.filter((a) => a.rejected).length;
    items.push({
      label: `${act.mode} invariant`,
      value: s.balanced ? `balanced - ${accepted} accepted, ${refused} refused` : `off by ${s.offByCents}c`,
    });
  }

  return items;
}
