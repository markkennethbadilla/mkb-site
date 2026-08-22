"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

/**
 * Milliseconds remaining until a real deadline, re-read continuously rather than
 * computed once. This is the one quantity in the room allowed to animate - it is
 * genuinely continuous (real wall-clock time against a real server deadline), not
 * a node state being softened into a tween.
 *
 * The cadence is the precision on screen and no finer. stage.tsx prints one decimal
 * of a second, so ten samples a second say everything a frame-locked loop would
 * have said, at a sixth of the repaints.
 *
 * With no deadline there is nothing to count and the answer is zero, decided where
 * the value is returned rather than by writing zero into state from inside the
 * effect. An effect whose first act is to set state is a second render for
 * something the first one could have had right.
 *
 * prefers-reduced-motion does not stop the countdown, only its cadence, and it
 * comes from motion's own hook rather than a one-shot matchMedia read - the hook
 * subscribes, so flipping the OS setting mid-session takes effect.
 *
 * One known ceiling. The first sample of a NEW lease is up to one interval late, so
 * the bar can carry the previous term's figure for a tenth of a second before it
 * corrects. Reading the clock during render would remove that, and react-hooks
 * forbids it - Date.now() is impure and a render that calls it is not idempotent.
 */
export function useCountdown(expiresAt: number | null): number {
  const reduced = useReducedMotion();
  const [remaining, setRemaining] = useState(() => (expiresAt ? expiresAt - Date.now() : 0));

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setRemaining(expiresAt - Date.now()), reduced ? 1000 : 100);
    return () => clearInterval(id);
  }, [expiresAt, reduced]);

  return expiresAt ? Math.max(0, remaining) : 0;
}
