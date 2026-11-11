"use client";

import { animate, scroll } from "motion";
import { useEffect, useRef } from "react";

const TRAVEL = 700;
const FADE_FROM = 480;
const FADE_TO = 700;

export function Fly({ gap }: { gap: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>(".lb");
    if (!root || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stops = Array.from(root.querySelectorAll<HTMLElement>(".lb-layer")).map((el) => {
      const z0 = -gap * Number(el.dataset.i);
      const a = Math.min(0.82, (FADE_FROM - z0) / TRAVEL);
      const b = Math.min(1, (FADE_TO - z0) / TRAVEL);
      return scroll(
        animate(
          el,
          { transform: [`translateZ(${z0}px)`, `translateZ(${z0 + TRAVEL}px)`], opacity: [1, 1, 0, 0] },
          { ease: "linear", opacity: { times: [0, a, b, 1], ease: "linear" } },
        ),
        { target: root, offset: ["start start", "end end"] },
      );
    });
    return () => stops.forEach((stop) => stop());
  }, [gap]);

  return <span ref={ref} hidden />;
}
