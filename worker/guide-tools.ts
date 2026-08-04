/**
 * The guide's toolbox, and the allowlist that bounds it.
 *
 * TWO tools, and the model can call nothing else. It decides WHERE the visitor
 * should be looking. It does not get to say anything.
 *
 * There was a third tool, `answer`, and removing it is the most important decision
 * in this file. scripts/probe-guide.mjs asked four free models where Mark went to
 * school; they routed to the education section correctly and then narrated
 * "Computer Science at the University of the Philippines Diliman" and "Staff
 * Engineer at Vercel". Both invented. The models were never given any facts about
 * him - only section summaries - so they supplied their own, fluently.
 *
 * A stricter prompt does not fix that, because a prompt is a request. Deleting the
 * tool does: the arrival copy is now written prose in site-sections.ts, and the
 * page itself is what answers the question. What remains is still a genuine agent
 * - choosing a destination from free text is the part that actually needed a model
 * - it just cannot fabricate a biography while doing it.
 *
 * `navigate_to_section` also cannot name a section that does not exist: the Zod
 * enum is built from the same SECTION_IDS the page renders, so an invented target
 * is rejected before it reaches the browser rather than scrolling to nowhere.
 *
 * Tools here RECORD the decision; the browser carries it out. The page is the thing
 * that knows whether a section is on screen, and a Worker asserting otherwise
 * would be guessing.
 */

import { tool } from "ai";
import { z } from "zod";
import { SECTION_IDS, type SectionId } from "../src/lib/site-sections";

export type GuideDecision = {
  section: SectionId | null;
  declined: boolean;
  steps: { tool: string; args: Record<string, unknown> }[];
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
export const ALLOWED_TOOLS = ["navigate_to_section", "decline"] as const;
