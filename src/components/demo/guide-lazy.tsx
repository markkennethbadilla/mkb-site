"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { SUGGESTIONS } from "@/lib/site-sections";

/**
 * The site guide, loaded on first intent rather than on page load (2026-10-24).
 *
 * AgentConsole brings the motion library, the entity overlay and the smooth
 * scroller, which held the homepage's main thread for seconds on a mid phone and
 * kept mobile speed under its floor. Until a visitor points at, touches or tabs
 * into the guide, this renders the same card as plain markup; the first intent
 * imports the real console (next/dynamic, the maintained route) and hands focus
 * to its input, so nobody types into a dead box.
 */
const AgentConsole = dynamic(() => import("@/components/demo/agent-console"), { ssr: false });

export default function GuideLazy() {
  const [live, setLive] = useState(false);
  const wantFocus = useRef(false);

  useEffect(() => {
    if (!live || !wantFocus.current) return;
    const t = setInterval(() => {
      const el = document.getElementById("site-guide-question");
      if (el) {
        el.focus();
        clearInterval(t);
      }
    }, 50);
    return () => clearInterval(t);
  }, [live]);

  if (live) return <AgentConsole />;

  const wake = (focus: boolean) => () => {
    wantFocus.current = wantFocus.current || focus;
    setLive(true);
  };

  return (
    <div
      onPointerEnter={wake(false)}
      onTouchStart={wake(false)}
      onFocusCapture={wake(true)}
      className="flex flex-col gap-4 rounded-2xl border border-border p-5"
    >
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Live agent, built for this site
        </span>
        <h2 className="text-lg font-bold tracking-tight">Ask about Mark</h2>
        <p className="text-sm text-muted-foreground">
          Ask it something, and if the answer is on the page it will take you to it.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          aria-label="Ask anything about his work"
          placeholder="Ask anything about his work"
          className="flex-1 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-sm outline-none"
        />
        <button type="button" className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background opacity-50">
          Ask
        </button>
      </div>
    </div>
  );
}
