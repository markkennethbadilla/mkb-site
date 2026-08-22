import type { DemoRoom } from "@/lib/demos/registry";

/**
 * The wall label. The same object, in the same place, beside every exhibit.
 *
 * Three rooms with different skeletons, different colours and different motion
 * still read as one author because this appears identically in all three - the way
 * a museum hangs wildly different pieces above identical cards.
 *
 * It is never collapsed, never behind a toggle, never below the fold, and the
 * registry type makes all three strings required so a room cannot ship without one.
 *
 * The third line is the one that matters. Anyone can write what a demo proves.
 * Writing what it does NOT prove is the difference between a portfolio piece and a
 * claim, and two earlier versions of this site were deleted for skipping it.
 *
 * Plain clause first, number second, throughout - the recruiter reading this has no
 * idea what "production volume" or "a free-tier database" means, and the line is
 * unskippable by design, so it cannot afford to be the least readable thing on the
 * page for half the audience.
 *
 * It was exactly that for a while: three rows of unbroken 30-to-45-word prose at
 * 13px with nothing to catch the eye. Each value is now two sentences and the first
 * one is set at foreground weight, so a reader who takes only the bold half still
 * takes the whole claim. tests/demos.test.mjs caps every value at 32 words and
 * requires the second sentence, which is what keeps this split from silently
 * degrading back into one paragraph rendered slightly bolder at the front.
 */
const ROWS = [
  { key: "real" as const, label: "What is real" },
  { key: "staged" as const, label: "What is staged" },
  { key: "notProved" as const, label: "What this does not prove" },
];

/** First sentence, then the rest. The gate guarantees there is a rest. */
const split = (value: string): [string, string] => {
  const i = value.indexOf(". ");
  return i === -1 ? [value, ""] : [value.slice(0, i + 1), value.slice(i + 2)];
};

export default function ScopeNote({ room }: { room: DemoRoom }) {
  return (
    <section
      aria-label="What this demo is and is not"
      className="rounded-lg border border-border bg-card/60 px-4 py-3 sm:px-5 sm:py-4"
    >
      <dl className="grid gap-2.5 sm:grid-cols-[10.5rem_1fr] sm:gap-x-6 sm:gap-y-3">
        {ROWS.map((row) => {
          const [lead, rest] = split(room.scope[row.key]);
          return (
            <div key={row.key} className="contents">
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:pt-[3px]">
                {row.label}
              </dt>
              <dd className="text-[13px] leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">{lead}</span>
                {rest ? ` ${rest}` : null}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
