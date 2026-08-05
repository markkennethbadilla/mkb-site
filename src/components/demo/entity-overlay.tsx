"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import Entity from "@/components/demo/entity";
import { TRAVEL_MS } from "@/lib/smooth-scroll";
import { cn } from "@/lib/utils";

/**
 * What you see once the agent has left its slot: the section it chose lit up, the
 * entity hovering beside it, and its answer in a bubble.
 *
 * The spotlight is one element, not four. A rect with a 9999px spread box-shadow
 * dims the entire rest of the page in a single paint and cannot drift out of
 * alignment with itself the way a four-panel scrim does when the layout reflows.
 */

type Rect = { top: number; left: number; width: number; height: number };

const ENTITY_SIZE = 64;
const BUBBLE_W = 304;

function readRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export default function EntityOverlay({
  target,
  stage,
  label,
  answer,
  meta,
  onDismiss,
}: {
  target: HTMLElement;
  /** "outbound" while the page is still travelling; "perched" once it has arrived. */
  stage: "outbound" | "perched";
  label: string;
  answer: string;
  /** What actually ran, in small type. Shown here as well as in the console, so a
   *  visitor who only ever sees the perched bubble still sees the evidence. */
  meta?: React.ReactNode;
  onDismiss: () => void;
}) {
  const arrived = stage === "perched";
  const reduced = useReducedMotion();
  const [rect, setRect] = useState<Rect>(() => readRect(target));
  const entityRef = useRef<HTMLDivElement>(null);
  const [entityBox, setEntityBox] = useState<Rect | null>(null);

  // The page keeps scrolling under the overlay - smooth-scroll is still settling
  // when this mounts - so the rect has to be re-read continuously rather than
  // measured once. rAF rather than a scroll listener, because the smooth scroll
  // fires far fewer events than it does frames.
  useEffect(() => {
    let frame: number;
    const tick = () => {
      setRect((prev) => {
        const next = readRect(target);
        const same =
          Math.abs(prev.top - next.top) < 0.5 &&
          Math.abs(prev.left - next.left) < 0.5 &&
          Math.abs(prev.width - next.width) < 0.5 &&
          Math.abs(prev.height - next.height) < 0.5;
        return same ? prev : next;
      });
      // The entity is measured on the same tick. It moves under a spring, so its
      // position is only knowable by asking the DOM.
      if (entityRef.current) {
        const next = readRect(entityRef.current);
        setEntityBox((prev) =>
          prev && Math.abs(prev.left - next.left) < 0.5 && Math.abs(prev.width - next.width) < 0.5
            ? prev
            : next
        );
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  // No SSR guard needed: this only ever mounts from a user action, and every
  // route here prerenders with the guide parked, so `document` is never touched
  // during the static export.

  // Perch on whichever side has room; below the section on narrow screens, where
  // there is no side to perch on at all. Everything is clamped to the viewport -
  // the first version put the bubble half off the right edge whenever the section
  // ran close to the container width, which on this layout is always.
  const viewportW = typeof window === "undefined" ? 1280 : window.innerWidth;
  const narrow = viewportW < 1180;
  const clampX = (x: number, w: number) => Math.min(Math.max(16, x), viewportW - w - 16);

  const perchLeft = narrow
    ? clampX(rect.left + rect.width - ENTITY_SIZE, ENTITY_SIZE)
    : clampX(rect.left + rect.width + 16, ENTITY_SIZE);
  const perchTop = narrow ? rect.top + rect.height + 8 : rect.top + 4;

  const bubbleLeft = clampX(narrow ? rect.left : perchLeft - BUBBLE_W + ENTITY_SIZE, BUBBLE_W);
  const bubbleTop = perchTop + ENTITY_SIZE + 10;

  // Where the tail meets the bubble: under the entity's ACTUAL centre.
  //
  // The first version derived this from perchLeft, the value we hand to `left`.
  // It sat 138px off, because the entity is a motion.div driven by a shared layout
  // animation - motion positions it with a transform, so its rendered centre is
  // not the number we set. Anything computed from perchLeft describes where we
  // asked it to be, not where it is. So the element is measured, like the section
  // rect above it.
  //
  // Falls back to the geometric estimate for the single frame before the ref
  // attaches, which is invisible because the bubble has not faded in yet.
  const TAIL = 11;
  const entityCentre = entityBox ? entityBox.left + entityBox.width / 2 : perchLeft + ENTITY_SIZE / 2;
  const tailLeft = Math.min(
    Math.max(entityCentre - bubbleLeft - TAIL, 18),
    BUBBLE_W - 18 - TAIL * 2
  );

  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Spotlight */}
      <motion.div
        aria-hidden
        // Comes up gradually across the whole journey rather than snapping on at
        // the start: the section should look like it is being lit as you approach
        // it, not like a modal opened.
        initial={{ opacity: 0 }}
        animate={{ opacity: arrived ? 1 : 0.45 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : arrived ? 0.5 : TRAVEL_MS / 1000 }}
        className="absolute rounded-2xl ring-2 ring-primary/70"
        style={{
          top: rect.top - 10,
          left: rect.left - 14,
          width: rect.width + 28,
          height: rect.height + 20,
          // Two shadows, one element: the 9999px spread dims everything outside
          // the rect, the inset ring puts a soft light just inside it. At 0.58
          // the dim was invisible against an already-dark page - a spotlight has
          // to actually darken its surroundings or it reads as a stray border.
          boxShadow:
            "0 0 0 9999px oklch(0.12 0.015 var(--tint-hue) / 0.82), inset 0 0 40px oklch(0.7 0.12 var(--tint-hue) / 0.10)",
        }}
      />

      {/* The entity itself. layoutId is shared with the parked console, so motion
          interpolates the flight instead of us hand-animating a path. */}
      <motion.div
        ref={entityRef}
        layoutId="site-guide-entity"
        className="absolute pointer-events-auto"
        style={{ top: perchTop, left: perchLeft }}
        // Slack, heavy spring. The stiff one snapped into place in about 200ms
        // and arrived long before the page did, which is what made the whole
        // thing read as a pop rather than a flight.
        transition={{ type: "spring", stiffness: 110, damping: 19, mass: 1.2 }}
      >
        <Entity mood={arrived ? "talking" : "thinking"} size={ENTITY_SIZE} />
      </motion.div>

      {/* The bubble is held back until the page has actually arrived. It is the
          punchline, and it landing mid-scroll is what made the sequence feel like
          three things happening at once instead of one. */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.94 }}
        animate={arrived ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.94 }}
        style={{
          top: bubbleTop,
          left: bubbleLeft,
          width: BUBBLE_W,
          pointerEvents: arrived ? "auto" : "none",
        }}
        transition={{ delay: reduced || !arrived ? 0 : 0.14, duration: reduced ? 0 : 0.34, ease: "easeOut" }}
        // A speech bubble, not a panel. rounded-[1.25rem] is deliberately rounder
        // than the site's rounded-xl cards: the entity is the one thing on the page
        // allowed to be soft, and matching the card radius made it read as a
        // tooltip rather than something talking.
        className={cn(
          "absolute rounded-[1.25rem] border border-border",
          "bg-popover/95 backdrop-blur-sm px-4 py-3.5 shadow-xl flex flex-col gap-2.5"
        )}
        role="status"
      >
        {/* The tail. One rotated square with two of its borders showing, sitting
            half outside the bubble so the bubble's own background covers the seam.
            A CSS triangle cannot do this - a border-triangle has no border of its
            own, so it cannot carry the outline the rest of the bubble has. */}
        <span
          aria-hidden
          className="absolute size-[22px] rotate-45 rounded-[4px] border-l border-t border-border bg-popover/95"
          style={{ top: -11, left: tailLeft }}
        />
        <span className="relative text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <p className="text-[13px] leading-relaxed text-pretty">{answer}</p>
        {meta}
        <button
          onClick={onDismiss}
          className="self-start rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] font-medium text-background"
        >
          Ask something else
        </button>
      </motion.div>
    </div>,
    document.body
  );
}
