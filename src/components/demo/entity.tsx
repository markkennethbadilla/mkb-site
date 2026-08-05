"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * The agent's body.
 *
 * Hand-authored rather than a marketplace character, for three reasons that all
 * turned out to be the same reason: it has to MORPH into an ordinary card when it
 * parks, it has to re-tint with --tint-hue like everything else on this site, and
 * a portfolio built to win work should not carry someone else's attribution
 * credit. A .riv file fails all three, and costs a wasm runtime besides.
 *
 * Deliberately not a person and not an animal - a small drifting wisp. Anything
 * human-shaped on a personal site reads as "is that meant to be him?", and a
 * literal animal dates badly.
 */

/**
 * "dormant" is what the entity looks like inside an exhibition room, where it is a
 * back button and nothing else. It does not bob and does not blink, because a
 * creature that blinks at you is a creature that is listening, and in a room it is
 * not - there is no guide there to answer. Implying otherwise is the small lie this
 * site keeps refusing to tell.
 */
export type EntityMood = "idle" | "thinking" | "talking" | "dormant";

const BLINK_EVERY_MS = 4200;

export default function Entity({
  mood = "idle",
  size = 72,
  className,
}: {
  mood?: EntityMood;
  size?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const [blinking, setBlinking] = useState(false);

  // Blinking is what separates "a shape" from "a creature", and it is the one
  // piece of motion that should survive reduced-motion: it conveys state rather
  // than decorating, and it moves nothing across the screen.
  useEffect(() => {
    if (mood === "dormant") return;
    let timeout: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timeout = setTimeout(() => {
        setBlinking(true);
        setTimeout(() => setBlinking(false), 130);
        schedule();
      }, BLINK_EVERY_MS + (mood === "thinking" ? 0 : 900));
    };
    schedule();
    return () => clearTimeout(timeout);
  }, [mood]);

  const bob = reduced || mood === "dormant"
    ? {}
    : {
        y: mood === "thinking" ? [0, -3, 0] : [0, -6, 0],
        rotate: mood === "thinking" ? [0, 0, 0] : [-1.5, 1.5, -1.5],
      };

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label="The site guide"
      className={className}
      animate={bob}
      transition={{ duration: mood === "thinking" ? 1.4 : 3.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <radialGradient id="entity-body" cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor="oklch(0.78 0.13 var(--tint-hue))" />
          <stop offset="60%" stopColor="oklch(0.62 0.12 var(--tint-hue))" />
          <stop offset="100%" stopColor="oklch(0.44 0.10 var(--tint-hue))" />
        </radialGradient>
        <filter id="entity-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ground shadow. Sells "hovering" far more cheaply than any amount of
          movement does - without it the creature reads as stuck to the page.
          Always rendered, never gated on `reduced`: useReducedMotion resolves
          only on the client, so branching the TREE on it makes the server and
          client markup disagree and React throws away the whole subtree. Gate
          the ANIMATION, never the element. */}
      <motion.ellipse
        cx="50"
        cy="90"
        rx="20"
        ry="4"
        fill="oklch(0.5 0.05 var(--tint-hue))"
        initial={{ opacity: 0.22, rx: 20 }}
        animate={reduced ? { opacity: 0.18, rx: 18 } : { opacity: [0.22, 0.12, 0.22], rx: [20, 16, 20] }}
        transition={{ duration: 3.6, repeat: reduced ? 0 : Infinity, ease: "easeInOut" }}
      />

      {/* Antenna, with the state light on the end. This is the honest status
          indicator: it pulses only while the model is actually working. */}
      <path
        d="M50 26 C 50 18, 58 16, 60 10"
        stroke="oklch(0.55 0.10 var(--tint-hue))"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <motion.circle
        cx="60"
        cy="9"
        r="4"
        fill="oklch(0.82 0.16 var(--tint-hue))"
        filter="url(#entity-glow)"
        initial={{ opacity: 0.9, r: 4 }}
        animate={
          reduced || mood !== "thinking"
            ? { opacity: 0.9 }
            : { opacity: [0.35, 1, 0.35], r: [3.4, 4.6, 3.4] }
        }
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Body: a squircle rather than a circle, so it shares a silhouette with
          the rounded cards it morphs out of and back into. */}
      <path
        d="M50 24
           C 74 24, 84 38, 84 56
           C 84 74, 70 84, 50 84
           C 30 84, 16 74, 16 56
           C 16 38, 26 24, 50 24 Z"
        fill="url(#entity-body)"
      />

      {/* A single soft highlight. Two would read as plastic. */}
      <ellipse cx="36" cy="40" rx="9" ry="6.5" fill="oklch(0.98 0.02 var(--tint-hue))" opacity="0.28" />

      <g>
        {(["38", "62"] as const).map((cx) => (
          <g key={cx}>
            <motion.ellipse
              cx={cx}
              cy="56"
              rx="6.5"
              ry="8"
              fill="oklch(0.16 0.02 var(--tint-hue))"
              initial={{ ry: 8 }}
              animate={{ ry: blinking ? 0.7 : 8 }}
              transition={{ duration: 0.09, ease: "easeOut" }}
            />
            {!blinking && (
              <circle cx={Number(cx) + 2.2} cy="52.5" r="2.1" fill="oklch(0.99 0.01 var(--tint-hue))" opacity="0.92" />
            )}
          </g>
        ))}
      </g>

      {/* Mouth. Only appears while it is actually saying something, so the idle
          state stays calm instead of permanently grinning. */}
      {mood === "talking" && (
        <motion.path
          d="M43 69 Q 50 75, 57 69"
          stroke="oklch(0.16 0.02 var(--tint-hue))"
          strokeWidth="2.6"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.85 }}
          transition={{ duration: 0.26 }}
        />
      )}
    </motion.svg>
  );
}
