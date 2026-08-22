// No "use client": with the session-flag write gone this renders the same on the
// server as it does in the browser, and shipping it as a client component would
// pull the whole gallery into the client bundle for nothing.
import Link from "next/link";
import type { DemoRoom } from "@/lib/demos/registry";
import { cn } from "@/lib/utils";

/**
 * One exhibit, in the gallery.
 *
 * Fixed slots, same order on every card, because the point of a gallery is that
 * two things can be compared. Name, then the CAPABILITY (one clause a recruiter
 * can repeat to someone else), then the PROMISE (what you will watch happen,
 * present tense, second person), then the cost.
 *
 * Capability and promise were the other way round until the eight-second scan
 * put them in this order - a reader who leaves after one line should leave with
 * the clause they can repeat, not with two sentences about a button.
 *
 * The promise may quantify its inputs and never its outcome. "Fire twelve payments"
 * is an input and is honest. "See the two that got refused" would be an outcome
 * printed before the run - which is either a lie or an admission that the run is
 * scripted, and a senior engineer who clicks through and counts three has caught
 * the site doing the exact thing it argues against. scripts/check-demos.mjs enforces
 * this on the registry rather than trusting whoever writes the next one.
 *
 * There is deliberately NO live/resting badge. Knowing whether the demo budget is
 * spent would need a Worker request from every visitor who scrolls past this
 * section, against the same daily allowance the badge exists to report on, and it
 * still could not see the per-visitor cap that actually refuses people. A card
 * labelled "live" that then refuses is worse than no label. The room explains the
 * refusal on arrival, using the budget's own words, which is the honest place for it.
 *
 */
export default function RoomCard({ room, featured }: { room: DemoRoom; featured?: boolean }) {
  return (
    <Link
      href={`/demos/${room.slug}`}
      style={{ "--tint-hue": room.hue } as React.CSSProperties}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card p-5 transition-all",
        "hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-lg",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        featured && "sm:col-span-2 sm:p-7"
      )}
    >
      {/* The room announces its own colour before you get there. One hairline, so
          the card still reads as part of this page rather than as a fragment of
          another one. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: "oklch(0.62 0.13 var(--tint-hue))" }}
      />

      <div className="flex items-baseline justify-between gap-3">
        <h3 className={cn("font-semibold tracking-tight", featured ? "text-2xl" : "text-lg")}>
          {room.name}
        </h3>
        {featured ? (
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Start here
          </span>
        ) : null}
      </div>

      <p
        className={cn(
          "mt-2 leading-relaxed text-foreground/85",
          featured ? "max-w-prose text-[15px]" : "text-[13px]"
        )}
      >
        {room.capability}
      </p>

      <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{room.promise}</p>

      {/* Two facts, so a real list. They were three sibling spans with a middot
          span between them doing a bullet's job, which is a bullet nothing but a
          sighted reader can see. The middot stays as decoration inside the second
          item; the arrow is not a fact and stays outside the list. */}
      <div className="mt-auto flex items-center gap-3 pt-4 font-mono text-[10px] text-muted-foreground/75">
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <li>
            about {room.runSeconds[0]} to {room.runSeconds[1]} seconds
          </li>
          <li className="flex items-center gap-3">
            <span aria-hidden className="text-muted-foreground/40">·</span>
            <span>runs for real when you press the button</span>
          </li>
        </ul>
        <span
          aria-hidden
          className="ml-auto transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        >
          &rarr;
        </span>
      </div>
    </Link>
  );
}
