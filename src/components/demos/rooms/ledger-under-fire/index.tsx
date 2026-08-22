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
        {/* Always rendered, empty until the state read lands. VerdictBanner is the
            room's status region, and a region that mounts holding its own text is a
            region assistive tech never sees change. */}
        <VerdictBanner state={act.state} />
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
        {/* NOT room.promise. The shell already prints that directly above this
            component, and setting the same four lines twice on one screen at two
            different sizes reads as a rendering bug. This is the room's own
            question, pointed at the mechanism rather than at the instructions. */}
        <h2 className="text-2xl font-semibold tracking-tight text-pretty sm:text-3xl">
          Twelve payments, one account, no waiting in line. What do the books say afterwards?
        </h2>
        {!unsafeAct && (
          <Button size="lg" className="self-start" onClick={runUnsafe} disabled={running !== null}>
            {running ? "Firing..." : room.startLabel}
          </Button>
        )}
        {/* A list, not the paragraph this was. Three uneven facts a visitor can take
            one at a time, and the last one is the only one an engineer needs. */}
        <ul className="flex max-w-2xl list-disc flex-col gap-1 pl-4 text-xs leading-relaxed text-muted-foreground">
          <li>Every payment debits the same operating account and credits a vendor account.</li>
          <li>Only the debit is raced.</li>
          <li>
            Crediting is one atomic SQL increment in both modes, so the bug sits in the single
            read-then-write gap the unsafe path takes.
          </li>
        </ul>
      </div>

      {/* role="alert" rather than a live region kept mounted. An alert node is
          announced when it is inserted carrying its text, which is how a refusal
          from the budget gate reaches someone who cannot see the button re-enable. */}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

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
