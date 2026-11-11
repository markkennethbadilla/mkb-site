import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DemoRoom } from "@/lib/demos/registry";
import { cn } from "@/lib/utils";
import RoomSpecimen from "@/components/demos/room-specimen";

export default function RoomCard({ room, featured }: { room: DemoRoom; featured?: boolean }) {
  return (
    <Link
      href={`/demos/${room.slug}`}
      data-tint
      style={{ "--tint-hue": room.hue } as React.CSSProperties}
      className={cn(
        "sheet sheet-lift group grid h-full gap-5 p-4 text-card-foreground sm:p-5",
        featured ? "md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-8" : "grid-rows-[auto_1fr]",
      )}
    >
      <div className="frame self-start">
        <RoomSpecimen slug={room.slug} className={cn("frame-in aspect-[2/1] bg-card", featured && "md:aspect-[5/3]")} />
      </div>

      <div className="flex flex-col p-1 sm:p-2">
        {featured ? <p className="tab mb-3 self-start bg-glow font-semibold text-lit-ink">Start here</p> : null}
        <h3 className={cn("ink-link font-display font-extrabold tracking-tight", featured ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl")}>
          {room.name}
        </h3>
        <p className={cn("mt-3 leading-snug", featured ? "text-lg sm:text-xl" : "text-base")}>{room.capability}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{room.promise}</p>
        <div className="mt-auto flex items-end gap-3 pt-5">
          <ul className="flex flex-col gap-0.5 font-mono text-[0.6875rem] text-muted-foreground">
            <li>
              about {room.runSeconds[0]} to {room.runSeconds[1]} seconds
            </li>
            <li>runs for real when you press the button</li>
          </ul>
          <span
            aria-hidden
            className="ml-auto grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-cut)] transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
          >
            <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
