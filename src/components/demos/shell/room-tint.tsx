"use client";

import { useLayoutEffect } from "react";

/**
 * Re-lights the whole interface for the room you are standing in.
 *
 * Renders nothing. It sets `data-tint` and `--tint-hue` on <body>, and every colour
 * on the page follows, because the palette in globals.css derives every token from
 * that one number. Walking from the gallery into a room sweeps green to brass over
 * 480ms; walking room to room sweeps brass to indigo. One property, whole building.
 *
 * WHY <body> AND NOT A WRAPPER DIV. Radix portals tooltips, popovers and dialogs to
 * document.body. A wrapper would leave every portalled surface rendering in the
 * site's green inside a room lit brass, and so would the area behind an overscroll
 * bounce. Body is the lowest element that is genuinely the whole page.
 *
 * WHY AN EFFECT AND NOT AN ATTRIBUTE IN THE LAYOUT. Under `output: "export"` every
 * route is prerendered, and body is rendered by the ROOT layout, which does not know
 * which room is below it. Branching the tree on that is the hydration mismatch this
 * repo has already been bitten by once. Setting it after mount also gets the sweep
 * for free on a cold arrival: the page paints in the site's green and lights up.
 *
 * useLayoutEffect rather than useEffect so the attribute lands in the same frame as
 * the room's first paint. With useEffect the room's content can paint once against
 * the wrong palette first, which reads as a flicker rather than a sweep.
 */
export default function RoomTint({ hue }: { hue: number }) {
  useLayoutEffect(() => {
    const { body } = document;
    body.dataset.tint = "";
    body.style.setProperty("--tint-hue", String(hue));
    return () => {
      // Leaving a room has to put the site's own light back, or the gallery
      // renders in the last room's colour.
      delete body.dataset.tint;
      body.style.removeProperty("--tint-hue");
    };
  }, [hue]);

  return null;
}
