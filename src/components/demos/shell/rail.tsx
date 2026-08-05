import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { OPEN_ROOMS, type DemoRoom } from "@/lib/demos/registry";
import { DATA } from "@/data/resume";
import { cn } from "@/lib/utils";

/**
 * The one piece of chrome every room shares, and the thing that makes three rooms
 * read as three rooms in one building rather than three unrelated pages.
 *
 * The room index - one labelled control per room, the current one marked - is what
 * does that work. Without it a visitor who arrives on a deep link from a job
 * application has no idea the other two exist.
 *
 * ONE BACK LINK, NOT TWO, and no state behind it. There used to be a warm/cold
 * split: a visitor who walked in from the gallery got "All demos", a visitor
 * arriving cold got Mark's name, and a sessionStorage flag told them apart because
 * a client-side route change never updates document.referrer. All of it became
 * pointless when /demos was deleted - both destinations collapsed to the same URL,
 * so the flag, the store subscription and the branch were doing work that could not
 * change the outcome. What is left names the person, which is right for a cold
 * arrival, and lands a warm one back at the gallery, which is right for them.
 *
 * The entity used to sit here as the back affordance, dormant. Removed 2026-08-05
 * (Mark): a creature parked beside a text link with nothing to do reads as
 * misplaced rather than as character. It belongs where it has a job, which is
 * beside the guide on the home page.
 *
 * No "use client" any more either - with the store read gone there is nothing here
 * that needs the browser.
 */
export default function Rail({ room }: { room: DemoRoom }) {
  return (
    <header className="sticky top-0 z-30 -mx-6 mb-6 border-b border-border/70 bg-background/85 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-13 w-full max-w-5xl items-center gap-3 py-2">
        <Link
          href="/#projects"
          className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-foreground/80 transition-colors hover:text-foreground"
        >
          <span aria-hidden className="text-muted-foreground">&larr;</span>
          <span>{DATA.name}</span>
        </Link>

        <nav aria-label="Exhibition rooms" className="ml-auto flex items-center gap-1">
          {OPEN_ROOMS.map((r) => {
            const here = r.slug === room.slug;
            return (
              <Link
                key={r.slug}
                href={`/demos/${r.slug}`}
                aria-current={here ? "page" : undefined}
                title={r.name}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] transition-colors",
                  here
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                <span className="hidden md:inline">{r.name}</span>
                {/* Below md the names do not fit. A number is still a label; three
                    unlabelled dots at an 8px target are not. */}
                <span className="md:hidden">{r.order}</span>
              </Link>
            );
          })}
          <span className="ml-1">
            <ModeToggle />
          </span>
        </nav>
      </div>
    </header>
  );
}
