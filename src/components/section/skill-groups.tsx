import { DATA } from "@/data/resume";
import { SKILL_ICONS } from "@/lib/skill-icons";

/**
 * The skills section, rebuilt 2026-10-24 so a recruiter scans it in seconds.
 *
 * Eight core skills lead, large, each with its logo and a one-line "what it is"
 * printed under the name (no hover-only text, a phone has no hover). The rest of
 * the stack sits under one native <details> as compact comma lists per group, so
 * the section is short on a phone instead of 1,500px of pills, and nothing is lost.
 *
 * WHY THE LOGOS ARE MONOCHROME. simple-icons marks render in currentColor so the
 * section takes the page's one hue rather than thirty brand palettes. Techniques
 * ("RAG", "REST APIs") get a neutral glyph instead of some vendor's logo.
 */

/** The neutral mark, for techniques and for anything with no brand of its own. */
function GenericGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.2" strokeOpacity="0.45" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SkillIcon({ slug, className }: { slug?: string; className?: string }) {
  const icon = slug ? SKILL_ICONS[slug] : undefined;
  if (!icon) return <GenericGlyph className={className} />;
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="currentColor">
      <path d={icon.path} />
    </svg>
  );
}

// Names must match DATA.resumeSkills exactly; a typo silently drops one.
const CORE = ["TypeScript", "Next.js", "Node.js", "PostgreSQL", "Python", "Claude Code", "MCP", "Cloudflare Workers"];

type Item = { name: string; url: string; blurb: string; icon?: string };

export default function SkillGroups() {
  const all = DATA.resumeSkills.flatMap((g) => g.items as readonly Item[]);
  const core = CORE.map((n) => all.find((i) => i.name === n)).filter((i): i is Item => Boolean(i));
  return (
    <div className="flex flex-col gap-8">
      <ul className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        {core.map((item) => (
          <li key={item.name}>
            <a href={item.url} target="_blank" rel="noreferrer noopener" className="group flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[oklch(0.6_0.12_var(--tint-hue)/0.12)]">
                <SkillIcon slug={item.icon} className="size-5" />
              </span>
              <span>
                <span className="block text-lg font-semibold tracking-tight group-hover:underline">{item.name}</span>
                <span className="block text-sm leading-snug text-muted-foreground">{item.blurb}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <details className="group/more border-t border-border pt-4">
        <summary className="cursor-pointer list-none font-mono text-xs text-muted-foreground hover:text-foreground">
          <span className="group-open/more:hidden">+ {all.length - core.length} more tools</span>
          <span className="hidden group-open/more:inline">- hide the full list</span>
        </summary>
        <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {DATA.resumeSkills.map((group) => (
            <div key={group.group}>
              <dt className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{group.group}</dt>
              <dd className="mt-1 text-sm leading-relaxed">
                {(group.items as readonly Item[])
                  .filter((i) => !CORE.includes(i.name))
                  .map((i) => i.name)
                  .join(", ")}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
