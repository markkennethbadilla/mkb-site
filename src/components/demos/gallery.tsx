import BlurFade from "@/components/magicui/blur-fade";
import RoomCard from "@/components/demos/room-card";
import { OPEN_ROOMS } from "@/lib/demos/registry";
import { DATA } from "@/data/resume";
import { Icons } from "@/components/icons";

const BLUR_FADE_DELAY = 0.04;

/**
 * The entrance to the exhibition, used both at /#projects and at /demos.
 *
 * Four things, three shapes, and the difference in shape is doing real work: three
 * of these are exhibits you OPERATE and one is a repository you READ. Rendering
 * them as identical cards in a uniform grid says they are the same kind of object,
 * which is the thing the previous version of this section got wrong - along with
 * having a single entry in a two-column grid, so it drew one card and one hole.
 *
 * Ledger is featured because it is the only one a non-technical reader understands
 * in one sentence with no preamble: several payments hit one account at the same
 * moment and the books stayed balanced. Split-Brain is the most impressive to a
 * senior engineer and the hardest to explain cold; ScoreAudit needs you to already
 * care about model confidence. Which room is featured is one boolean in the registry.
 */
export default function Gallery() {
  const featured = OPEN_ROOMS.find((r) => r.featured);
  const rest = OPEN_ROOMS.filter((r) => r !== featured);
  const repos = DATA.projects;

  return (
    // No width cap of its own. The gallery renders inside two different measures -
    // the home page's max-w-4xl and the wider /demos - and capping it here put the
    // cards on a different left edge from the heading above them on the wider one.
    <div className="w-full space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {featured ? (
          <BlurFade delay={BLUR_FADE_DELAY * 12} className="sm:col-span-2">
            <RoomCard room={featured} featured />
          </BlurFade>
        ) : null}
        {rest.map((room, i) => (
          <BlurFade key={room.slug} delay={BLUR_FADE_DELAY * 12 + (i + 1) * 0.05} className="h-full">
            <RoomCard room={room} />
          </BlurFade>
        ))}
      </div>

      {/* Visually a different object on purpose: no hue accent, no run affordance,
          an outward arrow rather than an inward one. You leave the site to read it. */}
      {repos.map((project, i) => (
        <BlurFade key={project.title} delay={BLUR_FADE_DELAY * 12 + (rest.length + i + 1) * 0.05}>
          <a
            href={project.href}
            target="_blank"
            rel="noreferrer noopener"
            className="group flex flex-col gap-1.5 rounded-xl border border-border bg-card/50 px-5 py-4 transition-colors hover:border-foreground/25 hover:bg-card"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Source
              </span>
              <span className="font-mono text-[13px] font-medium">{project.title}</span>
              <Icons.github className="ml-auto size-3.5 text-muted-foreground transition-colors group-hover:text-foreground" />
            </div>
            {/* Element 0 is the claim, the rest are the mechanisms under it.
                They arrived as one sentence with five clauses hanging off it,
                which nobody reads to the end of; four of the five are under
                fifty characters, so they pair up two to a row and stack on a
                phone. The split is authored in the data, not guessed here. */}
            <p className="text-[13px] leading-relaxed text-muted-foreground">{project.description[0]}</p>
            <ul className="grid gap-x-4 gap-y-0.5 text-[13px] leading-relaxed text-muted-foreground/80 sm:grid-cols-2">
              {project.description.slice(1).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </a>
        </BlurFade>
      ))}
    </div>
  );
}
