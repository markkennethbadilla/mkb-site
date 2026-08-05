import BlurFade from "@/components/magicui/blur-fade";
import { DATA } from "@/data/resume";

/**
 * The skills section: one system, not two stacked on top of each other.
 *
 * WHAT WAS WRONG (Mark, 2026-08-05: "ugly"). The section rendered a row of seven
 * pills with logos, and then underneath it a second block of category labels
 * followed by long comma-separated runs of text. Three separate problems, all
 * caused by that being two designs rather than one:
 *
 *   - It DUPLICATED itself. React, Next.js, TypeScript, Python, Postgres, Node.js
 *     and Docker each appeared twice, once as a pill and once inside a sentence,
 *     which reads as a bug rather than as emphasis.
 *   - The second half read as a TABLE. A fixed-width label column beside a wall of
 *     comma-separated values is a spreadsheet, and a spreadsheet is what you build
 *     when you have given up on hierarchy.
 *   - The two halves disagreed about what a skill LOOKS like, so the eye had to
 *     learn the page twice.
 *
 * THE FIX is to let the categories own everything, and let the logos live on the
 * pills they belong to. Seven of these forty-odd items happen to have a mark worth
 * showing; those pills carry it, and the rest do not. That is not an inconsistency,
 * it is the natural texture of a real stack - a handful of instantly recognisable
 * names and a long tail of things you have to read. Uniform pills across forty
 * items would be a wall of identical rectangles; the logos break that rhythm
 * exactly where a reader's eye already wants an anchor.
 *
 * The category label is small, monospaced and quiet, and it sits ABOVE its pills
 * rather than beside them. Beside them is the table again. Above them it reads as a
 * heading, wraps without stranding anything, and costs one line.
 */

/**
 * Which items have a logo. Built from DATA.skills, which used to be the whole
 * section and is now just the icon registry - so adding a logo is still one entry
 * in one place, and an item without one degrades to a plain pill rather than a gap.
 *
 * Normalised because the two lists spell things differently on purpose: the icon
 * row says "Postgres" because that is what fits under a logo, the stack says
 * "PostgreSQL" because that is what a keyword matcher looks for.
 */
const normalise = (name: string) => name.toLowerCase().replace(/[\s.]/g, "");

/** One spelling difference, so it is one entry rather than a lookup layer. */
const ALIASES: Record<string, string> = { postgresql: "postgres" };

const ICONS = new Map(DATA.skills.map((s) => [normalise(s.name), s.icon] as const));

const iconFor = (name: string) => {
  const key = normalise(name);
  return ICONS.get(key) ?? ICONS.get(ALIASES[key] ?? "");
};

export default function SkillGroups({ delayStart = 0 }: { delayStart?: number }) {
  return (
    <div className="flex flex-col gap-y-5">
      {DATA.resumeSkills.map((group, gi) => (
        <BlurFade key={group.group} delay={delayStart + gi * 0.05}>
          <div className="flex flex-col gap-y-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {group.group}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {group.items.map((item) => {
                const Icon = iconFor(item);
                return (
                  <span
                    key={item}
                    className="flex h-8 w-fit items-center gap-2 rounded-xl border border-border bg-background px-3.5 ring-2 ring-border/20"
                  >
                    {Icon ? (
                      <Icon className="size-4 overflow-hidden rounded object-contain" />
                    ) : null}
                    <span className="text-[13px] font-medium text-foreground">{item}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </BlurFade>
      ))}
    </div>
  );
}
