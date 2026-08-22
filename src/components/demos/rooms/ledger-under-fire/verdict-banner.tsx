"use client";

import { dollars } from "./money";
import type { StateResponse } from "./types";

/**
 * BALANCED or OFF BY is the one sentence this room exists to produce, so it is a
 * status region rather than plain text.
 *
 * The wrapper is rendered from the moment the act starts, holding nothing, and the
 * verdict is filled in when the state read lands. A polite live region has to be in
 * the DOM BEFORE its content changes or assistive tech has nothing to observe the
 * change against, which is what a region mounted together with its own text gets
 * wrong.
 */
export default function VerdictBanner({ state }: { state: StateResponse | null }) {
  return (
    <div role="status" className="flex flex-col items-end gap-0.5 text-right">
      {state && <Verdict state={state} />}
    </div>
  );
}

function Verdict({ state }: { state: StateResponse }) {
  const accepted = state.attempts.filter((a) => a.accepted).length;
  const refused = state.attempts.filter((a) => a.rejected).length;

  return (
    <>
      <span
        className="font-mono text-sm font-bold tracking-tight"
        style={{ color: state.balanced ? "oklch(0.55 0.16 var(--tint-hue))" : "var(--destructive)" }}
      >
        {state.balanced ? "BALANCED" : `OFF BY ${dollars(state.offByCents)}`}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground">
        {dollars(state.totalCents)} actual vs {dollars(state.genesisCents)} genesis - {accepted} accepted, {refused} refused
      </span>
    </>
  );
}
