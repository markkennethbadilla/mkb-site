"use client";

import { cn } from "@/lib/utils";
import { NodeCard } from "./node-card";
import { useCountdown } from "./use-countdown";
import { NODE_LETTER, type LeaseState, type NodeId, type NodeState } from "./types";

function Connector({ connected }: { connected: boolean }) {
  return (
    <div className="flex h-6 items-center justify-center" aria-hidden>
      <div
        className={cn(
          "h-full w-0.5 rounded-full",
          connected
            ? "bg-primary/50 animate-pulse motion-reduce:animate-none"
            : "border-l-2 border-dashed border-destructive/50"
        )}
      />
    </div>
  );
}

export function Stage({
  nodes, lease, leaseMs, busy, onTick, onPartition,
}: {
  nodes: NodeState[];
  lease: LeaseState | null;
  leaseMs: number;
  busy: boolean;
  onTick: (node: NodeId) => void;
  onPartition: (node: NodeId, isolated: boolean) => void;
}) {
  const remaining = useCountdown(lease?.holder ? lease.expiresAt : null);
  const pct = leaseMs > 0 && lease?.holder ? Math.min(100, Math.max(0, (remaining / leaseMs) * 100)) : 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Store: current holder</span>
            <p className="font-mono text-lg">{lease?.holder ? `Node ${NODE_LETTER[lease.holder]}` : "none"}</p>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Fencing token</span>
            <p className="font-mono text-2xl font-semibold tabular-nums">{lease?.token ?? 0}</p>
          </div>
          <div className="min-w-[160px] flex-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Lease countdown</span>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-150 ease-linear motion-reduce:transition-none"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground tabular-nums">
              {lease?.holder ? `${(remaining / 1000).toFixed(1)}s left in this term` : "free"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-4">
        {nodes.map((n) => (
          <div key={n.node} className="flex flex-col">
            <Connector connected={!n.isolated} />
            <NodeCard state={n} busy={busy} onTick={() => onTick(n.node)} onPartition={(iso) => onPartition(n.node, iso)} />
          </div>
        ))}
      </div>
    </div>
  );
}
