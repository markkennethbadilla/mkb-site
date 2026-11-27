"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { autoUpdate, flip, offset, shift, useFloating } from "@floating-ui/react-dom";
import { motion, useReducedMotion } from "motion/react";
import Entity from "@/components/demo/entity";
import { TRAVEL_MS } from "@/lib/smooth-scroll";
import { cn } from "@/lib/utils";

/**
 * What you see once the agent has left its slot: the section it chose lit up, the
 * entity hovering beside it, and the answer written on the section itself.
 *
 * No speech bubble: a second floating box read as a separate conversation. The
 * answer and "Ask something else" sit in a caption joined to the spotlight ring,
 * so they belong to the section. The entity and the caption are placed by
 * Floating UI with shift on both axes, so both stay inside the viewport and move
 * back in when the section scrolls part way out.
 */

type Rect = { top: number; left: number; width: number; height: number };

const ENTITY_SIZE = 64;
// The spotlight ring sits this far outside the section.
const RING_X = 14;
const RING_Y = 10;

function readRect(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

export default function EntityOverlay({
  target,
  stage,
  label,
  answer,
  onDismiss,
}: {
  target: HTMLElement;
  /** "outbound" while the page is still travelling; "perched" once it has arrived. */
  stage: "outbound" | "perched";
  label: string;
  answer: string;
  onDismiss: () => void;
}) {
  const arrived = stage === "perched";
  const reduced = useReducedMotion();
  const [rect, setRect] = useState<Rect>(() => readRect(target));

  // The page keeps scrolling under the overlay, so the spotlight re-reads the rect every frame.
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

  const viewportW = typeof window === "undefined" ? 1280 : window.innerWidth;

  // Elements in state, passed via `elements`: the React Compiler lint rule rejects refs from the same hook.
  const [entityEl, setEntityEl] = useState<HTMLDivElement | null>(null);
  const [captionEl, setCaptionEl] = useState<HTMLDivElement | null>(null);
  const live: typeof autoUpdate = (ref, floating, update) =>
    autoUpdate(ref, floating, update, { animationFrame: true });

  // Perched on the caption's outer corner, so it is next to the section and never covers the answer; shift keeps it inside the viewport.
  const entity = useFloating({
    strategy: "fixed",
    placement: "top-end",
    transform: false,
    elements: { reference: captionEl, floating: entityEl },
    whileElementsMounted: live,
    middleware: [
      offset(6),
      flip({ padding: 16, fallbackPlacements: ["bottom-end", "left", "right"] }),
      shift({ padding: 16, crossAxis: true }),
    ],
  });

  // Joined to the top edge of the spotlight ring, always on that side, clamped sideways only:
  // it scrolls with its section and never covers the section's content. Only the entity stays in view.
  const caption = useFloating({
    strategy: "fixed",
    placement: "top-start",
    transform: false,
    elements: { reference: target, floating: captionEl },
    whileElementsMounted: live,
    middleware: [
      offset({ mainAxis: RING_Y, crossAxis: -RING_X }),
      shift({ padding: 16, crossAxis: false }),
    ],
  });

  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Clicking away ends the visit. A sibling, not an ancestor, so clicks on the caption never reach it. */}
      <button
        aria-label="Return the guide to its place"
        tabIndex={-1}
        onClick={onDismiss}
        className="absolute inset-0 cursor-default pointer-events-auto"
      />

      {/* Spotlight */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: arrived ? 1 : 0.45 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduced ? 0 : arrived ? 0.5 : TRAVEL_MS / 1000 }}
        className="absolute rounded-2xl ring-2 ring-primary/70"
        style={{
          top: rect.top - RING_Y,
          left: rect.left - RING_X,
          width: rect.width + RING_X * 2,
          height: rect.height + RING_Y * 2,
          boxShadow:
            "0 0 0 9999px oklch(0.12 0.015 var(--tint-hue) / 0.82), inset 0 0 40px oklch(0.7 0.12 var(--tint-hue) / 0.10)",
        }}
      />

      {/* The entity. layoutId is shared with the parked console, so motion interpolates the flight. */}
      <motion.div
        ref={setEntityEl}
        layoutId="site-guide-entity"
        className="pointer-events-auto z-10"
        style={entity.floatingStyles}
        transition={{ type: "spring", stiffness: 110, damping: 19, mass: 1.2 }}
      >
        <Entity mood={arrived ? "talking" : "thinking"} size={ENTITY_SIZE} />
      </motion.div>

      {/* The answer, on the section: same ring colour, square on the joined edge. */}
      <motion.div
        ref={setCaptionEl}
        role="status"
        initial={{ opacity: 0 }}
        animate={{ opacity: arrived ? 1 : 0 }}
        exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.15 } }}
        transition={{ delay: reduced || !arrived ? 0 : 0.14, duration: reduced ? 0 : 0.3, ease: "easeOut" }}
        style={{
          ...caption.floatingStyles,
          width: Math.min(rect.width + RING_X * 2, viewportW - 32),
          pointerEvents: arrived ? "auto" : "none",
        }}
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1.5 border-2 border-primary/70 bg-popover px-3.5 py-2.5 shadow-lg",
          "rounded-t-2xl border-b-0"
        )}
      >
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <p className="min-w-0 flex-1 basis-60 text-[13px] leading-relaxed text-pretty">{answer}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] font-medium text-background"
        >
          Ask something else
        </button>
      </motion.div>
    </div>,
    document.body
  );
}
