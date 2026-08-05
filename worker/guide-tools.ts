/**
 * The guide's toolbox, and the allowlist that bounds it.
 *
 * Three tools, and the model can call nothing else: it decides where the visitor
 * should be looking, says something short about it, or declines.
 *
 * `answer` is here on the second attempt, and the difference is the only part
 * worth remembering. The first version shipped it with no facts behind it, and
 * scripts/probe-guide.mjs caught every free model inventing a biography for Mark -
 * a university he never attended, an employer he never worked for - fluently, with
 * nothing to signal it had gone wrong. The lesson was not "never let it speak". It
 * was that a model with no material will always produce material.
 *
 * So it now has real material (src/lib/public-facts.ts, a closed public-facing
 * set) AND its output is checked before anyone sees it: every proper noun, year
 * and figure in an answer must be licensed by that corpus, or the answer is thrown
 * away and the written section line is used instead. The prompt asks for accuracy;
 * checkGrounding is what makes accuracy the only thing that gets through.
 *
 * `navigate_to_section` also cannot name a section that does not exist: the Zod
 * enum is built from the same SECTION_IDS the page renders, so an invented target
 * is rejected before it reaches the browser rather than scrolling to nowhere.
 *
 * Tools here RECORD the decision; the browser carries it out. The page is the
 * thing that knows whether a section is on screen, and a Worker asserting
 * otherwise would be guessing.
 */

import { tool } from "ai";
import { z } from "zod";
import { SECTION_IDS, type SectionId } from "../src/lib/site-sections";
import { checkGrounding } from "../src/lib/grounding";
import { LICENSED_TERMS } from "../src/lib/public-facts";

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
    navigate_to_section: tool({
      description:
        "Take the visitor to the section of the page that answers their question. Call this FIRST, before answering, whenever the answer is visible somewhere on the page.",
      inputSchema: z.object({
        section: SectionEnum.describe("Which section of the page answers the question."),
      }),
      execute: async (input) => {
        // Validated a second time, by us. The SDK already checked the schema, but
        // the guarantee that nothing outside the allowlist can reach the browser
        // should not depend on the SDK continuing to behave as documented.
        const parsed = z.object({ section: SectionEnum }).safeParse(input);
        if (!parsed.success) {
          return { ok: false, error: "That is not a section of this page." };
        }
        decision.section = parsed.data.section;
        record("navigate_to_section", { section: parsed.data.section });
        return { ok: true, showing: parsed.data.section };
      },
    }),

    answer: tool({
      description:
        "Say the answer in one or two short sentences, using only what you were told about Mark. Call this after navigate_to_section.",
      inputSchema: z.object({
        text: z.string().min(1).max(320).describe("The answer. Plain language, no markdown."),
      }),
      execute: async (input) => {
        const parsed = z.object({ text: z.string().min(1).max(320) }).safeParse(input);
        if (!parsed.success) return { ok: false, error: "The answer was empty or too long." };

        // Em and en dashes are the loudest tell that a machine wrote something.
        // Asking the model not to use them is unreliable; replacing them is not.
        const text = parsed.data.text.replace(/\s*[–—]\s*/g, " - ").trim();

        // The prompt asked for factual; this is what enforces it. Rejected text is
        // never shown - the caller falls back to the written section line, which is
        // always true. The model is told WHY, so a retry has something to work with.
        const verdict = checkGrounding(text, LICENSED_TERMS);
        if (!verdict.grounded) {
          decision.rejected.push({ text, unlicensed: verdict.unlicensed });
          record("answer:rejected", { unlicensed: verdict.unlicensed });
          return {
            ok: false,
            error: `Rejected. These are not in what you were told about Mark: ${verdict.unlicensed.join(", ")}. Say only what the list supports, or say you do not know.`,
          };
        }

        decision.answer = text;
        record("answer", { text });
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
export const ALLOWED_TOOLS = ["navigate_to_section", "answer", "decline"] as const;
