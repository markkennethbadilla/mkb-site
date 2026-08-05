"use client";

/**
 * Ledger Under Fire. Act one always runs unsafe - the visitor presses one
 * button and watches twelve concurrent payments corrupt a balance. Act two,
 * offered only once act one has actually landed, runs the identical scenario
 * through the safe path. Nothing here runs on load and nothing is precomputed;
 * every number in both acts comes back from worker/demos/ledger.ts's own writes.
 */

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { roomBySlug } from "@/lib/demos/registry";
import { TelemetryStrip } from "@/components/demos/shell/telemetry";
import { useLedgerActs } from "./use-ledger-acts";
import LedgerTable from "./ledger-table";
import BalanceChart from "./balance-chart";
import VerdictBanner from "./verdict-banner";
import { buildTelemetry } from "./build-telemetry";
import type { ActResult } from "./types";

const room = roomBySlug("ledger-under-fire")!;

function ActPanel({ act, label }: { act: ActResult; label: string }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{label}</h3>
        {act.state && <VerdictBanner state={act.state} />}
      </div>
      <BalanceChart rows={act.rows} operatingStartCents={act.operatingStartCents} />
      <LedgerTable rows={act.rows} amountCents={act.amountCents} />
    </div>
  );
}

export default function Room() {
  const { unsafeAct, safeAct, running, error, runUnsafe, runSafe } = useLedgerActs();
  const unsafeSettled = unsafeAct?.state != null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-pretty sm:text-3xl">{room.promise}</h2>
        {!unsafeAct && (
          <Button size="lg" className="self-start" onClick={runUnsafe} disabled={running !== null}>
            {running ? "Firing..." : room.startLabel}
          </Button>
        )}
        <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Every payment debits the same operating account and credits a vendor account. Only the
          debit is raced: crediting is one atomic SQL increment in both modes, so the bug you are
          about to watch is isolated to the single read-then-write gap the unsafe path takes.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {unsafeAct && (
        <div className={cn("grid gap-6", safeAct && "lg:grid-cols-2")}>
          <ActPanel act={unsafeAct} label="Act 1 - unsafe path" />
          {safeAct && <ActPanel act={safeAct} label="Act 2 - safe path" />}
        </div>
      )}

      {unsafeSettled && !safeAct && (
        <Button size="lg" variant="outline" className="self-start" onClick={runSafe} disabled={running !== null}>
          {running === "safe" ? "Firing..." : "Now run the safe path"}
        </Button>
      )}

      {(unsafeAct?.state || safeAct?.state) && <TelemetryStrip items={buildTelemetry(unsafeAct, safeAct)} />}
    </div>
  );
}
