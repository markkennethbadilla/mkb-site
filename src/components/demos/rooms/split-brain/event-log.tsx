"use client";

import { cn } from "@/lib/utils";
import { NODE_LETTER, type EventRow, type NodeId, type WorkRow } from "./types";

const KIND_TONE: Record<string, string> = {
  acquired: "text-primary",
  renewed: "text-primary",
  "write-accepted": "text-primary",
  "refused-held": "text-muted-foreground",
  "refused-isolated": "text-destructive",
  "write-fenced": "text-destructive",
  partitioned: "text-destructive",
  healed: "text-muted-foreground",
};

/**
 * Milliseconds matter here - two events a few of them apart is the whole reason the
 * log is readable - and fractionalSecondDigits has covered that since ES2021, so
 * there is nothing left for a hand-built HH:MM:SS.mmm to do. Hoisted, because the
 * formatter is built once and every row reuses it.
 */
const CLOCK = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  fractionalSecondDigits: 3,
  hourCycle: "h23",
});

function letterOf(node: string): string {
  return NODE_LETTER[node as NodeId] ?? node;
}

export function EventLog({ events }: { events: EventRow[] }) {
  if (!events.length) {
    return <p className="text-xs text-muted-foreground">No events yet - start the cluster and tick a node.</p>;
  }
  const ordered = [...events].reverse();
  return (
    <div className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2 font-mono text-[11px]">
      {ordered.map((e) => (
        <div key={e.seq} className="flex items-baseline gap-2">
          <span className="shrink-0 tabular-nums text-muted-foreground/70">{CLOCK.format(e.atMs)}</span>
          <span className="w-4 shrink-0 text-center opacity-70">{letterOf(e.node)}</span>
          <span className={cn("w-28 shrink-0 uppercase tracking-wide", KIND_TONE[e.kind] ?? "")}>{e.kind}</span>
          <span className="text-foreground/80">{e.detail}</span>
        </div>
      ))}
    </div>
  );
}

export function WorkLog({ work }: { work: WorkRow[] }) {
  if (!work.length) {
    return <p className="text-xs text-muted-foreground">No write has been accepted yet.</p>;
  }
  const ordered = [...work].reverse();
  return (
    <ol className="flex max-h-72 flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2 font-mono text-[11px]">
      {ordered.map((w) => (
        <li key={w.seq} className="flex items-baseline gap-2">
          <span className="shrink-0 tabular-nums text-muted-foreground/70">#{w.seq}</span>
          <span>written by node {letterOf(w.writtenBy)}</span>
          <span className="text-muted-foreground">under term {w.token}</span>
        </li>
      ))}
    </ol>
  );
}
