"use client";

/**
 * What the run actually cost, in the same slot in every room.
 *
 * Same idiom as the guide's RunMeta and for the same reason: one line of small
 * monospace that a recruiter skips without effort and an engineer does not have to
 * hunt for. A "show the work" toggle hides the evidence behind an interaction most
 * people never perform, which defeats having evidence.
 *
 * Every value here must be MEASURED. A room that reports a request count it assumed
 * rather than counted is reporting a number with the authority of a measurement and
 * the reliability of a comment, which is worse than reporting nothing.
 */
export type TelemetryItem = { label: string; value: string };

export function TelemetryStrip({ items }: { items: TelemetryItem[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] leading-relaxed text-muted-foreground/75">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-x-3">
          {i > 0 ? <span aria-hidden className="text-muted-foreground/40">·</span> : null}
          <span>
            <span className="text-muted-foreground/55">{item.label}</span> {item.value}
          </span>
        </span>
      ))}
    </div>
  );
}

export default TelemetryStrip;
