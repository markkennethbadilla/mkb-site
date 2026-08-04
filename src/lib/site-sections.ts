/**
 * The only places on this page the agent is allowed to send a visitor.
 *
 * This is an allowlist, not a lookup table. The model chooses which section
 * answers a question; it cannot invent one, and it cannot point at a part of the
 * page that does not exist. If it names something outside this set the tool call
 * is refused before anything moves.
 *
 * `summary` is what the model is told the section contains. It is deliberately
 * thin - enough to route a question, never enough to answer from. The answer has
 * to come from the section the visitor is then looking at, which is what stops
 * the thing being a bot that recites a bio.
 */

export type SectionId =
  | "hero"
  | "about"
  | "work"
  | "education"
  | "skills"
  | "harness"
  | "contact";

export type SiteSection = {
  id: SectionId;
  /** Human label used in the entity's speech bubble and the highlight chip. */
  label: string;
  summary: string;
  /**
   * What the guide says on arrival. WRITTEN, not generated.
   *
   * This exists because of a real failure, caught by scripts/probe-guide.mjs before
   * any of this shipped: given an `answer` tool and only these summaries to go on,
   * every free model happily invented biography - "Computer Science at the
   * University of the Philippines Diliman", "Staff Engineer at Vercel". Neither is
   * true. The model had no facts, so it produced plausible ones.
   *
   * The fix is not a firmer prompt. It is removing the model's ability to assert
   * anything: it chooses WHERE to go, and the page itself is what answers. So every
   * line below points rather than states - it stays true even when resume.tsx
   * changes, and there is nothing here that can drift out of sync with what the
   * visitor is looking at.
   */
  bubble: string;
};

export const SECTIONS: SiteSection[] = [
  {
    id: "hero",
    label: "Introduction",
    summary: "Who he is in one line, and how he describes himself.",
    bubble: "This is how he introduces himself, in his own words.",
  },
  {
    id: "about",
    label: "About",
    summary: "The longer description of what he does and how he works.",
    bubble: "The longer version is right here - what he does, and how he goes about it.",
  },
  {
    id: "work",
    label: "Work experience",
    summary:
      "Every role he has held, with employer, title, dates and what he actually built there.",
    bubble:
      "Every role he has held is here, most recent first. Open one to see what he actually built there.",
  },
  {
    id: "education",
    label: "Education",
    summary: "Where he studied, what degree, and the years he was there.",
    bubble: "Here is where he studied - the school, the degree and the years are all on the card.",
  },
  {
    id: "skills",
    label: "Skills",
    summary: "The languages, frameworks and infrastructure he works in.",
    bubble:
      "This is the honest list: what he actually works in, not everything he has ever touched.",
  },
  {
    id: "harness",
    label: "The gate harness",
    summary:
      "A live demo where a model is asked for a dangerous change and deterministic gates block it.",
    bubble:
      "You can run this one yourself. Ask it for something dangerous and watch the gates refuse - it is live, not a recording.",
  },
  {
    id: "contact",
    label: "Contact",
    summary: "How to get in touch with him.",
    bubble: "Right here. He reads everything that arrives.",
  },
];

export const SECTION_IDS = SECTIONS.map((s) => s.id) as SectionId[];

export function isSectionId(value: unknown): value is SectionId {
  return typeof value === "string" && (SECTION_IDS as string[]).includes(value);
}

export function sectionById(id: SectionId): SiteSection {
  const found = SECTIONS.find((s) => s.id === id);
  // Unreachable while callers guard with isSectionId first, but a thrown error
  // beats a silently wrong scroll target.
  if (!found) throw new Error(`No such section: ${id}`);
  return found;
}

/**
 * Questions the agent will answer, offered as chips so a visitor never has to
 * guess what it is for. Each one is answerable from a real section - none of them
 * invite it to speculate.
 */
export const SUGGESTIONS: string[] = [
  "Where did he go to school?",
  "What is he working on right now?",
  "Has he shipped anything with LLMs in production?",
  "What does he actually know how to build?",
  "How do I get in touch?",
];

/**
 * What the agent says when a question is not about Mark or this site.
 *
 * Refusal is a routing decision, not a moral one: this thing knows about one
 * person and one page, and pretending otherwise is how a portfolio bot ends up
 * confidently wrong about something a visitor can check.
 */
/**
 * The guide's system prompt, derived from the section list above so the two can
 * never disagree about what the page contains.
 *
 * It lives here rather than in the Worker for a second reason: this module has no
 * imports of its own, so scripts/probe-guide.mjs can load it directly under Node
 * and test the prompt that actually ships. A probe holding its own copy of the
 * prompt passes forever while production drifts away from it.
 *
 * Note what the prompt does NOT do: it does not ask the model to be truthful about
 * Mark. It cannot be truthful - it has been told no facts about him. The prompt
 * says so plainly, and the toolbox makes it structural by giving the model no way
 * to assert anything at all.
 */
export const GUIDE_SYSTEM_PROMPT = `You are a guide embedded in Mark Kenneth Badilla's personal site. You take visitors to the part of the page that answers their question.

The page has exactly these sections:
${SECTIONS.map((s) => `- ${s.id}: ${s.summary}`).join("\n")}

Your ONLY job is to choose which of those sections the visitor should be looking at, and to call navigate_to_section with it. The page itself answers the question; you do not.

How to behave:
- If one of those sections answers the question, call navigate_to_section with it. That is the whole response.
- If the question is not about Mark, his work, or this page, call decline instead. That includes general knowledge, current events, coding help, and anything about you.
- Do not write prose. Do not state any fact about Mark. You have not been told any, so anything you produce would be a guess the visitor can immediately see is wrong.
- You have no other tools and no other abilities. Do not claim otherwise.`;

export const OFF_TOPIC_REPLY =
  "I only know about Mark and this page. Ask me about his work, his stack, where he studied, or how to reach him.";
