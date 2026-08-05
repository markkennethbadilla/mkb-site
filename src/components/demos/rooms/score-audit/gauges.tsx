"use client";

import { useSettle } from "./use-settle";

/**
 * Two bars settling in parallel - stated confidence against measured accuracy -
 * plus the gap between them, which is this room's headline number. Both read
 * from the same finished response; nothing here recomputes or estimates
 * anything, the bars only pace how an already-true pair of numbers arrives on
 * screen. The accuracy bar settles slightly after the confidence bar so the
 * page reads "it claimed this, then it was checked", not two unrelated meters.
 */
export function Gauges({
  meanConfidence,
  accuracyPct,
  calibrationGap,
  sampleSize,
  totalQuestions,
  reduced,
}: {
  meanConfidence: number;
  accuracyPct: number;
  calibrationGap: number;
  sampleSize: number;
  totalQuestions: number;
  reduced: boolean;
}) {
  const confidence = useSettle(meanConfidence, 800, 0, reduced);
  const accuracy = useSettle(accuracyPct, 800, 150, reduced);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:p-5">
      <Bar label="Stated confidence" value={confidence} variant="claim" />
      <Bar
        label={`Actual accuracy (${sampleSize} of ${totalQuestions} questions)`}
        value={accuracy}
        variant="measured"
      />
      <div className="flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-xs text-muted-foreground">Calibration gap</span>
        <span
          className={
            "font-mono text-lg font-semibold tabular-nums " +
            (Math.abs(calibrationGap) >= 20 ? "text-destructive" : "text-foreground")
          }
        >
          {calibrationGap > 0 ? "+" : ""}
          {calibrationGap.toFixed(1)} pt{Math.abs(calibrationGap) === 1 ? "" : "s"}
        </span>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {calibrationGap > 0
          ? "Positive: it sounded more sure than it was right."
          : calibrationGap < 0
            ? "Negative: it undersold answers it actually had right."
            : "Stated confidence matched measured accuracy exactly."}{" "}
        Sample size is {sampleSize}, not a rate worth trusting past this run.
      </p>
    </div>
  );
}

function Bar({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "claim" | "measured";
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={"h-full rounded-full " + (variant === "measured" ? "bg-foreground" : "bg-muted-foreground")}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
