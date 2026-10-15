"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  arrow,
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from "@floating-ui/react-dom";
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

  // MINIMISED IS NOT DISMISSED, and keeping those two apart is the whole point of
  // this state. The bubble is the widest thing on screen and it sits directly over
  // the section it is describing, so the moment a visitor wants to actually LOOK at
  // what was highlighted, the answer is in the way. Minimising collapses it to a
  // small pressable bubble beside the entity and changes nothing else - the entity
  // stays exactly where it perched, the spotlight stays exactly as it is, and
  // pressing it puts the answer back. Ending the visit is a separate gesture
  // (clicking away), because a visitor who wants the view back has not finished
  // with the answer.
  const [minimised, setMinimised] = useState(false);

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

  // The bubble opens ABOVE the entity. It used to hang below it, and when the
  // guide perched on the last section (Contact) the bubble ran off the bottom of
  // the viewport. Placement, flipping and edge-clamping are Floating UI's job, not
  // ours: `top-end` on desktop (entity sits right of the section), `top` on narrow
  // screens, `flip` drops it below only when there is no room above, `shift`
  // keeps it 16px inside the viewport, and `arrow` puts the tail under the
  // entity's real (transformed) centre. autoUpdate on animationFrame because the
  // entity moves under a spring and the page is still smooth-scrolling.
  // transform:false so motion keeps sole ownership of the bubble's transform.
  const TAIL = 11;
  // Elements are held in state and passed via `elements` rather than through
  // `refs`, because the React Compiler lint rule (react-hooks/refs) rejects
  // reading floatingStyles from a hook that also returns refs during render.
  const [entityEl, setEntityEl] = useState<HTMLDivElement | null>(null);
  const [bubbleEl, setBubbleEl] = useState<HTMLDivElement | null>(null);
  const [pillEl, setPillEl] = useState<HTMLButtonElement | null>(null);
  const [tailEl, setTailEl] = useState<HTMLSpanElement | null>(null);
  const bubble = useFloating({
    strategy: "fixed",
    placement: narrow ? "top" : "top-end",
    transform: false,
    elements: { reference: entityEl, floating: bubbleEl },
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true }),
    middleware: [
      offset(12),
      flip({ padding: 16 }),
      shift({ padding: 16 }),
      arrow({ element: tailEl, padding: 18 }),
    ],
  });
  const pill = useFloating({
    strategy: "fixed",
    placement: "top",
    transform: false,
    elements: { reference: entityEl, floating: pillEl },
    whileElementsMounted: (ref, floating, update) =>
      autoUpdate(ref, floating, update, { animationFrame: true }),
    middleware: [offset(10), flip({ padding: 16 }), shift({ padding: 16 })],
  });
  const bubbleBelow = bubble.placement.startsWith("bottom");
  const pillBelow = pill.placement.startsWith("bottom");
  const tailLeft = bubble.middlewareData.arrow?.x;

  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Clicking away is what ends the visit, and it is the ONLY thing that does
          now that the bubble minimises rather than closes. A sibling rather than an
          ancestor of the entity and the bubble, so a click on either of those never
          reaches it - React events bubble to ancestors, not across siblings.
          Rendered first so it sits under everything it must not intercept. */}
      <button
        aria-label="Return the guide to its place"
        tabIndex={-1}
        onClick={onDismiss}
        className="absolute inset-0 cursor-default pointer-events-auto"
      />

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
        ref={setEntityEl}
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
      {/* Minimised: the answer is still there, it is just out of the way. A small
          bubble with its own tail, sitting where the big one starts, so the thing
          you press to get the answer back is in the place the answer just left. */}
      <motion.button
        type="button"
        aria-label="Show the answer again"
        onClick={() => setMinimised(false)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={
          arrived && minimised ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }
        }
        transition={{ duration: reduced ? 0 : 0.2, ease: "easeOut" }}
        ref={setPillEl}
        style={{
          ...pill.floatingStyles,
          pointerEvents: arrived && minimised ? "auto" : "none",
        }}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full",
          "border border-border bg-popover/95 backdrop-blur-sm shadow-lg",
          "transition-colors hover:bg-accent"
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute left-1/2 size-[11px] -translate-x-1/2 rotate-45 rounded-[2px] border-border bg-popover/95",
            pillBelow ? "-top-[5px] border-l border-t" : "-bottom-[5px] border-r border-b"
          )}
        />
        {/* Three dots rather than an icon set: it reads as "there is more to say"
            in any locale and needs no icon font on the critical path. */}
        <span className="relative -mt-0.5 text-[15px] leading-none tracking-[0.12em] text-muted-foreground">
          &#8230;
        </span>
      </motion.button>

      <motion.div
        initial={{ opacity: 0, y: bubbleBelow ? 10 : -10, scale: 0.94 }}
        animate={
          arrived && !minimised
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 0, y: bubbleBelow ? 10 : -10, scale: 0.94 }
        }
        ref={setBubbleEl}
        style={{
          ...bubble.floatingStyles,
          width: Math.min(BUBBLE_W, viewportW - 32),
          pointerEvents: arrived && !minimised ? "auto" : "none",
        }}
        transition={{ delay: reduced || !arrived ? 0 : 0.14, duration: reduced ? 0 : 0.34, ease: "easeOut" }}
        // A speech bubble, not a panel. rounded-[1.25rem] is deliberately rounder
        // than the site's rounded-xl cards: the entity is the one thing on the page
        // allowed to be soft, and matching the card radius made it read as a
        // tooltip rather than something talking.
        className={cn(
          "rounded-[1.25rem] border border-border",
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
          ref={setTailEl}
          className={cn(
            "absolute size-[22px] rotate-45 rounded-[4px] border-border bg-popover/95",
            bubbleBelow ? "border-l border-t" : "border-r border-b"
          )}
          style={bubbleBelow ? { top: -TAIL, left: tailLeft } : { bottom: -TAIL, left: tailLeft }}
        />
        <div className="relative flex items-start justify-between gap-2">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
          {/* Minimise, not close. The distinction matters enough to spell out in
              the label: a visitor who reads "close" expects the whole thing to go
              away, and then presses it, and then has to ask again. */}
          <button
            type="button"
            onClick={() => setMinimised(true)}
            aria-label="Minimise the answer and keep the highlight"
            title="Minimise"
            className={cn(
              "-mr-1 -mt-1 flex size-6 shrink-0 items-center justify-center rounded-full",
              "text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            )}
          >
            <span aria-hidden className="block h-px w-2.5 bg-current" />
          </button>
        </div>
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
