import RoomCard from "@/components/demos/room-card";
import RoomSpecimen from "@/components/demos/room-specimen";
import { OPEN_ROOMS } from "@/lib/demos/registry";
import { DATA } from "@/data/resume";
import { Icons } from "@/components/icons";

const INK = "light-dark(oklch(0.5 0.15 var(--tint-hue)), oklch(0.78 0.13 var(--tint-hue)))";

/**
 * The entrance to the exhibition, at /#projects.
 *
 * Three exhibits you OPERATE and one repository you READ. Ledger is featured
 * because a non-technical reader understands it in one sentence; which room is
 * featured is one boolean in the registry.
 *
 * The repository (2026-10-24 overhaul) is the same editorial block as the rooms,
 * in its own green with its own drawing (a guard stopping a tool call), but its
 * action is "Read it on GitHub" because you leave the site to read it.
 */
export default function Gallery() {
  const featured = OPEN_ROOMS.find((r) => r.featured);
  const rest = OPEN_ROOMS.filter((r) => r !== featured);
  const repos = DATA.projects;

  return (
    <div className="w-full space-y-10">
      <div className="grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2">
        {featured ? (
          <div className="sm:col-span-2">
            <RoomCard room={featured} featured />
          </div>
        ) : null}
        {rest.map((room) => (
          <div key={room.slug} className="h-full">
            <RoomCard room={room} />
          </div>
        ))}
      </div>

      {repos.map((project) => (
        <a
          key={project.title}
          href={project.href}
          target="_blank"
          rel="noreferrer noopener"
          style={{ "--tint-hue": 150 } as React.CSSProperties}
          className="group grid gap-5 border-t border-border pt-6 sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:gap-8"
        >
          <RoomSpecimen slug="agent-guards" className="aspect-[2/1] sm:aspect-[5/3]" />
          <div className="flex flex-col">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: INK }}>
              Open source
            </p>
            <h3
              className="break-words font-mono text-xl font-semibold tracking-tight decoration-2 underline-offset-4 group-hover:underline sm:text-3xl"
              style={{ textDecorationColor: INK }}
            >
              {project.title}
            </h3>
            <p className="mt-3 text-lg leading-snug">{project.description[0]}</p>
            {/* Element 0 is the claim, the rest are the mechanisms under it. */}
            <ul className="mt-3 grid gap-x-6 gap-y-1 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2">
              {project.description.slice(1).map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full" style={{ background: INK }} />
                  {line}
                </li>
              ))}
            </ul>
            <span
              className="mt-5 inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "oklch(0.5 0.15 var(--tint-hue))" }}
            >
              <Icons.github className="size-4" /> Read it on GitHub
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
