"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { dollars } from "./money";
import type { LedgerRow } from "./types";

const LAND = { type: "spring" as const, stiffness: 400, damping: 30 };

function Outcome({ row }: { row: LedgerRow }) {
  if (row.status === "pending") return <span>in flight...</span>;
  if (row.accepted) return <span className="text-foreground">accepted</span>;
  const label =
    row.reason === "insufficient-funds"
      ? "refused - insufficient funds"
      : row.reason === "duplicate-idempotency-key"
        ? "refused - duplicate idempotency key"
        : row.detail
          ? `refused - ${row.detail}`
          : "refused";
  return <span className="text-destructive">{label}</span>;
}

export default function LedgerTable({ rows, amountCents }: { rows: LedgerRow[]; amountCents: number }) {
  const reduced = useReducedMotion();

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full font-mono text-xs tabular-nums">
        <thead>
          <tr className="border-b border-border/60 text-[10px] uppercase tracking-widest text-muted-foreground">
            <th className="px-2 py-1.5 text-left font-medium">attempt</th>
            <th className="px-2 py-1.5 text-right font-medium">amount</th>
            <th className="px-2 py-1.5 text-left font-medium">outcome</th>
            <th className="px-2 py-1.5 text-right font-medium">write_seq</th>
            <th className="px-2 py-1.5 text-right font-medium">ms</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <motion.tr
              key={row.index}
              initial={
                row.status === "pending" ? false : reduced ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.98 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={reduced ? { duration: 0 } : LAND}
              className={cn(
                "border-b border-border/40 last:border-0",
                row.status === "pending" && "text-muted-foreground/50"
              )}
            >
              <td className="px-2 py-1.5">{String(row.index).padStart(2, "0")}</td>
              <td className="px-2 py-1.5 text-right">{row.status === "landed" ? dollars(amountCents) : "-"}</td>
              <td className="px-2 py-1.5">
                <Outcome row={row} />
              </td>
              <td className="px-2 py-1.5 text-right">{row.writeSeq ?? "-"}</td>
              <td className="px-2 py-1.5 text-right">{row.ms ?? "-"}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
