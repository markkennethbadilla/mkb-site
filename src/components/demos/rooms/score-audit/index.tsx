"use client";

import { useState } from "react";
import { useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { fetchJson } from "@/lib/demos/fetch-json";
import { roomBySlug } from "@/lib/demos/registry";
import { TelemetryStrip } from "@/components/demos/shell/telemetry";
import { GUIDE_CHAIN } from "@/lib/guide-models";
import { QUESTIONS, type Preset } from "@/lib/demos/score-audit-questions";
import { Gauges } from "./gauges";
import { QuestionRow, type QuestionResult } from "./question-row";

const room = roomBySlug("score-audit")!;

type RunResponse = {
  preset: Preset;
  canQuery: boolean;
  model: string;
  ms: number;
  totalQuestions: number;
  sampleSize: number;
  correctCount: number;
  meanConfidence: number;
  accuracyPct: number;
  calibrationGap: number;
  results: QuestionResult[];
  inputTokens: number | null;
  outputTokens: number | null;
};

type Status = "idle" | "running" | "done" | "error";

// The shell already prints room.promise above this component (RoomShell's <h1>/<p>).
// Repeating it here would be the same sentence twice on one screen, so this room's
// own big line is a distinct hook pointed at the mechanism, not a restatement.
const HOOK_LINE = "How sure did it sound - and was it right?";

/**
 * The control names what it takes away, not a difficulty. "Hard" would imply the
 * questions changed; they do not. The only variable is whether the model may look.
 */
const PRESETS: { id: Preset; label: string; note: string }[] = [
  { id: "grounded", label: "With the database", note: "the model may run its own queries first" },
  { id: "from-memory", label: "From memory", note: "same six questions, query tool withheld" },
];

/**
 * Says what the measured gap MEANS, from the measured gap.
 *
 * Without this a small gap reads as a broken demo. It is the opposite: a model
 * that says it is 2 percent sure and then gets none of them right has told you
 * the truth about itself, and that is the good outcome. The interesting number
 * was never the accuracy, it is the distance between the two - and the only
 * reason anyone can see that distance is that something other than the model
 * checked. Written as a function of the real numbers so it cannot say something
 * the run did not show.
 */
function readGap(gap: number, meanConfidence: number, correct: number, sample: number): string {
  if (gap > 15) {
    return `It was ${Math.round(gap)} points more confident than it was right. That is the failure this room is looking for, and it is why a stated confidence is not a check.`;
  }
  if (gap < -15) {
    return `It was ${Math.round(-gap)} points less confident than it needed to be - right more often than it claimed it would be.`;
  }
  if (meanConfidence < 25 && correct < sample / 2) {
    return "It said it did not know, and it did not know. That is a well-calibrated answer, and you can only tell it apart from a confident wrong one by checking.";
  }
  return "Stated confidence tracked the result on this run. That is the good outcome, not a missing one - and the only way to know it happened is that something other than the model did the checking.";
}

export default function Room() {
  const [preset, setPreset] = useState<Preset>("grounded");
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<RunResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const reduced = Boolean(useReducedMotion());

  async function run() {
    setStatus("running");
    setErrorMsg(null);
    try {
      setData(await fetchJson<RunResponse>("/api/demos/score-audit/run", {
        method: "POST",
        body: JSON.stringify({ preset }),
      }));
      setStatus("done");
    } catch (e) {
      // Whatever the Worker said, verbatim. It names the refusal; this does not
      // improve on it.
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-pretty sm:text-3xl">{HOOK_LINE}</h2>

        <div className="flex flex-wrap items-center gap-3">
          {/* A radio group, not two buttons. Arrow-key navigation and the "this one
              is selected" announcement both come free from the native control. The
              pair of <button>s this replaces reported no selected state at all, so a
              screen reader named two identically shaped controls with no way to tell
              which run was about to fire. Disabling the fieldset disables both
              inputs, so a run in flight cannot have its preset changed underneath
              it. */}
          <fieldset disabled={status === "running"} className="min-w-0">
            <legend className="sr-only">What the model may use</legend>
            <div className="inline-flex rounded-lg border border-border p-0.5">
              {PRESETS.map((p) => (
                <label
                  key={p.id}
                  className="cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground has-[:checked]:bg-foreground has-[:checked]:text-background has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
                >
                  <input
                    type="radio"
                    name="score-audit-preset"
                    value={p.id}
                    checked={preset === p.id}
                    onChange={() => setPreset(p.id)}
                    className="sr-only"
                  />
                  {p.label}
                  {/* The note used to hang off a title attribute, which a touch
                      visitor never sees and a keyboard one cannot count on. Here it
                      is part of the control's own name. */}
                  <span className="sr-only"> - {p.note}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <Button onClick={run} disabled={status === "running"}>
            {status === "running" ? "Auditing..." : room.startLabel}
          </Button>
        </div>

        {/* aria-hidden because the selected radio already carries this sentence in
            its accessible name. This copy is for everyone who lost the tooltip. */}
        <p aria-hidden className="text-xs text-muted-foreground">
          {PRESETS.find((p) => p.id === preset)!.note}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* One region, in the DOM from the first render, whose text changes as the
            run moves through it. The live region this replaces was mounted at the
            moment its content appeared and unmounted the moment the result landed,
            so assistive tech had nothing to observe the change against on the way in
            and no region left to announce the outcome on the way out. Visible while
            the run is in flight, screen-reader-only either side of that, which is
            exactly where the page already had something to look at. */}
        <p aria-live="polite" className={status === "running" ? "text-sm text-muted-foreground" : "sr-only"}>
          {status === "running"
            ? `Asking ${GUIDE_CHAIN[0]} all ${QUESTIONS.length} questions${
                preset === "grounded" ? " with the query tool in reach" : " with no way to look them up"
              }, then checking every answer against D1...`
            : status === "done" && data
              ? `Audit complete. Stated confidence ${data.meanConfidence}%, measured accuracy ${data.accuracyPct}%, a calibration gap of ${data.calibrationGap} points.`
              : ""}
        </p>

        {/* The refusal is an alert rather than part of the polite region above, so
            it is not announced twice and does not wait its turn. */}
        {status === "error" && errorMsg && (
          <div role="alert" className="rounded-xl border border-destructive/50 bg-destructive/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-destructive">Refused</p>
            <p className="pt-1 text-sm leading-relaxed text-foreground">{errorMsg}</p>
          </div>
        )}

        {status === "done" && data && (
          <>
            <Gauges
              meanConfidence={data.meanConfidence}
              accuracyPct={data.accuracyPct}
              calibrationGap={data.calibrationGap}
              sampleSize={data.sampleSize}
              totalQuestions={data.totalQuestions}
              reduced={reduced}
            />
            <p className="max-w-prose text-[13px] leading-relaxed text-foreground/85">
              {readGap(data.calibrationGap, data.meanConfidence, data.correctCount, data.sampleSize)}
            </p>
            <div className="flex flex-col gap-3">
              {data.results.map((r, i) => (
                <QuestionRow key={r.id} result={r} index={i} reduced={reduced} />
              ))}
            </div>
          </>
        )}
      </div>

      {status === "done" && data && (
        <TelemetryStrip
          items={[
            { label: "requests", value: `${room.requestsPerRun} of the demo pool` },
            { label: "ms", value: String(data.ms) },
            { label: "source", value: data.canQuery ? "live model with a query tool, verified against live D1" : "live model with no query tool, verified against live D1" },
            { label: "model", value: data.model },
            { label: "sample", value: `${data.sampleSize} of ${data.totalQuestions} questions` },
            {
              label: "tokens",
              value: data.inputTokens != null ? `${data.inputTokens} in / ${data.outputTokens} out` : "unavailable",
            },
          ]}
        />
      )}
    </div>
  );
}
