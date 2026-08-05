import BlurFade from "@/components/magicui/blur-fade";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DATA } from "@/data/resume";
import { SKILL_ICONS } from "@/lib/skill-icons";

/**
 * The skills section: categorised pills, every one of them a real link.
 *
 * WHAT A BARE LIST GETS WRONG. Forty names in a row assumes the reader already
 * knows all forty, and nobody does. A recruiter does not know what Drizzle or
 * Caddy or Kokoro is; a specialist in half this list does not know the other half.
 * Either way the section becomes decoration - a wall of words that proves nothing,
 * because it cannot be understood and cannot be checked.
 *
 * So each pill carries its logo, links to the technology's own site, and explains
 * itself in one line on hover or focus. Three readers served by one component: the
 * one who recognises the mark and skims, the one who does not and reads the line,
 * and the one who does not believe it and follows the link.
 *
 * WHY THE LOGOS ARE MONOCHROME. simple-icons ships each mark with its brand
 * colour, and using them would import thirty-seven unrelated brand palettes into a
 * page whose whole design derives every colour from one hue. They render in
 * currentColor instead, so the section reads as one object rather than a sticker
 * album - and the marks still do their real job, which is shape recognition, and
 * shape survives losing the colour.
 *
 * WHY SOME PILLS HAVE NO LOGO. "REST APIs", "RAG" and "Model cascades" are
 * techniques rather than products. Handing a concept some vendor's logo would be a
 * small lie about what it is, so they get a neutral glyph instead.
 */

/** The neutral mark, for techniques and for anything with no brand of its own. */
function GenericGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
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
                // `icon` is optional, and the data is `as const`, so the entries
                // without one genuinely do not have the property rather than having
                // it set to undefined. An `in` check is what narrows that safely.
                const slug = "icon" in item ? item.icon : undefined;
                return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={[
                        "group flex h-8 w-fit items-center gap-2 rounded-xl border border-border",
                        "bg-background px-3.5 ring-2 ring-border/20 transition-colors",
                        "hover:border-foreground/25 hover:bg-accent",
                      ].join(" ")}
                    >
                      <SkillIcon
                        slug={slug}
                        className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                      />
                      <span className="text-[13px] font-medium text-foreground">{item.name}</span>
                    </a>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={6}
                    className="max-w-[17rem] rounded-xl bg-primary px-3 py-2 text-[12px] leading-relaxed text-primary-foreground shadow-lg"
                  >
                    {item.blurb}
                    <TooltipArrow className="fill-primary" />
                  </TooltipContent>
                </Tooltip>
                );
              })}
            </div>
          </div>
        </BlurFade>
      ))}
    </div>
  );
}
