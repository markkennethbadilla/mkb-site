"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import Entity from "@/components/demo/entity";
import { ModeToggle } from "@/components/mode-toggle";
import { OPEN_ROOMS, type DemoRoom } from "@/lib/demos/registry";
import { cn } from "@/lib/utils";

/**
 * The one piece of chrome every room shares, and the thing that makes three rooms
 * read as three rooms in one building rather than three unrelated pages.
 *
 * The room index - one labelled control per room, the current one marked - is what
 * does that work. Without it a visitor who arrives on a deep link from a job
 * application has no idea the other two exist.
 *
 * COLD ARRIVAL. Someone opening this from an email has never seen the site, and
 * "back to all three demos" means nothing to them; they want the person. Someone
 * who walked in from the gallery wants the gallery. The referrer cannot tell these
 * apart, because a click on a gallery card is a client-side route change and
 * `document.referrer` still holds whatever loaded the original document - so a
 * visitor who typed the URL, scrolled down and clicked a card would be labelled
 * cold, which is exactly backwards. The gallery sets a session flag on click
 * instead, and that is what this reads.
 *
 * The warm label is rendered only after mount. Branching the tree before hydration
 * is the failure this repo has already documented once; the cold label is the
 * server-rendered default because it is the safe one to be wrong about.
 *
 * The entity is here as the back affordance, dormant. It does not bob and does not
 * blink: there is no guide in a room, and a creature that appears to be listening
 * when nothing is listening is the small lie this site keeps refusing to tell.
 */
export const CAME_FROM_GALLERY = "mkb:demos:from-gallery";

/**
 * sessionStorage read as an external store rather than in an effect.
 *
 * The value differs between server and client by definition - the server cannot
 * know - so this is exactly the shape useSyncExternalStore exists for: a server
 * snapshot React renders and hydrates against, and a client snapshot it swaps to
 * without a mismatch. Setting state in an effect instead does the same thing via a
 * cascading render, which is what the lint rule objects to and it is right.
 *
 * Nothing subscribes: whether you arrived from the gallery is decided before this
 * component mounts and cannot change while you are standing in a room.
 */
const NO_SUBSCRIBE = () => () => {};
const readWarm = () => {
  try {
    return sessionStorage.getItem(CAME_FROM_GALLERY) === "1";
  } catch {
    // Private-mode storage throws rather than returning null. Staying cold is the
    // correct fallback: it names the person, which is never wrong.
    return false;
  }
};

export default function Rail({ room }: { room: DemoRoom }) {
  const warm = useSyncExternalStore(NO_SUBSCRIBE, readWarm, () => false);

  return (
    <header className="sticky top-0 z-30 -mx-6 mb-6 border-b border-border/70 bg-background/85 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-13 w-full max-w-5xl items-center gap-3 py-2">
        <Link
          href={warm ? "/demos" : "/"}
          className="group flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-foreground/80 transition-colors hover:text-foreground"
        >
          <Entity mood="dormant" size={24} className="shrink-0" />
          <span aria-hidden className="text-muted-foreground">&larr;</span>
          <span className="hidden sm:inline">{warm ? "All demos" : "Mark Kenneth Badilla"}</span>
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
