"use client";

import { roomBySlug } from "@/lib/demos/registry";
import { TelemetryStrip } from "@/components/demos/shell/telemetry";
import { Button } from "@/components/ui/button";
import { useSplitBrain } from "./use-split-brain";
import { Stage } from "./stage";
import { EventLog, WorkLog } from "./event-log";
import { GuidedPanel } from "./guided-panel";

const room = roomBySlug("split-brain")!;

export default function Room() {
  const { state, step, leader, isolatedNode, actions } = useSplitBrain();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-3">
        {!state.runId && (
          <Button size="lg" disabled={state.busy} onClick={actions.doStart}>
            {room.startLabel}
          </Button>
        )}
        {state.runId && (
          <Button size="sm" variant="ghost" disabled={state.busy} onClick={actions.doStart}>
            Start a new cluster
          </Button>
        )}
      </div>

      {state.error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {state.runId && (
        <div className="flex flex-col gap-6">
          <GuidedPanel
            step={step}
            leader={leader}
            isolatedNode={isolatedNode}
            busy={state.busy}
            onElect={actions.doRound}
            onIsolate={(n) => actions.doPartition(n.node, true)}
            onWaitRound={actions.doRound}
            onHeal={(n) => actions.doPartition(n.node, false)}
            onProve={(n) => actions.doTickOne(n.node)}
          />

          <Stage
            nodes={state.nodes}
            lease={state.lease}
            leaseMs={state.leaseMs}
            busy={state.busy}
            onTick={actions.doTickOne}
            onPartition={actions.doPartition}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <h2 className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Event log</h2>
              <EventLog events={state.events} />
            </div>
            <div>
              <h2 className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Work log</h2>
              <WorkLog work={state.work} />
            </div>
          </div>

          <TelemetryStrip
            items={[
              { label: "requests", value: `${state.requestCount} of the demo pool` },
              { label: "ms", value: String(state.lastMs) },
              { label: "source", value: "live D1" },
              { label: "token", value: String(state.lease?.token ?? 0) },
              { label: "events", value: String(state.events.length) },
            ]}
          />
        </div>
      )}
    </div>
  );
}
