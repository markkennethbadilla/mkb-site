"use client";

import { motion } from "motion/react";

export type QuestionResult = {
  id: string;
  prompt: string;
  sql: string;
  trueAnswer: number;
  statedAnswer: number | null;
  statedConfidence: number | null;
  correct: boolean | null;
};

/**
 * One question, fully resolved before it ever renders - the verifier already
 * ran server-side, in parallel with the model, before this component exists.
 * What is staggered here is the REVEAL, not the work: index * delay only
 * changes when a row fades in, never what number is on it.
 *
 * A wrong answer held at high confidence gets the loudest treatment on the
 * page - a tinted destructive card - because that pairing, not a plain miss, is
 * what this room exists to make visible.
 */
export function QuestionRow({
  result,
  index,
  reduced,
}: {
  result: QuestionResult;
  index: number;
  reduced: boolean;
}) {
  const { prompt, sql, trueAnswer, statedAnswer, statedConfidence, correct } = result;
  const loud = correct === false && (statedConfidence ?? 0) >= 70;
  const unanswered = statedAnswer === null;

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.6, delay: reduced ? 0 : index * 0.13, ease: "linear" }}
      className={
        "flex flex-col gap-3 rounded-xl border p-4 " +
        (loud ? "border-destructive/60 bg-destructive/5" : "border-border")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm leading-relaxed">{prompt}</p>
        <Verdict correct={correct} loud={loud} />
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
        <Stat label="Stated answer" value={unanswered ? "no answer" : String(statedAnswer)} />
        <Stat label="Confidence" value={unanswered ? "-" : `${statedConfidence}%`} loud={loud} />
        <Stat label="True answer" value={String(trueAnswer)} />
      </div>

      <pre className="overflow-x-auto rounded-lg bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">{sql}</pre>
    </motion.div>
  );
}

function Stat({ label, value, loud }: { label: string; value: string; loud?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={"font-mono tabular-nums " + (loud ? "font-semibold text-destructive" : "")}>{value}</span>
    </div>
  );
}

function Verdict({ correct, loud }: { correct: boolean | null; loud: boolean }) {
  if (correct === null) {
    return (
      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
        UNANSWERED
      </span>
    );
  }
  return (
    <span
      className={
        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide " +
        (correct
          ? "bg-foreground/10 text-foreground"
          : loud
            ? "bg-destructive/15 text-destructive"
            : "bg-muted text-muted-foreground")
      }
    >
      {correct ? "CORRECT" : "WRONG"}
    </span>
  );
}
