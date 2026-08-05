import type { Metadata } from "next";
import Link from "next/link";
import Gallery from "@/components/demos/gallery";
import { DATA } from "@/data/resume";

export const metadata: Metadata = {
  title: "Demos",
  description:
    "Three things you can run against a real database, each one stating what it does not prove before you start it.",
};

/**
 * A standalone index for the exhibition.
 *
 * The same gallery that renders at /#projects, given a title block. It exists
 * because these URLs go into job applications: someone handed /demos in an email
 * should land on a curated index rather than halfway down a personal site, and a
 * mistyped room URL needs somewhere sensible to point.
 */
export default function DemosIndex() {
  return (
    <div className="space-y-10 py-10 sm:py-14">
      <div className="space-y-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden>&larr;</span> {DATA.name}
        </Link>
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          Things I built to be inspected
        </h1>
        <p className="max-w-prose text-[15px] leading-relaxed text-muted-foreground">
          Each of these runs for real when you press the button, against a real
          database. None of them runs on arrival, every one states what it does not
          prove before you start, and the file that implements it is linked at the
          bottom of the room.
        </p>
      </div>
      <Gallery />
    </div>
  );
}
