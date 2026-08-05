import Navbar from "@/components/navbar";
import { FlickeringGrid } from "@/components/magicui/flickering-grid";

/**
 * The site's own chrome: the grid strip at the top, one measure for everything,
 * and the dock.
 *
 * This lives in a route group rather than in the root layout so the exhibition
 * rooms can simply not have it. A room wants a wider stage than the resume does,
 * and the dock is the site's signature rather than a room's.
 *
 * The alternative - keeping it in the root layout and hiding it with usePathname -
 * would produce the flash it was meant to avoid. Under `output: "export"` every
 * route is prerendered, so the room's HTML would ship WITH the dock in it and then
 * lose it on hydration: a visible jump on the page a recruiter opens from an email,
 * and the same class of hydration branching this repo has already been bitten by.
 * A route group decides it at build time, so nothing has to be undone.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="absolute inset-0 top-0 left-0 right-0 h-[100px] overflow-hidden z-0">
        <FlickeringGrid
          className="h-full w-full"
          squareSize={2}
          gridGap={2}
          style={{
            maskImage: "linear-gradient(to bottom, black, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
          }}
        />
      </div>
      {/* ONE container width for the whole page. Previously this was max-w-2xl and
          the demo broke out of it, so a single section randomly spanned the viewport
          while everything else sat in a thin ribbon - which read as a bug, not a
          layout. Everything here shares this edge; prose constrains its own line
          length inside. */}
      <div className="relative z-10 mx-auto w-full max-w-4xl px-6 py-12 pb-24 sm:py-24">
        {children}
      </div>
      <Navbar />
    </>
  );
}
