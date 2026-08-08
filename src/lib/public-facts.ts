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
 * - **Age and date of birth.** An age on a portfolio invites a judgement about the
 *   work that has nothing to do with the work, and in most markets an employer
 *   cannot ask for it at all - volunteering it gives that protection away for
 *   nothing and buys the reader no information they can use.
 * - **Phone number and home address.** A public page is a spam surface; LinkedIn
 *   and email are the channels he actually wants used.
 * - **Health, family and finances.** Never, in any channel.
 * - **Employer internals.** No system names, no client names, no hostnames, no
 *   hosting-provider names, no spend or savings figures, no churn figures, no
 *   headcount, and no schema census - a table count and a migration count describe
 *   a Company database as surely as its name does. The capability facts below
 *   describe what he can build and how he works; none of them names or counts a
 *   thing the Company owns. His contract covers proprietary and operational
 *   information, and describing capability and architecture is normal practice
 *   while inventorying an employer's estate is not.
 * - **Security incidents.** Nothing about an incident at a named employer, in any
 *   form. The site names where he works and says he runs production there, so
 *   "he did production incident response" identifies the breached party by
 *   construction and the role window dates it. The two things that are actually
 *   his credential - reconstructing an app from a compiled build, and converting a
 *   lesson into a gate - are stated separately and never next to each other.
 * - **The Hatchit ERP metrics.** They appear on his resume but have no repo,
 *   commit or dated document behind them, unlike everything else he claims. A bot
 *   asserting them on his behalf turns a recollection into a published figure.
 *
 * `terms` and `figures` are the load-bearing fields, and they work differently.
 *
 * `terms` licenses proper nouns, pooled across every fact, which is safe because a
 * name is self-describing: "Vercel" is either in the corpus or it is not.
 *
 * `figures` licenses numbers, and each one is bound to the words that must sit
 * beside it. A pooled number is not safe. "66" is real, and "he ran 66 live
 * failover drills" is a fabrication; the digits alone cannot tell the difference,
 * so the licence carries the context. Pick the companions from what the figure
 * MEASURES - `seconds`, `checks`, `weeks` - never from other words in the same
 * sentence, or the binding licenses the fabrication it was added to stop.
 */

export type PublicFact = {
  id: string;
  /** Stated plainly, as the guide might say it. */
  text: string;
  /** Proper nouns this fact licenses an answer to use. */
  terms: string[];
  /**
   * Figures this fact licenses, each with the words that must appear within ten
   * words of it. See src/lib/grounding.ts for why a bare list would not do.
   */
  figures?: { value: string; near: string[] }[];
};

