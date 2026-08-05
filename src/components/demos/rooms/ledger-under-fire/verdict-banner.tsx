"use client";

import type { StateResponse } from "./types";

function dollars(cents: number) {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export default function VerdictBanner({ state }: { state: StateResponse }) {
  const accepted = state.attempts.filter((a) => a.accepted).length;
  const refused = state.attempts.filter((a) => a.rejected).length;

  return (
    <div className="flex flex-col items-end gap-0.5 text-right">
      <span
        className="font-mono text-sm font-bold tracking-tight"
        style={{ color: state.balanced ? "oklch(0.55 0.16 var(--tint-hue))" : "var(--destructive)" }}
      >
        {state.balanced ? "BALANCED" : `OFF BY ${dollars(state.offByCents)}`}
      </span>
      <span className="font-mono text-[10px] text-muted-foreground">
        {dollars(state.totalCents)} actual vs {dollars(state.genesisCents)} genesis - {accepted} accepted, {refused} refused
      </span>
    </div>
  );
}
