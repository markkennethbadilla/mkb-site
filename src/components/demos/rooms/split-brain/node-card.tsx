"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NODE_LETTER, type NodeState } from "./types";

/**
 * One node's own panel. LEADER / FOLLOWER / ISOLATED is a discrete state, not a
 * gradient - a node either currently believes it holds the lease or it does not,
 * and isolation either applies or it does not. Nothing on this state path carries
 * a CSS transition: the room's motion character is "discrete", and animating a
 * cut in belief would visually claim a gradual handover that never happens.
 */
function roleOf(state: NodeState): "leader" | "follower" | "isolated" {
  if (state.isolated) return "isolated";
  return state.believesLeader ? "leader" : "follower";
}

const ROLE_LABEL: Record<ReturnType<typeof roleOf>, string> = {
  leader: "Believes it leads",
  follower: "Follower",
  isolated: "Cut off from the store",
};

const ROLE_CLASS: Record<ReturnType<typeof roleOf>, string> = {
  leader: "border-primary/60 bg-primary/10",
  follower: "border-border bg-card",
  isolated: "border-destructive/50 bg-destructive/5",
};

const ROLE_DOT: Record<ReturnType<typeof roleOf>, string> = {
  leader: "bg-primary",
  follower: "bg-muted-foreground/40",
  isolated: "bg-destructive",
};

export function NodeCard({
  state,
  busy,
  onTick,
  onPartition,
}: {
  state: NodeState;
  busy: boolean;
  onTick: () => void;
  onPartition: (isolated: boolean) => void;
}) {
  const role = roleOf(state);

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border p-4", ROLE_CLASS[role])}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span aria-hidden className={cn("h-2 w-2 rounded-full", ROLE_DOT[role])} />
          <span className="font-mono text-sm font-semibold">Node {NODE_LETTER[state.node]}</span>
        </div>
        <span className="text-[11px] text-muted-foreground">{ROLE_LABEL[role]}</span>
      </div>

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        {state.isolated
          ? "Its next tick will not reach the store. Reconnect it to find out what it still believes."
          : state.believesLeader
            ? "It believes it holds the lease and will try to renew it on its next tick."
            : "It will try to acquire the lease on its next tick."}
      </p>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={onTick}>
          Tick
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => onPartition(!state.isolated)}>
          {state.isolated ? "Reconnect" : "Cut off"}
        </Button>
      </div>
    </div>
  );
}
