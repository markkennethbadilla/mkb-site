"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";

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
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:p-5">
      <Bar label="Stated confidence" target={meanConfidence} variant="claim" delay={0} reduced={reduced} />
      <Bar
        label={`Actual accuracy (${sampleSize} of ${totalQuestions} questions)`}
        target={accuracyPct}
        variant="measured"
        delay={0.15}
        reduced={reduced}
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

/**
 * A linear settle, not a spring. This room's motion character is "measured" - a
 * gauge easing to its final reading over a fixed span, never overshooting and never
 * bouncing - which is `ease: "linear"`, the same transition question-row.tsx uses a
 * file away.
 *
 * ONE motion value drives both the width and the number, so the bar and the reading
 * beside it cannot disagree at any frame. Reduced motion sets the value rather than
 * skipping the element, because SPEC.md's rule is to gate the animation and never
 * the tree - branching the tree on a media query makes server and client markup
 * disagree.
 */
function Bar({
  label,
  target,
  variant,
  delay,
  reduced,
}: {
  label: string;
  target: number;
  variant: "claim" | "measured";
  delay: number;
  reduced: boolean;
}) {
  const value = useMotionValue(reduced ? target : 0);
  const width = useTransform(value, (v) => `${Math.min(100, Math.max(0, v))}%`);
  const readout = useTransform(value, (v) => `${v.toFixed(1)}%`);

  useEffect(() => {
    if (reduced) {
      value.set(target);
      return;
    }
    const controls = animate(value, target, { duration: 0.8, delay, ease: "linear" });
    return () => controls.stop();
  }, [value, target, delay, reduced]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <motion.span className="font-mono tabular-nums">{readout}</motion.span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className={"h-full rounded-full " + (variant === "measured" ? "bg-foreground" : "bg-muted-foreground")}
          style={{ width }}
        />
      </div>
    </div>
  );
}
