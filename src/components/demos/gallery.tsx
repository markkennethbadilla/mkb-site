import RoomCard from "@/components/demos/room-card";
import RoomSpecimen from "@/components/demos/room-specimen";
import { OPEN_ROOMS } from "@/lib/demos/registry";
import { DATA } from "@/data/resume";
import { Icons } from "@/components/icons";

export default function Gallery() {
  const featured = OPEN_ROOMS.find((r) => r.featured);
  const rest = OPEN_ROOMS.filter((r) => r !== featured);

  return (
    <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
      {featured ? (
        <div className="md:col-span-2">
          <RoomCard room={featured} featured />
        </div>
      ) : null}
      {rest.map((room) => (
        <RoomCard key={room.slug} room={room} />
      ))}

      {DATA.projects.map((project) => (
        <a
          key={project.title}
          href={project.href}
          target="_blank"
          rel="noreferrer noopener"
          className="sheet sheet-lift group grid gap-5 p-4 sm:p-5 md:col-span-2 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-8"
        >
          <div className="frame self-start">
            <RoomSpecimen slug="agent-guards" className="frame-in aspect-[2/1] bg-card md:aspect-[5/3]" />
          </div>
          <div className="flex flex-col p-1 sm:p-2">
            <p className="tab mb-3 self-start font-mono uppercase tracking-[0.12em]">Open source</p>
            <h3 className="ink-link break-words font-mono text-xl font-semibold tracking-tight sm:text-3xl">{project.title}</h3>
            <p className="mt-3 text-lg leading-snug">{project.description[0]}</p>
            <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm leading-relaxed text-muted-foreground sm:grid-cols-2">
              {project.description.slice(1).map((line) => (
                <li key={line} className="flex gap-2.5">
                  <span aria-hidden className="mt-1.5 size-2 shrink-0 rotate-45 rounded-[2px] bg-glow" />
                  {line}
                </li>
              ))}
            </ul>
            <span className="btn-cut mt-5 self-start text-sm">
              <Icons.github className="size-4" /> Read it on GitHub
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}
