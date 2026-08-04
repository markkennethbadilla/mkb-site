/**
 * Eased programmatic scrolling, and nothing else.
 *
 * `scrollIntoView({ behavior: "smooth" })` is not tunable and not consistent -
 * duration and easing are the browser's to choose, and Chrome's choice is a short
 * near-linear ramp that reads as a jump. The guide's whole effect depends on the
 * page TRAVELLING, so the curve has to be ours.
 *
 * Lenis is configured with smoothWheel OFF on purpose. Taking over the wheel would
 * change how every visitor scrolls the entire site, which is a much larger decision
 * than "animate the trip to a section" and not one this feature needs to make.
 * Programmatic scrollTo still runs through Lenis's own animation loop either way.
 *
 * The rAF loop runs only while a scroll is in flight. A permanent loop on a mostly
 * static page is a battery cost with nothing to show for it.
 */

import Lenis from "lenis";

let lenis: Lenis | null = null;
let frame = 0;

function pump(time: number) {
  lenis?.raf(time);
  frame = requestAnimationFrame(pump);
}

function start(): Lenis {
  if (!lenis) lenis = new Lenis({ autoRaf: false, smoothWheel: false });
  if (!frame) frame = requestAnimationFrame(pump);
  return lenis;
}

function stop() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}

/** Ease-out quint: fast departure, long settle. Reads as arriving, not stopping. */
const EASE = (t: number) => 1 - Math.pow(1 - t, 5);

export const TRAVEL_MS = 1400;

/**
 * Scrolls the element to the vertical centre of the viewport and resolves when it
 * gets there. Resolves immediately, having jumped, when the visitor has asked for
 * reduced motion - the destination still matters to them, the journey does not.
 */
export function scrollToElement(el: HTMLElement, { reduced = false } = {}): Promise<void> {
  const centreOffset = -Math.max(0, (window.innerHeight - el.offsetHeight) / 2);

  if (reduced) {
    el.scrollIntoView({ behavior: "auto", block: "center" });
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const instance = start();
    instance.scrollTo(el, {
      offset: centreOffset,
      duration: TRAVEL_MS / 1000,
      easing: EASE,
      onComplete: () => {
        stop();
        resolve();
      },
    });
  });
}
