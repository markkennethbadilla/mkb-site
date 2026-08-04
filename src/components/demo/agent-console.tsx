"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Entity from "@/components/demo/entity";
import EntityOverlay from "@/components/demo/entity-overlay";
import { SUGGESTIONS, isSectionId, sectionById } from "@/lib/site-sections";
import { MOCK_MODE, mockRun, type AgentRun } from "@/components/demo/agent-run.mock";
import { scrollToElement } from "@/lib/smooth-scroll";
import { cn } from "@/lib/utils";

/**
 * The site guide.
 *
 * At rest this is an ordinary-looking card - deliberately. The whole effect
 * depends on a visitor not expecting anything to happen: ask it something and the
 * decorative little shape they had already stopped noticing detaches, takes the
 * page with it to wherever the answer lives, and explains itself from there.
 *
 * The routing is a real tool call. The model picks a section from an allowlist in
 * src/lib/site-sections.ts and the page obeys; it cannot name a section that does
 * not exist, and off-topic questions come back as a decline rather than a guess.
 * The keyword table in agent-run.mock.ts is scaffolding for building the motion
 * offline and is gated off before deploy.
 */

/**
 * `travelling` exists so the arrival is a beat of its own. Without it the scroll,
 * the flight and the speech bubble all fire on the same frame, which reads as a
 * jump-cut - the thing Mark objected to. The bubble now waits for the page to
 * actually get there.
 */
type Phase = "parked" | "thinking" | "outbound" | "perched" | "homebound";

const MAX_QUESTION_CHARS = 200;

export default function AgentConsole() {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("parked");
  const [question, setQuestion] = useState("");
  const [run, setRun] = useState<AgentRun | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const homeRef = useRef<HTMLDivElement>(null);

  const busy = phase !== "parked" && phase !== "perched";
  // While outbound the entity lives in the overlay, so the parked slot must give
  // up its copy - two elements sharing one layoutId is what makes it teleport
  // instead of fly.
  const parkedHere = phase !== "outbound" && phase !== "perched";

  const ask = useCallback(
    async (text: string) => {
      const trimmed = text.trim().slice(0, MAX_QUESTION_CHARS);
      if (!trimmed || phase !== "parked") return;

      setPhase("thinking");
      setError(null);
      setRun(null);

      try {
        const result = MOCK_MODE ? await mockRun(trimmed) : await liveRun(trimmed);
        setRun(result);

        if (!result.section) {
          // Answered in place. Nothing flies anywhere - an off-topic question does
          // not deserve a tour, and sending the page somewhere irrelevant would be
          // worse than saying no.
          setPhase("parked");
          return;
        }
        if (!isSectionId(result.section)) {
          throw new Error(`The agent asked for a section that does not exist: ${result.section}`);
        }

        const el = document.getElementById(result.section);
        if (!el) throw new Error(`Section "${result.section}" is not on this page.`);

        // Order matters. The entity and the spotlight go up FIRST so they are
        // already in flight while the page moves under them; the bubble waits for
        // the scroll to finish, so arriving is a separate beat from travelling.
        setTarget(el);
        setPhase("outbound");
        await scrollToElement(el, { reduced: Boolean(reduced) });
        setPhase("perched");
      } catch (e) {
        // Name the cause. "Something went wrong" here would be especially bad on a
        // site whose argument is that failures should say what failed.
        setError(e instanceof Error ? e.message : String(e));
        setPhase("parked");
      }
    },
    [phase, reduced]
  );

  const dismiss = useCallback(async () => {
    // The return trip is the same journey backwards, and it has to be: an instant
    // snap home after a 1.4s flight out makes the flight feel like a gimmick
    // rather than travel. The entity flies back with the page, then re-parks.
    setPhase("homebound");
    if (homeRef.current) await scrollToElement(homeRef.current, { reduced: Boolean(reduced) });
    setPhase("parked");
    setTarget(null);
    setRun(null);
    setQuestion("");
  }, [reduced]);

  const inPlace = phase === "parked" && run && !run.section;

  return (
    <div
      ref={homeRef}
      className="rounded-xl border border-border bg-card/40 p-5 sm:p-6 md:p-7 flex flex-col gap-4"
    >
      <div className="flex items-start gap-4">
        {/* The entity's home. While parked it reads as a decorative glyph; the
            shared layoutId is what lets it fly from here without us animating a
            path by hand. */}
        <div className="relative size-12 shrink-0">
          {parkedHere && (
            <motion.div
              layoutId="site-guide-entity"
              transition={{ type: "spring", stiffness: 120, damping: 20, mass: 1.1 }}
            >
              <Entity mood={phase === "thinking" ? "thinking" : "idle"} size={48} />
            </motion.div>
          )}
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="text-lg font-bold tracking-tight">Ask about Mark</h3>
          <p className="text-sm text-muted-foreground text-pretty">
            {phase === "thinking"
              ? "Working out where that lives..."
              : "It will take you to the part of the page that answers you."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setQuestion(s);
              ask(s);
            }}
            disabled={busy}
            className={cn(
              "rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground",
              "transition-colors hover:text-foreground hover:border-foreground/40 disabled:opacity-50"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="flex gap-2"
      >
        <input
          id="site-guide-question"
          name="question"
          autoComplete="off"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={MAX_QUESTION_CHARS}
          placeholder="Ask anything about his work"
          disabled={busy}
          className={cn(
            "flex-1 rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-sm",
            "outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          )}
        />
        <button
          type="submit"
          disabled={busy || !question.trim()}
          className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-medium text-background disabled:opacity-50"
        >
          {busy ? "..." : "Ask"}
        </button>
      </form>

      <AnimatePresence>
        {inPlace && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-muted-foreground text-pretty border-l-2 border-border pl-3"
          >
            {run.answer}
          </motion.p>
        )}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-amber-500 text-pretty"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(phase === "outbound" || phase === "perched") && target && run?.section && (
          <EntityOverlay
            target={target}
            stage={phase}
            label={sectionById(run.section).label}
            answer={run.answer}
            onDismiss={dismiss}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The live loop. The Worker returns the same shape the fixture does, so the only
 * difference between mock and real is which of these two functions runs.
 */
async function liveRun(question: string): Promise<AgentRun> {
  const res = await fetch("/api/guide", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "The guide endpoint is not running. Under `next dev` there is no Worker - use `wrangler dev`."
        : `The guide endpoint returned ${res.status}.`
    );
  }
  return (await res.json()) as AgentRun;
}
