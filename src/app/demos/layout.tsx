import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demos",
};

/**
 * The exhibition wing. Wider than the resume, no dock, no background grid.
 *
 * Everything room-specific - the rail, the lighting, the wall label - is composed
 * by each room's own page rather than injected here. That is deliberate: a layout
 * that reached into the registry to decide what to render would have to know which
 * room it was above, and under a static export the honest way to know that is to
 * be the room's own page.
 *
 * What this file is for is the measure and the fact that the site's chrome is
 * absent, both of which are the same for every room and for the gallery index.
 */
export default function DemosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 pb-24 pt-6 sm:pb-28">{children}</div>
  );
}
