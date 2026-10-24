"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * The flickering "digital" grid behind the top of every site page, brought back
 * at Mark's request (2026-10-24) without its old cost. Magic UI FlickeringGrid is
 * a canvas animation, so it is imported only after the browser goes idle (after
 * first paint, never in the LCP path) and never for prefers-reduced-motion. The
 * grid pauses itself off-screen (its own IntersectionObserver) and fades out
 * downwards, so it sits above the hero, not under text.
 */
const FlickeringGrid = dynamic(
  () => import("@/components/magicui/flickering-grid").then((m) => m.FlickeringGrid),
  { ssr: false },
);

export default function GridBackdrop() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const id = idle(() => setOn(true));
    return () => (window.cancelIdleCallback ?? window.clearTimeout)(id as number);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-14 -z-0 h-40 overflow-hidden">
      {on ? (
        <FlickeringGrid
          className="h-full w-full"
          squareSize={2}
          gridGap={3}
          maxOpacity={0.25}
          style={{
            maskImage: "linear-gradient(to bottom, black, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
          }}
        />
      ) : null}
    </div>
  );
}
