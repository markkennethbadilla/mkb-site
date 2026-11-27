// Guide decision step: a System One decision model (Clef-flash on Workers AI) picks the fact and section that answer a question, so the LLM runs only when the page has no answer. Prior-art: @typesafe-ai/sdk and the Jev API -> Clef-flash speaks the same System One format through the Workers AI binding, about 13x faster than Jev and cheaper ($0.038/M input, output free).
// BUDGET-CAP: cloudflare/iammkb2002-workers-deploy Workers AI daily free allocation (10k neurons); one call per uncached question, bounded by the guide's daily call ceiling
// BUDGET-ALERT: ops-alert
import { PUBLIC_FACTS } from "../src/lib/public-facts";
import { SECTIONS, type SectionId } from "../src/lib/site-sections";

export const DECIDE_MODEL = "@cf/cloudflare/clef-flash";
// Tuned on scripts/bench-decide.mjs: below these, the question goes to the LLM rather than a guessed fact.
const FACT_MIN = 0.25;
const SECTION_MIN = 0.5;
const ABOUT_MIN = 0.5;
// Where on the page each shown fact lives, used when the model names no section; facts absent here answer in place.
const FACT_SECTION: Record<string, SectionId> = { identity: "hero", "what-he-does": "about", "current-role": "work", "previous-role": "work", education: "education", certifications: "education", stack: "skills", contact: "contact", "demo-rooms": "projects", "this-site": "projects" };

export type Decision =
  | { kind: "answer"; factId: string; answer: string; section: SectionId | null; debug: unknown }
  | { kind: "decline"; debug: unknown }
  | { kind: "llm"; debug: unknown };

type Choice = { choice: string; probabilities: Record<string, number> };
export type Answers = { fact: Choice; section: Choice; about: { noul: number } };
export type RunDecision = (input: Record<string, unknown>) => Promise<{ answers: Answers }>;

const QUESTIONS = {
  fact: {
    type: "choice",
    instructions: "Which fact, if any, directly answers this visitor's question about Mark?",
    criteria: { ...Object.fromEntries(PUBLIC_FACTS.map((f) => [f.id, f.text])), none: "None of these facts answers the question." },
  },
  section: {
    type: "choice",
    instructions: "Which section of Mark's page shows the answer to this question?",
    criteria: { ...Object.fromEntries(SECTIONS.map((s) => [s.id, s.summary])), none: "No section of the page shows this." },
  },
  about: { type: "noul", instructions: "This question is about Mark Kenneth Badilla, his work, his life, or this website." },
};

export function judge(a: Answers): Decision {
  const debug = { fact: a.fact.choice, fp: a.fact.probabilities[a.fact.choice], section: a.section.choice, about: a.about.noul };
  if (a.about.noul < ABOUT_MIN) return { kind: "decline", debug };
  const fact = PUBLIC_FACTS.find((f) => f.id === a.fact.choice);
  if (!fact || (a.fact.probabilities[fact.id] ?? 0) < FACT_MIN) return { kind: "llm", debug };
  const s = a.section.choice;
  const section = s !== "none" && (a.section.probabilities[s] ?? 0) >= SECTION_MIN ? (s as SectionId) : (FACT_SECTION[fact.id] ?? null);
  return { kind: "answer", factId: fact.id, answer: fact.text, section, debug };
}

export async function decide(run: RunDecision, question: string): Promise<Decision> {
  const { answers } = await run({
    model: "clef-flash",
    state: { site: "Mark Kenneth Badilla's personal portfolio site; 'he' means Mark", visitor_question: question },
    questions: QUESTIONS,
  });
  return judge(answers);
}
