"use client";

import { Button } from "@/components/ui/button";
import { NODE_LETTER, type NodeState } from "./types";
import type { StepId } from "./use-split-brain";

type Cta = { text: string; label: string; onClick: () => void };

function computeCta(
  step: StepId,
  leader: NodeState | null,
  isolatedNode: NodeState | null,
  onElect: () => void,
  onIsolate: (n: NodeState) => void,
  onWaitRound: () => void,
  onHeal: (n: NodeState) => void,
  onProve: (n: NodeState) => void
): Cta | null {
  const L = leader ? NODE_LETTER[leader.node] : "";
  const I = isolatedNode ? NODE_LETTER[isolatedNode.node] : "";

  if (step === "elect") {
    return {
      text: "Three nodes, one empty lease. Press to have all three try to acquire it at the same moment - genuinely concurrent requests, so whichever lands first at the store wins.",
      label: "Elect a leader",
      onClick: onElect,
    };
  }
  if (step === "isolate" && leader) {
    return {
      text: `Node ${L} is holding the lease. Cut it off from the store - nothing dies; its own next tick will simply refuse to reach the network.`,
      label: `Cut node ${L} off from the store`,
      onClick: () => onIsolate(leader),
    };
  }
  if (step === "wait-round") {
    return {
      text: `Node ${I} is cut off from the store. Press to have the other two try for the lease, and watch whether the countdown needs to finish first.`,
      label: "Run another round",
      onClick: onWaitRound,
    };
  }
  if (step === "heal" && isolatedNode) {
    return {
      text: `A new leader now holds a fresh lease and a higher fencing token. Reconnect node ${I} - it still privately believes it is the leader.`,
      label: `Reconnect node ${I} to the store`,
      onClick: () => onHeal(isolatedNode),
    };
  }
  if (step === "prove" && isolatedNode) {
    return {
      text: `Node ${I} is back online, still carrying the token it last knew about. Tick it and watch the store compare that token against the current one.`,
      label: `Tick node ${I}`,
      onClick: () => onProve(isolatedNode),
    };
  }
  return null;
}

export function GuidedPanel({
  step, leader, isolatedNode, busy, onElect, onIsolate, onWaitRound, onHeal, onProve,
}: {
  step: StepId;
  leader: NodeState | null;
  isolatedNode: NodeState | null;
  busy: boolean;
  onElect: () => void;
  onIsolate: (node: NodeState) => void;
  onWaitRound: () => void;
  onHeal: (node: NodeState) => void;
  onProve: (node: NodeState) => void;
}) {
  const cta = computeCta(step, leader, isolatedNode, onElect, onIsolate, onWaitRound, onHeal, onProve);

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {step === "done" ? "Guided sequence - complete" : "Guided sequence"}
      </p>
      <p className="mt-1.5 text-sm text-foreground/90">
        {cta
          ? cta.text
          : "Sequence complete. The log below shows exactly what the store accepted and what it fenced - keep ticking or isolating any node to explore further."}
      </p>
      {cta && (
        <Button className="mt-3" size="sm" disabled={busy} onClick={cta.onClick}>
          {cta.label}
        </Button>
      )}
    </div>
  );
}
