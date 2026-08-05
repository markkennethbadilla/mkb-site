"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A linear settle, not a spring. This room's motion character is "measured" - a
 * gauge easing to its final reading over a fixed span, never overshooting and
 * never bouncing - so the interpolation is hand-rolled on requestAnimationFrame
 * with a plain linear t rather than reached for a physics default.
 *
 * Reduced motion jumps straight to the target rather than skipping the element:
 * SPEC.md's rule is to gate the animation, never the tree, since branching the
 * tree on a media query makes server and client markup disagree.
 */
export function useSettle(target: number, durationMs = 800, delayMs = 0, reduced = false): number {
  // Progress, not the value. The reduced-motion case then needs no state change at
  // all - it is answered at render by returning the target - which is what keeps
  // this out of the "setState synchronously inside an effect" shape that causes a
  // cascading render for something the first paint could already have had right.
  const [progress, setProgress] = useState(0);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (reduced) return;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t + delayMs;
      const elapsed = t - start;
      if (elapsed < 0) {
        frame.current = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(1, elapsed / durationMs);
      setProgress(p);
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    };
  }, [durationMs, delayMs, reduced]);

  return reduced ? target : target * progress;
}
