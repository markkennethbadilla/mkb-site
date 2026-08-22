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
 *
 * A REAL TABLE, because that is what this already was. Three rows, and every row
 * is the same pair - the claim, then the qualifier on it. Rendered as a dl with
 * both halves inside one dd it was still one text block per row, and a bolder
 * first sentence is a hint rather than a structure. Two cells make the pairing
 * something a parser can see and something the eye can read down a column.
 *
 * The display swap below sm strips the implicit table roles in Chrome and Safari,
 * which is why every part carries an explicit role. Three columns of 13px text do
 * not fit a phone, and the one block the site cannot afford to have skipped is not
 * the block to make people scroll sideways for.
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

// No aria-label on the wrapper any more. The table's caption names this block now,
// and two elements announcing the same name is one of them read twice.
export default function ScopeNote({ room }: { room: DemoRoom }) {
  return (
    <section className="rounded-lg border border-border bg-card/60 px-4 py-3 sm:px-5 sm:py-4">
      <table role="table" className="block w-full border-collapse sm:table">
        <caption className="sr-only">What this demo is and is not</caption>
        <tbody role="rowgroup" className="block sm:table-row-group">
          {ROWS.map((row) => {
            const [lead, rest] = split(room.scope[row.key]);
            return (
              <tr
                role="row"
                key={row.key}
                className="block pb-2.5 last:pb-0 sm:table-row sm:pb-0"
              >
                <th
                  role="rowheader"
                  scope="row"
                  className="block text-left align-top font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-muted-foreground sm:table-cell sm:w-[10.5rem] sm:pb-3 sm:pr-6 sm:pt-[3px]"
                >
                  {row.label}
                </th>
                <td
                  role="cell"
                  className="block align-top text-[13px] font-medium leading-relaxed text-foreground sm:table-cell sm:pb-3 sm:pr-6"
                >
                  {lead}
                </td>
                <td
                  role="cell"
                  className="block align-top text-[13px] leading-relaxed text-muted-foreground sm:table-cell sm:pb-3"
                >
                  {rest}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
