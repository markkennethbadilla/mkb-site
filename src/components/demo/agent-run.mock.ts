/**
 * Mock runs, for building the choreography without burning inference on every
 * reload. Same shape the Worker returns, so swapping to the real endpoint is one
 * line in agent-console.tsx and tsc proves the shape still matches.
 *
 * This file is the ONLY place in the agent that maps a question to a section, and
 * it exists purely so the animation can be worked on offline. Nothing here ships
 * as behaviour: in production the model chooses the section by calling a tool, and
 * a keyword table pretending to be an agent is exactly the dishonesty this site
 * argues against. MOCK_MODE must be false when it deploys - a gate checks it.
 */

import { sectionById, type SectionId } from "@/lib/site-sections";

/**
 * OFF. The live loop at /api/guide is wired; this fixture exists only so the
 * choreography can be worked on without a Worker running. Flipping it back on for
 * a deploy is what the gate refuses.
 */
export const MOCK_MODE = false;

export type AgentRun = {
  /** Where the answer lives. Null means the agent stayed put and answered in place. */
  section: SectionId | null;
  /** What it says, in the bubble or in the console. */
  answer: string;
  /** True when the question was outside what it knows about. */
  declined: boolean;
  /** Telemetry. Null model means nothing ran - see `degraded` for why. */
  model: string | null;
  ms: number;
  steps: { tool: string; args: Record<string, unknown> }[];
  /** Present only when the guide could not run: "no-key", "all-models-failed", etc. */
  degraded?: string;
  /** True when the answer came from the similarity cache and no model was called. */
  cached?: boolean;
  /** True when the model's own words passed the grounding check. */
  grounded?: boolean;
};

/**
 * Routing only. The arrival copy comes from SECTIONS[].bubble - the same written
 * lines the Worker returns - so the fixture cannot drift from production, and
 * neither of them can invent a fact about Mark.
 */
const RUNS: { match: RegExp; section: SectionId }[] = [
  { match: /school|stud(y|ied)|univers|college|degree|educat/i, section: "education" },
  { match: /now|current|working on|these days|latest role|job/i, section: "work" },
  { match: /project|repo|github|source|built|shipped/i, section: "projects" },
  { match: /build|know how|stack|tech|skill|language/i, section: "skills" },
  { match: /contact|reach|email|hire|touch|talk to/i, section: "contact" },
];

const OFF_TOPIC =
  "I only know about Mark and this page. Ask me about his work, his stack, where he studied, or how to reach him.";

/** Resolves after a plausible delay so the thinking state is actually visible. */
export function mockRun(question: string): Promise<AgentRun> {
  const hit = RUNS.find((r) => r.match.test(question));
  const run: AgentRun = hit
    ? {
        section: hit.section,
        answer: sectionById(hit.section).bubble,
        declined: false,
        steps: [{ tool: "navigate_to_section", args: { section: hit.section } }],
        model: "mock/offline-fixture",
        ms: 820,
      }
    : {
        section: null,
        answer: OFF_TOPIC,
        declined: true,
        steps: [{ tool: "decline", args: { reason: "off-topic" } }],
        model: "mock/offline-fixture",
        ms: 820,
      };
  return new Promise((resolve) => setTimeout(() => resolve(run), 820));
}