export const PUBLIC_FACTS: PublicFact[] = [
  {
    id: "identity",
    // serena-cannot: Serena holds driftwood as its active root, so this path is outside it
    text: "His name is Mark Kenneth Badilla and he works as a Full Stack AI Engineer. Hand him a goal instead of a spec and he comes back with the diagnosis, the recommendation and the system.",
    terms: ["Mark", "Kenneth", "Badilla", "Full", "Stack", "AI", "Engineer"],
  },
  {
    id: "current-role",
    text: "He has been an AI Engineer at WeAssist since March 2026. It is a full-time remote role.",
    terms: ["WeAssist", "March", "2026", "AI", "Engineer"],
    figures: [{ value: "2026", near: ["weassist", "march", "since", "joined", "role"] }],
  },
  {
    id: "previous-role",
    text: "Before that he was at Hatchit Solutions, from January 2025 to April 2026, working on core systems for a multi-tenant ERP platform. He started there as a Web Engineer Intern and became a Software Engineer.",
    terms: ["Hatchit", "Solutions", "January", "2025", "April", "2026", "ERP", "Web", "Engineer", "Intern", "Software"],
    figures: [
      { value: "2025", near: ["hatchit", "january", "solutions", "started", "joined"] },
      { value: "2026", near: ["hatchit", "april", "solutions", "until", "left"] },
    ],
  },
  {
    id: "what-he-does",
    text: "He builds AI systems end to end, from the conversational interface down to the database, plus the integrations either side. What makes that his speciality rather than ordinary full-stack work is the harness he puts around it, meaning gated codebases, deterministic guardrails and verification, so an agent can ship production code without breaking things. He describes the interesting problem as not getting an LLM to write code, but building the system where the code it writes can be trusted.",
    terms: ["LLM", "AI"],
  },
  {
    id: "education",
    // "school" and "university" are in the text on purpose. Nobody asks "where did
    // he pursue tertiary education" - they ask where he went to school, and a
    // corpus that never uses the word people use is a corpus the model has to
    // bridge on its own. The build gate enforces this: every suggestion chip must
    // share a word with the corpus.
    text: "He went to school at Cebu Institute of Technology - University, where he studied BS Information Technology from 2021 to 2025 and graduated Magna Cum Laude.",
    terms: ["BS", "Information", "Technology", "Cebu", "Institute", "University", "2021", "2025", "Magna", "Cum", "Laude"],
    figures: [
      { value: "2021", near: ["studied", "school", "degree", "university", "technology", "institute"] },
      { value: "2025", near: ["graduated", "studied", "school", "degree", "university", "technology", "institute"] },
    ],
  },
  {
    id: "certifications",
    text: "He holds TOPCIT Level 3 and PhilNITS FE certifications.",
    terms: ["TOPCIT", "Level", "PhilNITS", "FE"],
  },
  {
    id: "stack",
    text: "He works in TypeScript, Node.js, Bun, Python, PostgreSQL, Redis, Docker, Next.js and React, plus LLM tooling and MCP.",
    terms: ["TypeScript", "Node.js", "Node", "Bun", "Python", "PostgreSQL", "Postgres", "Redis", "Docker", "Next.js", "Next", "React", "LLM", "MCP", "Drizzle"],
  },

  // ---------------------------------------------------------------------------
  // What he can actually do. Added 2026-08-05 at Mark's request, anonymised: the
  // capability and the architecture are his to describe, the nouns and counts
  // belonging to an employer's systems are not. Every figure here is bound.
  // ---------------------------------------------------------------------------

  {
    id: "gates",
    text: "He writes his own static gate suites and wires them into the build, so a change that breaks a rule is uncommittable rather than merely discouraged - and the same bar applies whether a person or an AI agent wrote it. That comes to more than 300 checks he wrote himself.",
    terms: ["AI"],
    figures: [{ value: "300", near: ["checks", "check", "gates", "gate", "static"] }],
  },
  {
    id: "gate-bypass",
    text: "He audits his own guardrails. He found a bypass in his own gate-skip logic, where a cache flag trusted that a commit hash was present rather than checking its value, so any junk value skipped every check. He closed it the same day.",
    terms: [],
  },
  {
    id: "deploy-engine",
    text: "He built one canonical 18-step zero-downtime deploy pipeline that every app he runs shares byte-identically, manifest-hashed so a hand-edited copy refuses to start. Every deploy backs up the production database, restores it into a scratch database and diffs the row counts before any migration runs, boot-probes the new image against real data before cutover, and rolls itself back if the health checks fail.",
    terms: [],
    figures: [{ value: "18", near: ["step", "steps", "pipeline", "deploy"] }],
  },
  {
    id: "self-hosted-infra",
    text: "He runs production on three servers across three separate providers, with no open ports on any of them - every path in goes through an authenticated tunnel or a private network. The third server carries no application traffic at all; its only job is to break the tie over which of the other two takes over.",
    terms: [],
  },
  {
    id: "failover-drills",
    text: "He rehearses recovery rather than only diagramming it. Six live outage drills, including killing the main server outright, after which the system was writing again in 66 seconds with nothing lost. A later five-scenario drill day held user-visible impact to eight seconds or less.",
    terms: [],
    figures: [{ value: "66", near: ["seconds", "second", "writing", "recovery", "recovered", "back", "again"] }],
  },
  {
    id: "rbac",
    text: "He rebuilt an access-control model from a sprawl of 55 separate permissions nobody could audit into a single six-area grid, and removed the super-user role entirely - so there is no account that silently passes every check, and a permission bug turns up in testing instead of being masked by the account that runs the place.",
    terms: [],
    figures: [{ value: "55", near: ["permissions", "permission", "separate", "sprawl"] }],
  },
  {
    id: "ops-platform",
    text: "The biggest thing he has built is an internal operations platform in Next.js and PostgreSQL, put together in ten weeks, with a permission grid, multi-step approval flows, additive-only migrations, and its own gate suite chained into the build.",
    terms: ["Next.js", "Next", "PostgreSQL", "Postgres"],
    figures: [{ value: "10", near: ["weeks", "week"] }],
  },
  {
    id: "meeting-platform",
    text: "He built a meeting platform that records and transcribes meetings automatically, files the video and transcript into organised storage, and makes the whole history searchable with AI chat over any single meeting. Duplicate recordings are prevented structurally, by a database uniqueness constraint rather than by application logic.",
    terms: ["AI"],
  },
  {
    id: "transcript-intelligence",
    text: "He built an unattended LLM extraction pipeline that turns unstructured meeting transcripts into a structured signals database, then shipped a rules-based, explainable scorer that ranks records by risk with the reason written out in plain language.",
    terms: [],
  },
  {
    id: "killed-model",
    text: "He killed his own flagship predictive-model project when a label audit showed the data could not support an honest model, and shipped an explainable rules-based detector instead. He treats refusing to ship an impressive-sounding fake as part of the job, not as a setback.",
    terms: [],
  },
  {
    id: "data-ingestion",
    text: "He built an ingestion pipeline that normalises fragmented spreadsheets and documents into one canonical PostgreSQL analytics layer, with the structured sources syncing unattended every day, upsert-safe and backfilled, behind a gate suite of its own.",
    terms: ["PostgreSQL", "Postgres"],
  },
  {
    id: "agent-fleet",
    text: "He built a self-installing desktop AI-agent kit for non-technical staff on Windows and macOS, with a real control plane behind it. That covers pairing-code enrollment, per-device revocable tokens, a kill switch, and a fleet-wide forced update that lands within 15 minutes.",
    terms: ["AI", "Windows", "macOS"],
    figures: [{ value: "15", near: ["minutes", "minute"] }],
  },
  {
    id: "reverse-engineering",
    text: "He can reconstruct an application's route map and authentication model from a compiled build when no source is available.",
    terms: [],
  },
  {
    id: "incident-to-guardrail",
    text: "When something goes wrong he turns the lesson into a gate rather than a postmortem document, so the same class of failure becomes uncommittable instead of merely remembered.",
    terms: [],
  },
  {
    id: "range",
    text: "In one role he has covered the ground of a small team at once, working as business analyst, data engineer, AI engineer, full-stack developer and infrastructure engineer. His reasoning is that diagnosing an inefficiency is only half the job if you cannot ship the fix yourself.",
    terms: ["AI"],
  },
  {
    id: "tooling-audit",
    text: "He has audited a departmental software stack against real receipts and then built the consolidation systems that replaced it, rather than only writing the recommendation.",
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
    // "pets" has to stay in the sentence. The suggestion chip is "Does he have any
    // pets?" and check-guide.mjs asserts every chip shares a word with the corpus,
    // so dropping it while removing a colon quietly broke the chip - which the gate
    // caught immediately.
    text: "His pets are two cats and two chickens.",
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

/**
 * What an answer is licensed to say. Shape declared inline rather than imported
 * from grounding.ts so this file stays a leaf - scripts/check-guide.mjs loads both
 * directly under Node, which will not resolve the Worker's extensionless imports.
 * Structurally identical to grounding.ts's `Licence`, and tsc proves it at the
 * call site.
 */
export const LICENCE: { terms: Set<string>; figures: Map<string, string[][]> } = {
  terms: new Set(PUBLIC_FACTS.flatMap((f) => f.terms).map((t) => t.toLowerCase())),
  figures: PUBLIC_FACTS.reduce((map, fact) => {
    for (const figure of fact.figures ?? []) {
      const bindings = map.get(figure.value) ?? [];
      bindings.push(figure.near.map((word) => word.toLowerCase()));
      map.set(figure.value, bindings);
    }
    return map;
  }, new Map<string, string[][]>()),
};
