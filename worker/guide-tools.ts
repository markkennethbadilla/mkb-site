/**
 * The guide's toolbox, and the allowlist that bounds it.
 *
 * TWO tools: say something, or decline. That is a deliberate collapse from three.
 *
 * WHY ONE TOOL INSTEAD OF navigate-THEN-answer. Measured against the live site,
 * every uncached answer cost two SEQUENTIAL model round trips, and each round trip
 * from Cloudflare to the inference endpoint is 3 to 6 seconds. The round-trip
 * count, not the model, was the dominant latency. Folding the destination and the
 * words into one call makes an answer structurally one round trip rather than
 * hopefully one - relying on a model to emit two tool calls in a single turn is a
 * hope, and weak models do not.
 *
 * Nothing about the guarantees changed. `section` is still a Zod enum built from
 * the same SECTION_IDS the page renders, so an invented destination is refused
 * before it reaches the browser. `text` still goes through checkGrounding, so a
 * claim the fact corpus does not license is still discarded rather than shown.
 * `section` is now optional, which is what lets the guide answer in place when no
 * part of the page holds the answer.
 *
 * The grounding check is here at all because the first version of this guide had
 * an answer tool with no facts behind it, and scripts/probe-guide.mjs caught every
 * free model inventing a biography for Mark - a university he never attended, an
 * employer he never worked for. The lesson was not "never let it speak". It was
 * that a model with no material will always produce material.
 *
 * Tools RECORD the decision; the browser carries it out. The page is the thing
 * that knows whether a section is on screen, and a Worker asserting otherwise
 * would be guessing.
 */

import { tool } from "ai";
import { z } from "zod";
import { SECTION_IDS, type SectionId } from "../src/lib/site-sections";
import { checkGrounding } from "../src/lib/grounding";
import { LICENCE } from "../src/lib/public-facts";

export type GuideDecision = {
  section: SectionId | null;
  /** Only ever set to text that passed the grounding check. */
  answer: string | null;
  declined: boolean;
  steps: { tool: string; args: Record<string, unknown> }[];
  /** Answers the grounding check threw out, kept for telemetry. */
  rejected: { text: string; unlicensed: string[] }[];
};

const SectionEnum = z.enum(SECTION_IDS as [SectionId, ...SectionId[]]);

/**
 * Builds a fresh toolbox bound to one request's decision record. Per-request
 * rather than module-level because a Worker isolate serves many requests and a
 * shared mutable record would leak one visitor's run into another's.
 */
export function buildToolbox(decision: GuideDecision) {
  const record = (name: string, args: Record<string, unknown>) => {
    decision.steps.push({ tool: name, args });
  };

  return {
    respond: tool({
      description:
        "Answer the visitor. Give `text` always. Give `section` as well when a section of the page shows the answer, and omit it when none does - questions about his pets, what he watches or his favourite colour have no section, so answer those without one. This is the only way to say anything to the visitor; plain text replies are discarded.",
      inputSchema: z.object({
        section: SectionEnum.nullish().describe(
          "The section of the page that shows the answer, or null when none does."
        ),
        text: z.string().min(1).max(320).describe("The answer. One or two short sentences, no markdown."),
      }),
      execute: async (input) => {
        const parsed = z
          .object({ section: SectionEnum.nullish(), text: z.string().min(1).max(320) })
          .safeParse(input);
        if (!parsed.success) {
          return { ok: false, error: "The answer was empty, too long, or named a section that does not exist." };
        }

        // Em and en dashes are the loudest tell that a machine wrote something.
        // Asking the model not to use them is unreliable; replacing them is not.
        // Written as escapes, not as the characters, so the repo-wide grep that
        // bans them does not trip over the one line that removes them.
        const text = parsed.data.text.replace(/\s*[\u2013\u2014]\s*/g, " - ").trim();

        // The prompt asked for factual; this is what enforces it. Rejected text is
        // never shown - the caller falls back to the written section line, which is
        // always true.
        const verdict = checkGrounding(text, LICENCE);
        if (!verdict.grounded) {
          decision.rejected.push({ text, unlicensed: verdict.unlicensed });
          record("respond:rejected", { unlicensed: verdict.unlicensed });
          return {
            ok: false,
            error: `Rejected. These are not in what you were told about Mark: ${verdict.unlicensed.join(", ")}.`,
          };
        }

        if (parsed.data.section) decision.section = parsed.data.section;
        decision.answer = text;
        record("respond", { section: parsed.data.section ?? null, text });
        return { ok: true };
      },
    }),

    decline: tool({
      description:
        "Use this when the question is not about Mark, his work, or this page. Do not guess and do not answer from general knowledge.",
      inputSchema: z.object({
        reason: z.string().max(120).describe("Why this is outside what you know."),
      }),
      execute: async (input) => {
        const parsed = z.object({ reason: z.string().max(120) }).safeParse(input);
        decision.declined = true;
        record("decline", { reason: parsed.success ? parsed.data.reason : "off-topic" });
        return { ok: true };
      },
    }),
  };
}

/** The names the model is permitted to call. Anything else is a bug or an attack. */
export const ALLOWED_TOOLS = ["respond", "decline"] as const;
