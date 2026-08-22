"use client";

/**
 * The hero: the operating account's balance at every write_seq it actually
 * reached, taken from each transfer's own RETURNING clause - never recomputed,
 * never smoothed. A refused attempt never appears here because it never wrote.
 */

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { dollars } from "./money";
import type { LedgerRow } from "./types";

const WIDTH = 640;
const HEIGHT = 180;
const PAD = { top: 16, right: 16, bottom: 22, left: 4 };

type Point = { writeSeq: number; balanceCents: number; index: number };

/** What one point says, in the readout and to a screen reader, from one place. */
function describe(p: Point): string {
  // Comma separated rather than dash separated, because a screen reader reads a
  // dash aloud as "dash" and this string is the only place a keyboard user gets
  // the balance after each write.
  return p.index === -1
    ? `start, ${dollars(p.balanceCents)}`
    : `attempt ${p.index}, write ${p.writeSeq}, ${dollars(p.balanceCents)}`;
}

export default function BalanceChart({
  rows,
  operatingStartCents,
}: {
  rows: LedgerRow[];
  operatingStartCents: number;
}) {
  const reduced = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);

  const points = useMemo<Point[]>(() => {
    const landed = rows
      .filter((r) => r.status === "landed" && r.accepted && r.writeSeq !== undefined && r.balanceCents !== undefined)
      .map((r) => ({ writeSeq: r.writeSeq!, balanceCents: r.balanceCents!, index: r.index }))
      .sort((a, b) => a.writeSeq - b.writeSeq);
    return [{ writeSeq: 0, balanceCents: operatingStartCents, index: -1 }, ...landed];
  }, [rows, operatingStartCents]);

  const maxSeq = Math.max(1, ...points.map((p) => p.writeSeq));
  const maxBal = Math.max(operatingStartCents, ...points.map((p) => p.balanceCents));
  const minBal = Math.min(0, ...points.map((p) => p.balanceCents));
  const spanBal = Math.max(1, maxBal - minBal);

  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (seq: number) => PAD.left + (seq / maxSeq) * plotW;
  const y = (cents: number) => PAD.top + plotH - ((cents - minBal) / spanBal) * plotH;

  const path = points.map((p) => `${x(p.writeSeq)},${y(p.balanceCents)}`).join(" ");
  const hovered = points.find((p) => p.index === hover) ?? null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        operating.balance_cents over write_seq - the RETURNING value from each write
      </span>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full text-foreground"
        role="img"
        aria-label={`Operating account balance across ${points.length - 1} landed writes, from ${dollars(operatingStartCents)}`}
      >
        {minBal < 0 && (
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={y(0)}
            y2={y(0)}
            stroke="var(--destructive)"
            strokeOpacity={0.4}
            strokeDasharray="3 3"
          />
        )}
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={HEIGHT - PAD.bottom}
          y2={HEIGHT - PAD.bottom}
          stroke="var(--border)"
          strokeWidth={1}
        />
        <polyline points={path} fill="none" stroke="oklch(0.62 0.15 var(--tint-hue))" strokeWidth={2} strokeLinejoin="round" />
        {points.map((p) => (
          /* Focusable, because balance_cents after each write appears nowhere else
             on the page - LedgerTable carries write_seq and the outcome but not the
             balance - so without a tab stop the whole trajectory is mouse-only.
             Focus sets the same hover state the pointer does, and the readout below
             is a live region, so the point announces itself on arrival. */
          <motion.circle
            key={p.index}
            cx={x(p.writeSeq)}
            cy={y(p.balanceCents)}
            r={hover === p.index ? 5 : 3.5}
            fill={p.index === -1 ? "var(--muted-foreground)" : "oklch(0.62 0.15 var(--tint-hue))"}
            // The active point is marked on the stroke rather than with a CSS
            // outline. An outline on an SVG shape is inconsistent across browsers,
            // and a ring utility is a box-shadow, which SVG shapes do not paint at
            // all. This is the focus indicator as well as the hover one, since both
            // set the same state.
            stroke={hover === p.index ? "var(--ring)" : "var(--background)"}
            strokeWidth={hover === p.index ? 3 : 1.5}
            initial={reduced || p.index === -1 ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            tabIndex={0}
            role="img"
            aria-label={describe(p)}
            onMouseEnter={() => setHover(p.index)}
            onMouseLeave={() => setHover((h) => (h === p.index ? null : h))}
            onFocus={() => setHover(p.index)}
            onBlur={() => setHover((h) => (h === p.index ? null : h))}
            className="cursor-pointer"
          />
        ))}
        <text x={PAD.left} y={HEIGHT - 6} fontSize={9} className="fill-muted-foreground">
          seq 0
        </text>
        <text x={WIDTH - PAD.right} y={HEIGHT - 6} textAnchor="end" fontSize={9} className="fill-muted-foreground">
          seq {maxSeq}
        </text>
      </svg>
      <div aria-live="polite" className="h-5 font-mono text-[10px] text-muted-foreground">
        {hovered ? describe(hovered) : `${points.length - 1} of ${rows.length} attempts wrote a new balance`}
      </div>
    </div>
  );
}
