"use client";

import type { AgentRun } from "@/components/demo/agent-run.mock";

/**
 * What actually happened, in small type under the answer.
 *
 * This site's argument is that a demo should show its own workings, and until now
 * the guide showed none - a visitor had no way to tell a live model call from a
 * cached string from a canned fallback. That is exactly the ambiguity the rest of
 * the page refuses to leave open.
 *
 * Deliberately NOT behind a toggle. It is one line of small monospace: a recruiter
 * skips over it without effort, and an engineer does not have to go hunting for
 * proof that anything ran. A "show the work" button would hide the evidence behind
 * an interaction most people never perform, which defeats the point of having it.
 *
 * Every field is reported only when it means something. A cached answer has no
 * model and nothing to have been grounded against, so it claims neither.
 */
export default function RunMeta({ run }: { run: AgentRun }) {
  const bits: string[] = [];

  if (run.degraded) bits.push(`unavailable: ${run.degraded}`);
  else if (run.cached) bits.push("served from cache, no model call");
  else if (run.model) bits.push(run.model);

  if (run.ms) bits.push(`${(run.ms / 1000).toFixed(1)}s`);
  if (!run.cached && !run.degraded && run.grounded) bits.push("checked against the fact list");
  if (run.steps?.length) bits.push(run.steps.map((s) => s.tool).join(" then "));

  if (!bits.length) return null;
  return (
    <span className="font-mono text-[10px] leading-relaxed text-muted-foreground/70">
      {bits.join("  ·  ")}
    </span>
  );
}
