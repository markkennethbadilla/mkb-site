/**
 * Everything the guide is allowed to know about Mark.
 *
 * This exists because the first version had no facts and invented them - a
 * university he never attended, an employer he never worked for. Giving it real
 * material is the fix; this is that material, and it is a CLOSED set. Nothing the
 * guide says should be traceable to anywhere but here or the page itself.
 *
 * Every line is public-facing by design. What is deliberately absent, and why:
 *
 * - **Age and date of birth.** He is targeting senior and lead roles at 1.5 years
 *   of experience. An age on the page hands a screener a reason to filter before
 *   reading the work, and in most of his target markets an employer cannot ask for
 *   it - volunteering it gives that protection away for nothing.
 * - **Phone number and home address.** A public page is a spam surface; LinkedIn
 *   and email are the channels he actually wants used.
 * - **Health, family and finances.** Never, in any channel.
 * - **Employer internals.** No system names, no spend figures, no client data, no
 *   headcount. His contract covers proprietary and operational information, and
 *   describing role and stack is normal practice while naming internal systems is
 *   not. Whether the site may name them at all is an open question he has not
 *   settled; until he does, the safe default holds.
 * - **The Hatchit ERP metrics.** They appear on his resume but have no repo,
 *   commit or dated document behind them, unlike everything else he claims. A bot
 *   asserting them on his behalf turns a recollection into a published figure.
 *
 * `terms` is the load-bearing field. It licenses the specific proper nouns, years
 * and numbers each fact permits, and src/lib/grounding.ts refuses any answer that
 * introduces one not licensed here. That is what makes this a control rather than
 * a suggestion: the prompt asks the model to stay factual, the grounding check
 * makes staying factual the only thing that reaches the visitor.
 */

export type PublicFact = {
  id: string;
  /** Stated plainly, as the guide might say it. */
  text: string;
  /** Proper nouns, years and figures this fact licenses an answer to use. */
  terms: string[];
};

export const PUBLIC_FACTS: PublicFact[] = [
  {
    id: "identity",
    text: "His name is Mark Kenneth Badilla and he works as an AI Engineer.",
    terms: ["Mark", "Kenneth", "Badilla", "AI", "Engineer"],
  },
  {
    id: "current-role",
    text: "He has been an AI Engineer at WeAssist since March 2026. It is a full-time remote role.",
    terms: ["WeAssist", "March", "2026", "AI", "Engineer"],
  },
  {
    id: "previous-role",
    text: "Before that he was at Hatchit Solutions, from January 2025 to April 2026, working on core systems for a multi-tenant ERP platform. He started there as a Web Engineer Intern and became a Software Engineer.",
    terms: ["Hatchit", "Solutions", "January", "2025", "April", "2026", "ERP", "Web", "Engineer", "Intern", "Software"],
  },
  {
    id: "what-he-does",
    text: "His speciality is agentic engineering: building the harness around LLM agents - gated codebases, deterministic guardrails and verification - so an agent can ship production code without breaking things. He describes the interesting problem as not getting an LLM to write code, but building the system where the code it writes can be trusted.",
    terms: ["LLM", "AI"],
  },
  {
    id: "education",
    text: "He studied BS Information Technology at Cebu Institute of Technology from 2021 to 2025, and graduated Magna Cum Laude.",
    terms: ["BS", "Information", "Technology", "Cebu", "Institute", "Technology", "University", "2021", "2025", "Magna", "Cum", "Laude"],
  },
  {
    id: "certifications",
    text: "He holds TOPCIT Level 3 and PhilNITS FE certifications.",
    terms: ["TOPCIT", "Level", "3", "PhilNITS", "FE"],
  },
  {
    id: "stack",
    text: "He works in TypeScript, Node.js, Bun, Python, PostgreSQL, Redis, Docker, Next.js and React, plus LLM tooling and MCP.",
    terms: ["TypeScript", "Node.js", "Node", "Bun", "Python", "PostgreSQL", "Postgres", "Redis", "Docker", "Next.js", "Next", "React", "LLM", "MCP", "Drizzle"],
  },
  {
    id: "infrastructure",
    text: "He runs self-hosted infrastructure with zero-downtime deploys, and rehearses recovery in live outage drills rather than only diagramming it.",
    terms: [],
  },
  {
    id: "location",
    text: "He is based in Cebu City, Philippines, and works remotely. His timezone is APAC.",
    terms: ["Cebu", "City", "Philippines", "APAC"],
  },
  {
    id: "availability",
    text: "He is open to remote roles, and happy to talk about agent harnesses, gated codebases, or anything you are trying to make impossible to get wrong.",
    terms: [],
  },
  {
    id: "contact",
    text: "The best ways to reach him are LinkedIn and email; both are in the contact section of this page.",
    terms: ["LinkedIn"],
  },
  {
    id: "colour",
    text: "His favourite colour is green - it is why this whole site is tinted the way it is.",
    terms: ["green"],
  },
  // The mundane ones earn their place: a guide that can only recite a resume reads
  // like a resume. These are the answers that make it feel like there is a person
  // on the other end, and none of them is anything he would mind a stranger knowing.
  {
    id: "pets",
    text: "He has two cats and two chickens.",
    terms: [],
  },
  {
    id: "anime",
    text: "He likes anime, and is usually drawn to series and films with a good soundtrack - the music is often what pulls him into something.",
    terms: ["OST", "OSTs"],
  },
  {
    id: "this-site",
    text: "This site is built with Next.js as a static export, deployed on Cloudflare Workers, and he wrote the guide you are talking to.",
    terms: ["Next.js", "Next", "Cloudflare", "Workers"],
  },
];

/** The corpus as the model sees it. */
export const FACTS_BRIEF = PUBLIC_FACTS.map((f) => `- ${f.text}`).join("\n");

/** Every term any answer is licensed to use, lowercased. */
export const LICENSED_TERMS = new Set(
  PUBLIC_FACTS.flatMap((f) => f.terms).map((t) => t.toLowerCase())
);
