"use client";

import { cn } from "@/lib/utils";

/**
 * The numbers people who actually run LLMs in production ask for first: which
 * model answered, how far down the fallback chain it got, how long it took, what
 * it cost, and how many tokens moved. Shown per attempt rather than aggregated,
 * because an average hides exactly the request that went wrong.
 */

export type AgentStats = {
  latencyMs?: number;
  totalElapsedMs?: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  finishReason?: string;
  modelsTried?: number;
  freeModelsAvailable?: number;
  costUsd?: number;
  schemaEnforced?: string;
};

function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good";
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 min-w-[104px]">
      <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono text-sm tabular-nums",
          tone === "good" && "text-emerald-500"
        )}
      >
        {value}
      </span>
      {hint && <span className="text-[9px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

export default function StatsBar({
  stats,
  model,
  cascade,
}: {
  stats?: AgentStats;
  model?: string | null;
  cascade?: { model: string; ok: boolean; ms: number; error?: string }[];
}) {
  if (!stats) return null;
  const fmt = (n?: number | null) => (n === null || n === undefined ? "-" : n.toLocaleString());

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Stat
          label="Latency"
          value={stats.latencyMs !== undefined ? `${stats.latencyMs} ms` : "-"}
          hint={
            stats.totalElapsedMs !== undefined && stats.totalElapsedMs !== stats.latencyMs
              ? `${stats.totalElapsedMs} ms incl. failed`
              : undefined
          }
        />
        <Stat label="Tokens in" value={fmt(stats.inputTokens)} />
        <Stat label="Tokens out" value={fmt(stats.outputTokens)} />
        <Stat label="Total tokens" value={fmt(stats.totalTokens)} />
        <Stat
          label="Cost"
          value={stats.costUsd === 0 ? "$0.0000" : `$${(stats.costUsd ?? 0).toFixed(4)}`}
          hint="free-tier model"
          tone="good"
        />
        <Stat
          label="Fallbacks"
          value={
            stats.modelsTried !== undefined
              ? `${stats.modelsTried}/${(stats.freeModelsAvailable ?? 0) + 1}`
              : "-"
          }
          hint="models tried"
        />
        <Stat label="Finish" value={stats.finishReason ?? "-"} />
        <Stat label="Schema" value="enforced" hint={stats.schemaEnforced} tone="good" />
      </div>

      {cascade && cascade.length > 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/10 p-2.5">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
            Provider cascade
          </span>
          <div className="mt-1.5 flex flex-col gap-1">
            {cascade.map((c, i) => (
              <div key={i} className="flex items-center gap-2 font-mono text-[10px]">
                <span
                  className={cn(
                    "rounded px-1 py-0.5 font-semibold",
                    c.ok ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-400"
                  )}
                >
                  {c.ok ? "OK " : "FAIL"}
                </span>
                <span className="text-muted-foreground truncate">{c.model}</span>
                <span className="ml-auto tabular-nums text-muted-foreground">{c.ms} ms</span>
              </div>
            ))}
          </div>
          {model && (
            <p className="pt-1.5 text-[10px] text-muted-foreground">
              Served by <span className="font-mono text-foreground">{model}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
