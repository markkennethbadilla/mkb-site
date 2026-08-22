"use client";

import { Button } from "@/components/ui/button";
import { NODE_LETTER, type NodeState } from "./types";
import type { StepId } from "./use-split-brain";

type Cta = { text: string; label: string; onClick: () => void };

/**
 * Three words this room turns on, defined once and left on screen.
 *
 * "Fencing token" used to appear for the first time in the fourth step of the
 * sequence, unglossed, as the sentence describing the climax - and again in the
 * telemetry strip as a bare integer. A senior engineer already knows it. A
 * recruiter reading a portfolio does not, and the room is unreadable without it.
 *
 * Persistent rather than a tooltip or a first-use aside, because the reader who
 * needs it needs it four steps later, when the CTA below is using all three terms
 * freely and there is nothing left to hover.
 */
const GLOSSARY = [
  ["Lease", "a timed claim on the job that expires unless its holder keeps renewing it"],
  ["Fencing token", "a counter that rises by one every time the lease changes hands"],
  ["Tick", "one node doing one round of work, which is when it renews or loses the lease"],
];

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
      text: "Three nodes, one lease, nobody holding it. Press to have all three try to claim it at the same moment. The requests are genuinely concurrent, so whichever one lands first at the store, the single database all three share, wins.",
      label: "Elect a leader",
      onClick: onElect,
    };
  }
  if (step === "isolate" && leader) {
    return {
      text: `Node ${L} holds the lease. Cut it off from the store. Nothing dies, and nothing is unplugged; its own next tick simply refuses to reach the network.`,
      label: `Cut node ${L} off from the store`,
      onClick: () => onIsolate(leader),
    };
  }
  if (step === "wait-round") {
    return {
      text: `Node ${I} is cut off, so it cannot renew. Press to have the other two try for the lease, and watch whether the countdown has to run out first.`,
      label: "Run another round",
      onClick: onWaitRound,
    };
  }
  if (step === "heal" && isolatedNode) {
    return {
      text: `A new leader now holds a fresh lease and a higher token. Reconnect node ${I}. It still thinks it is in charge, it still carries the old token, and the database is about to refuse its next write.`,
      label: `Reconnect node ${I} to the store`,
      onClick: () => onHeal(isolatedNode),
    };
  }
  if (step === "prove" && isolatedNode) {
    return {
      text: `Node ${I} is back online, still carrying the token it last knew about. Tick it and watch the store compare that number against the current one.`,
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
      <dl className="flex flex-col gap-1 border-b border-border pb-3 text-[11px] leading-relaxed text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5">
        {GLOSSARY.map(([term, gloss]) => (
          <div key={term} className="flex gap-1.5">
            <dt className="shrink-0 font-medium text-foreground/80">{term},</dt>
            <dd>{gloss}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[10px] uppercase tracking-widest text-muted-foreground">
        {step === "done" ? "Guided sequence, complete" : "Guided sequence"}
      </p>
      <p className="mt-1.5 text-sm text-foreground/90">
        {cta
          ? cta.text
          : "Sequence complete. The log below shows what the store accepted and what it refused for carrying a stale token. Keep ticking or isolating any node to explore further."}
      </p>
      {cta && (
        <Button className="mt-3" size="sm" disabled={busy} onClick={cta.onClick}>
          {cta.label}
        </Button>
      )}
    </div>
  );
}
