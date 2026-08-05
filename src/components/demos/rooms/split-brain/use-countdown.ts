"use client";

import { useEffect, useState } from "react";

/**
 * Milliseconds remaining until a real deadline, re-read continuously rather than
 * computed once. This is the one quantity in the room allowed to animate - it is
 * genuinely continuous (real wall-clock time against a real server deadline), not
 * a node state being softened into a tween.
 *
 * prefers-reduced-motion does not stop the countdown, only its redraw cadence: a
 * 1-second interval reports the identical number a frame-locked loop would, it
 * just repaints less often.
 */
export function useCountdown(expiresAt: number | null): number {
  const [remaining, setRemaining] = useState(() => (expiresAt ? expiresAt - Date.now() : 0));

  useEffect(() => {
    if (!expiresAt) {
      setRemaining(0);
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tick = () => setRemaining(expiresAt - Date.now());
    tick();

    if (reduced) {
      const id = setInterval(tick, 1000);
      return () => clearInterval(id);
    }
    let raf = requestAnimationFrame(function loop() {
      tick();
      raf = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(raf);
  }, [expiresAt]);

  return Math.max(0, remaining);
}
