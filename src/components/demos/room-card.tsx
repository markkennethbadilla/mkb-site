// No "use client": renders the same on the server as in the browser, and a client
// component would pull the whole gallery into the client bundle for nothing.
import Link from "next/link";
import type { DemoRoom } from "@/lib/demos/registry";
import { cn } from "@/lib/utils";
import RoomSpecimen from "@/components/demos/room-specimen";

/**
 * One exhibit, in the gallery.
 *
 * Fixed slots, same order for every room, because the point of a gallery is that
 * two things can be compared. Name, then the CAPABILITY (one clause a recruiter
 * can repeat to someone else), then the PROMISE (what you will watch happen), then
 * the cost. A reader who leaves after one line leaves with the clause they can repeat.
 *
 * The promise may quantify its inputs and never its outcome ("fire twelve payments"
 * is honest; "see the two that got refused" would print a result before the run).
 * The test suite enforces this on the registry.
 *
 * There is deliberately NO live/resting badge: knowing whether the demo budget is
 * spent would cost a Worker request per visitor who scrolls past, and still could
 * not see the per-visitor cap. The room explains a refusal on arrival instead.
 *
 * Layout (Mark 2026-10-24, the bordered cards read as "very AI generated"): no box.
 * Each room is an editorial block under a hairline, led by a drawing of what it does
 * (RoomSpecimen), then the name large, the capability as the hook, the promise, and
 * quiet metadata, with one round arrow in the room's colour as the call to action.
 * The featured room sits wide with a larger drawing, and "Start here" is set in the
 * room's colour as a lead-in rather than a pill.
 */
export default function RoomCard({ room, featured }: { room: DemoRoom; featured?: boolean }) {
  // Text ink lighter in dark mode (light-dark, color-scheme from next-themes) for AA contrast.
  const hue = "light-dark(oklch(0.5 0.15 var(--tint-hue)), oklch(0.78 0.13 var(--tint-hue)))";
  const fillHue = "oklch(0.5 0.15 var(--tint-hue))";
  return (
    <Link
      href={`/demos/${room.slug}`}
      style={{ "--tint-hue": room.hue } as React.CSSProperties}
      className={cn(
        "group grid h-full gap-5 border-t border-border pt-6",
        featured ? "sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:gap-8" : "grid-rows-[auto_1fr]"
      )}
    >
      <RoomSpecimen
        slug={room.slug}
        className={cn(
          "aspect-[2/1] transition-transform duration-300 group-hover:scale-[1.02]",
          "motion-reduce:transition-none motion-reduce:group-hover:scale-100",
          featured && "sm:aspect-[5/3]"
        )}
      />

      <div className="flex flex-col">
        {featured ? (
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: hue }}>
            Start here
            <span aria-hidden className="h-px w-10" style={{ background: hue }} />
          </p>
        ) : null}

        <h3
          className={cn(
            "font-semibold tracking-tight decoration-2 underline-offset-4 group-hover:underline",
            featured ? "text-3xl sm:text-4xl" : "text-2xl"
          )}
          style={{ textDecorationColor: hue }}
        >
          {room.name}
        </h3>

        <p className={cn("mt-3 leading-snug text-foreground", featured ? "text-lg sm:text-xl" : "text-base")}>
          {room.capability}
        </p>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{room.promise}</p>

        {/* Two facts, so a real list. The arrow is the call to action, not a fact. */}
        <div className="mt-auto flex items-end gap-3 pt-5">
          <ul className="flex flex-col gap-0.5 font-mono text-[11px] text-muted-foreground">
            <li>
              about {room.runSeconds[0]} to {room.runSeconds[1]} seconds
            </li>
            <li>runs for real when you press the button</li>
          </ul>
          <span
            aria-hidden
            className="ml-auto grid size-9 shrink-0 place-items-center rounded-full text-base text-white transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
            style={{ background: fillHue }}
          >
            &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
