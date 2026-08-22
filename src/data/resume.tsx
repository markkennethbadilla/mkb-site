import { Icons } from "@/components/icons";
import { FileTextIcon, HomeIcon } from "lucide-react";

export const DATA = {
  name: "Mark Kenneth Badilla",
  initials: "MKB",
  url: "https://markkennethbadilla.com",
  location: "Cebu City, Philippines",
  locationLink: "https://www.google.com/maps/place/cebu+city",
  // WIDENED 2026-08-05, and the reason is worth keeping.
  //
  // This used to read "I build the harness that lets LLM agents ship production
  // code safely, and the systems that come out of it" - which puts the harness
  // first and makes the systems sound like a byproduct. That is backwards. The
  // systems ARE the work: conversational interfaces, admin dashboards, the APIs
  // under them, the integrations either side. The harness is the distinctive way
  // he makes them trustworthy, not the whole job.
  //
  // Getting that order wrong is expensive in one specific direction. It is a
  // narrow, memorable line, and narrow-and-memorable filters out every role that
  // is hiring for the thing he actually does all day. Leading with the systems and
  // keeping the guardrails as the differentiator widens the funnel without giving
  // up the sentence nobody else can write.
  // serena-cannot: Serena holds driftwood as its active root, so this path is outside it
  //
  // VERBATIM from driftwood/profiles-master.md. Do not reword it here. That file is the
  // single source and every surface renders a subset of it; the whole reason four surfaces
  // once told four different versions of this career is that each one kept its own phrasing.
  // If this sentence should change, change it THERE and re-render, then move the stamp in
  // that file's Surface log.
  description:
    "Full Stack AI Engineer. Hand me a goal instead of a spec and I come back with the diagnosis, the recommendation and the system.",
  // serena-cannot: Serena holds driftwood as its active root, so this path is outside it
  //
  // Summary blocks 1 to 4 from driftwood/profiles-master.md, verbatim, joined into the
  // running paragraph this surface wants. Same sentences LinkedIn, Bossjob and Y Combinator
  // carry; only the block COUNT differs per surface, never the wording.
  //
  // The About surface renders blocks 2 to 4 as a lede, a bullet list and a closing line.
  // Block 1 is dropped here because the hero already renders it as DATA.description, 200px
  // higher up the same page, and a reader who meets the identical sentence twice in one
  // screen reads the second one as padding.
  //
  // NO PARAGRAPHS ANYWHERE (Mark, 2026-08-22: "never a block of paragraphs, no one will
  // read that"). The lede and the closing line used to be running prose either side of the
  // bullets. They are label-and-value pairs, so they are pair lists now and the About
  // section renders them as real <dl> markup rather than sentences a skimmer skips. Same
  // words, no fact added or dropped; only the connective scaffolding is gone.
  //
  // Every string here stays a double-quoted literal, because scripts/check-guide.mjs and
  // tests/guide.test.mjs only scan double-quoted literals for employer-confidential words
  // and a template literal would silently leave the scan.
  summaryLede: [
    ["What I own", "AI and data automation at WeAssist, end to end."],
    ["What arrived", "A goal rather than a backlog."],
    [
      "What I built first",
      "The picture of how work really moved between departments and the tools they already had, written up with a buy-versus-build recommendation.",
    ],
  ],
  // One claim per bullet, and the four that carried two or three claims each are split at
  // their own claim boundaries. Lengths are deliberately uneven - a list where every item
  // is the same length and shape reads as generated.
  summary:
    "- I argued for buying or consolidating wherever something adequate existed, and reserved custom work for the one gap nothing covered.\n- I built the internal operations platform (Next.js and PostgreSQL) **in ten weeks**, on additive-only migrations.\n- A six-area permission grid that has no bypass role by design.\n- Its own gate suite is wired into the build, so bad code is uncommittable whether a person or an agent wrote it.\n- It runs on **three self-hosted servers across three separate providers**, with nothing exposed to the public internet.\n- I rehearse recovery rather than diagramming it.\n- Six live outage drills including killing the main server outright, back to writing in **66 seconds** with zero data loss.\n- Every deploy backs up the database, restores it into a scratch database and diffs the row counts before anything migrates.\n- Also built a meeting platform used daily.\n- An unattended LLM extraction pipeline with a ranked plain-language risk worklist on top.\n- Desktop AI agents for non-technical staff.\n- A label audit showed the data could not support an honest predictive model.\n- I killed that path on its own evidence and shipped the explainable rules-based detector instead.",
  // The closing line, minus its "Before that," opener - the label carries that now. The
  // degree row beside it is not repeated here: the About section reads it from
  // DATA.education so the two surfaces cannot drift.
  summaryBefore:
    "Core systems for a multi-tenant ERP platform at Hatchit Solutions, where one bug is every client's bug at once.",
  avatarUrl: "/me.png",
  // The summary the printable resume opens with.
  //
  // Deliberately NOT `summary` above. That one is the About paragraph and it ends
  // by naming the previous employer and the degree - which on the web page is
  // useful context and on a resume is the same information the reader is about to
  // meet twice more, in Experience and in Education. Measured, the duplication was
  // costing about 20mm of a 297mm page, which is the difference between comfortable
  // headroom and a second sheet appearing the next time a line is added.
  //
  // Same graded material, nothing new asserted.
  // serena-cannot: Serena holds driftwood as its active root, so this path is outside it
  // Summary block 1 verbatim, plus the one-line short form, both from profiles-master.md.
  //
  // Split into claims by the author rather than by a regex at render time. Element 0 is
  // the sheet's bold lede; the rest print as bullets under it, two to a row. The leading
  // "Full Stack AI Engineer." fragment is gone because the sheet already prints that as its
  // own title line 4mm above this block.
  //
  // Element 1 was a 33-word chain of three claims joined by commas, which printed as a
  // paragraph (Mark, 2026-08-22: no paragraphs anywhere). It is split at its own claim
  // boundaries into the three things he actually does in order - work it out, decide, build
  // and run - and the only words dropped are the connectives "I" and "then". No fact moved.
  resumeSummary: [
    "Hand me a goal instead of a spec and I come back with the diagnosis, the recommendation and the system.",
    "Work out how the job actually gets done today.",
    "Decide what to buy and what to build.",
    "Build and run the result - interface, services, schema, infrastructure, and the AI on top.",
    "Gated codebases and deterministic verification, so an agent can ship production code without breaking things.",
  ],

  // The real stack, grouped, and every entry carries three things beyond its name.
  //
  // WHY EACH ONE EARNS ITS PLACE. A bare list of forty words assumes the reader
  // already knows all forty, which nobody does - a recruiter does not know what
  // Drizzle or Caddy or Kokoro is, and a specialist in one half of this list does
  // not know the other half. So:
  //   `url`   the official site, because a name you cannot look up is trivia
  //   `blurb` one line saying what it IS, for the reader who does not know
  //   `icon`  the simple-icons slug, or omitted where the thing has no brand mark
  //
  // Items with no `icon` are not oversights. "REST APIs", "RAG" and "Model
  // cascades" are techniques, not products; they get a neutral glyph rather than
  // some vendor's logo standing in for a concept.
  //
  // WHAT WAS MISSING BEFORE (Mark, 2026-08-05: "my stack is misrepresenting me").
  // The old list was eighteen mainstream web technologies, which described a
  // competent web developer rather than the person who builds agent harnesses.
  // Sourced from life-db/mark-knowledge-base.md and the impact dossier.
  //
  // THE LINE ON EMPLOYER TOOLING. A tool he can USE is a skill and belongs here; a
  // tool an employer SUBSCRIBES TO is clause 4.1 material and does not. So n8n,
  // GoHighLevel and the rest are in, being generic and transferable; Apollo,
  // Teramind, ClickUp and Breezy stay out, because auditing a subscription is not
  // a skill.
  resumeSkills: [
    {
      group: "Languages",
      items: [
        { name: "TypeScript", icon: "typescript", url: "https://www.typescriptlang.org", blurb: "JavaScript with static types, checked before the code runs." },
        { name: "JavaScript", icon: "javascript", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript", blurb: "The language every browser runs, and half the servers too." },
        { name: "Python", icon: "python", url: "https://www.python.org", blurb: "General-purpose language, the default for data work and scripting." },
        { name: "SQL", url: "https://www.postgresql.org/docs/current/sql.html", blurb: "The query language relational databases speak." },
        { name: "Bash", icon: "gnubash", url: "https://www.gnu.org/software/bash/", blurb: "The Unix shell. Most automation starts as a shell script." },
        { name: "HTML", icon: "html5", url: "https://developer.mozilla.org/en-US/docs/Web/HTML", blurb: "The markup every web page is made of." },
        { name: "CSS", icon: "css", url: "https://developer.mozilla.org/en-US/docs/Web/CSS", blurb: "How a web page is styled and laid out." },
      ],
    },
    {
      group: "Frontend",
      items: [
        { name: "React", icon: "react", url: "https://react.dev", blurb: "The library most interactive interfaces are built with." },
        { name: "Next.js", icon: "nextdotjs", url: "https://nextjs.org", blurb: "The React framework handling routing, rendering and builds." },
        { name: "Tailwind CSS", icon: "tailwindcss", url: "https://tailwindcss.com", blurb: "Styling by composing small utility classes instead of writing CSS files." },
        { name: "shadcn/ui", icon: "shadcnui", url: "https://ui.shadcn.com", blurb: "Accessible components you copy into your own codebase and own." },
        { name: "HTMX", icon: "htmx", url: "https://htmx.org", blurb: "Interactivity driven by HTML attributes, with almost no JavaScript." },
        { name: "Figma", icon: "figma", url: "https://www.figma.com", blurb: "The design tool interfaces are drawn and handed off in." },
        { name: "Motion", icon: "framer", url: "https://motion.dev", blurb: "Animation for React, used for the guide on this page." },
      ],
    },
    {
      group: "Backend",
      items: [
        { name: "Node.js", icon: "nodedotjs", url: "https://nodejs.org", blurb: "JavaScript on the server, outside a browser." },
        { name: "Bun", icon: "bun", url: "https://bun.sh", blurb: "A faster JavaScript runtime and package manager." },
        { name: "NestJS", icon: "nestjs", url: "https://nestjs.com", blurb: "An opinionated Node framework for structured server applications." },
        { name: "REST APIs", url: "https://developer.mozilla.org/en-US/docs/Glossary/REST", blurb: "The conventional way services talk to each other over HTTP." },
        { name: "Zod", icon: "zod", url: "https://zod.dev", blurb: "Schema validation that rejects malformed input before it reaches your code." },
        { name: "BullMQ", icon: "redis", url: "https://docs.bullmq.io", blurb: "A job queue on Redis, for work that should happen later or retry." },
      ],
    },
    {
      group: "Data",
      items: [
        { name: "PostgreSQL", icon: "postgresql", url: "https://www.postgresql.org", blurb: "The relational database most of this work is built on." },
        { name: "SQLite", icon: "sqlite", url: "https://www.sqlite.org", blurb: "A whole database in a single file. Runs everywhere, including at the edge." },
        { name: "Redis", icon: "redis", url: "https://redis.io", blurb: "An in-memory store used for caching, queues and locks." },
        { name: "Drizzle ORM", icon: "drizzle", url: "https://orm.drizzle.team", blurb: "A TypeScript query builder that stays close to the SQL you meant." },
        { name: "Prisma ORM", icon: "prisma", url: "https://www.prisma.io", blurb: "A schema-first ORM with generated, typed database clients." },
        { name: "Cloudflare D1", icon: "cloudflare", url: "https://developers.cloudflare.com/d1/", blurb: "SQLite running at Cloudflare's edge. The demos on this site use it." },
        { name: "NocoDB", url: "https://nocodb.com", blurb: "A spreadsheet-style interface over a real relational database." },
      ],
    },
    {
      group: "AI and agents",
      items: [
        { name: "OpenRouter", url: "https://openrouter.ai", blurb: "One API in front of hundreds of models, so you can switch without rewriting." },
        { name: "Model cascades", url: "https://openrouter.ai/docs/features/model-routing", blurb: "Try a cheap model first and escalate only when it fails. Cost control, not a product." },
        { name: "Vercel AI SDK", icon: "vercel", url: "https://ai-sdk.dev", blurb: "The toolkit this site's guide uses for tool-calling and streaming." },
        { name: "MCP", icon: "modelcontextprotocol", url: "https://modelcontextprotocol.io", blurb: "An open standard for giving a model tools and data sources." },
        { name: "RAG", url: "https://en.wikipedia.org/wiki/Retrieval-augmented_generation", blurb: "Retrieve the relevant documents first, then let the model answer from them." },
        { name: "Claude Code", icon: "claudecode", url: "https://claude.com/claude-code", blurb: "Anthropic's coding agent. Runs in the terminal and edits real repositories." },
        { name: "OpenCode", url: "https://opencode.ai", blurb: "An open-source terminal coding agent that runs against any model." },
        { name: "Antigravity", icon: "googlegemini", url: "https://antigravity.google", blurb: "Google's agent-first development environment." },
        { name: "Codex", url: "https://openai.com/codex/", blurb: "OpenAI's software engineering agent." },
        { name: "Whisper STT", url: "https://openai.com/index/whisper/", blurb: "Speech-to-text. Turns recorded audio into a usable transcript." },
        { name: "ElevenLabs", icon: "elevenlabs", url: "https://elevenlabs.io", blurb: "Text-to-speech with convincing voices." },
        { name: "Kokoro TTS", icon: "huggingface", url: "https://huggingface.co/hexgrad/Kokoro-82M", blurb: "A small open text-to-speech model, cheap enough to self-host." },
        { name: "Pinecone", url: "https://www.pinecone.io", blurb: "A vector database, for finding text by meaning rather than keyword." },
      ],
    },
    {
      group: "Infrastructure",
      items: [
        { name: "Docker", icon: "docker", url: "https://www.docker.com", blurb: "Packages an app with everything it needs so it runs the same anywhere." },
        { name: "Docker Compose", icon: "docker", url: "https://docs.docker.com/compose/", blurb: "Defines and runs a whole multi-container stack from one file." },
        { name: "Cloudflare Workers", icon: "cloudflareworkers", url: "https://workers.cloudflare.com", blurb: "Code that runs at the edge, close to the visitor. This site is one." },
        { name: "Cloudflare Tunnels", icon: "cloudflare", url: "https://www.cloudflare.com/products/tunnel/", blurb: "Exposes a service without opening a single port on the machine." },
        { name: "Caddy", icon: "caddy", url: "https://caddyserver.com", blurb: "A web server that gets and renews HTTPS certificates on its own." },
        { name: "Tailscale", icon: "tailscale", url: "https://tailscale.com", blurb: "A private network between machines, with no public exposure." },
        { name: "Linux", icon: "linux", url: "https://www.kernel.org", blurb: "The operating system every server here runs." },
        { name: "Git", icon: "git", url: "https://git-scm.com", blurb: "Version control. The history that makes a rollback possible." },
        { name: "CI/CD", icon: "githubactions", url: "https://docs.github.com/en/actions", blurb: "Automated checks and deploys that run on every change." },
      ],
    },
    {
      group: "Automation",
      items: [
        { name: "n8n", icon: "n8n", url: "https://n8n.io", blurb: "Self-hostable workflow automation. Connects services without writing glue code." },
        { name: "GoHighLevel", url: "https://www.gohighlevel.com", blurb: "A CRM and marketing platform, usually automated against via its API." },
        { name: "Webhooks", url: "https://en.wikipedia.org/wiki/Webhook", blurb: "One service calling yours the moment something happens, instead of polling." },
        { name: "Cron", icon: "linux", url: "https://en.wikipedia.org/wiki/Cron", blurb: "The scheduler that runs a job at a fixed time, every time." },
      ],
    },
  ],

  certifications: ["TOPCIT Level 3", "PhilNITS Fundamental Engineer (FE)"],

  // Blog is deliberately not linked: an empty blog reads worse than no blog.
  // Re-add the entry once there is real writing in content/.
  //
  // Resume sits in the dock rather than as a link buried in the page: it is the
  // one thing a recruiter arrives wanting, and the dock is the only chrome that
  // follows them down the whole page.
  navbar: [
    { href: "/", icon: HomeIcon, label: "Home" },
    { href: "/resume", icon: FileTextIcon, label: "Resume" },
  ],
  contact: {
    email: "markkennethbadilla@gmail.com",
    tel: "",
    social: {
      GitHub: {
        name: "GitHub",
        url: "https://github.com/markkennethbadilla",
        icon: Icons.github,
        navbar: true,
      },
      LinkedIn: {
        name: "LinkedIn",
        url: "https://www.linkedin.com/in/markkennethbadilla",
        icon: Icons.linkedin,
        navbar: true,
      },
      email: {
        name: "Send Email",
        url: "mailto:markkennethbadilla@gmail.com",
        icon: Icons.email,
        navbar: false,
      },
    },
  },

  // Every description is a list of claims, one claim per element, split here rather than
  // guessed from punctuation at render time. Both surfaces used to run the same sentence
  // splitter over one long string, which meant "Next.js and PostgreSQL" and every other
  // dotted name was a coin flip. Order carries meaning - element 0 is what he owns, the
  // last element is the judgement call, and the figures sit between them.
  work: [
    {
      company: "WeAssist",
      href: "https://weassist.io",
      badges: [],
      location: "Remote",
      title: "AI Engineer",
      logoUrl: "/weassist.png",
      start: "March 2026",
      end: "Present",
      // The three figures folded in here - 55 scattered permissions, 300+ gate checks, the
      // 18-step deploy pipeline - are already published on this site in
      // src/lib/public-facts.ts. Scope and figures are the honest answer to a short tenure.
      // There is no years line anywhere in this file, on purpose.
      //
      // Split again 2026-08-22, at the claim boundaries the longest four entries were
      // hiding. Nothing is reworded and no figure moved; a 55-word bullet is a paragraph
      // wearing a marker, and on the printed sheet each new line lands at or under the
      // 120-character measure so it still costs one printed line.
      description: [
        "Own AI and data automation end to end.",
        "Built the internal operations platform (Next.js and PostgreSQL) in ten weeks.",
        "Access control rebuilt from 55 scattered permissions into a six-area grid with no bypass role by design.",
        "Its own gate suite of 300+ checks wired into the build.",
        "Bad code is uncommittable whether a person or an agent wrote it.",
        "Run it on three self-hosted servers across three separate providers.",
        "One 18-step zero-downtime deploy pipeline every app shares, and I rehearse recovery rather than diagramming it.",
        "Six live outage drills including killing the main server outright, back to writing in 66 seconds.",
        "Every deploy backs up production, restores it into a scratch database and diffs the row counts before anything migrates.",
        "Built an unattended LLM extraction pipeline that turns unstructured meeting transcripts into a structured signals database.",
        "Then shipped a rules-based, explainable scorer that ranks records by risk with the reason written out.",
        "Killed my own flagship predictive-model project when a label audit showed the data could not support an honest model.",
        "Shipped an explainable rules-based detector instead.",
      ],
    },
    {
      // No trailing roman-numeral level on this title, ever. It reads as a fresh
      // grad to anyone skimming, and the level was internal to one employer's
      // ladder, so it carries no information to a reader outside that ladder.
      company: "Hatchit Solutions",
      href: "https://hatchitsolutions.com",
      badges: [],
      location: "Cebu City",
      title: "Software Engineer",
      logoUrl: "/hatchit.png",
      start: "June 2025",
      end: "April 2026",
      // Split at its own commas. Same words, no new facts. This is the longest tenure on
      // the resume and it was arriving as one 35-word comma chain in a single bullet.
      description: [
        "Core systems for a multi-tenant ERP platform.",
        "Atomic inventory operations.",
        "Query performance work through composite indexing.",
        "High-volume background job processing on BullMQ and Redis.",
        "Multi-level approval workflows across many document types.",
        "Financial reconciliation.",
      ],
    },
    {
      company: "Hatchit Solutions",
      href: "https://hatchitsolutions.com",
      badges: [],
      location: "Cebu City",
      title: "Web Engineer Intern",
      logoUrl: "/hatchit.png",
      start: "January 2025",
      end: "May 2025",
      // Keep this role and its dates. It is what makes an automated tenure calculation
      // start in January 2025 rather than June 2025.
      description: [
        "Full project lifecycle across design, development, testing and deployment.",
      ],
    },
  ],
  education: [
    {
      school: "Cebu Institute of Technology - University",
      href: "https://cit.edu",
      degree: "BS Information Technology, Magna Cum Laude",
      logoUrl: "/cit.png",
      start: "2021",
      end: "2025",
    },
  ],
  projects: [
    {
      title: "public-agent-provisioning",
      href: "https://github.com/markkennethbadilla/public-agent-provisioning",
      dates: "2026",
      active: true,
      // Element 0 is the claim a reader repeats, elements 1 onward are the mechanisms
      // underneath it. Five mechanisms welded into one sentence is a paragraph, and the
      // sheet was cutting it back to the first sentence with a slice at ". " - which is
      // exactly the render-time guess the header comment of every other list here forbids.
      // Authored split, so both surfaces get the same first line without inferring it.
      description: [
        "A forkable template for making AI coding agents safe by construction.",
        "Rules loaded every turn.",
        "Skills loaded on demand.",
        "Hooks that intercept tool calls before they run.",
        "Git guards that block the commit.",
        "A self-check tier that forces every guard to fire and fails if it does not.",
      ],
      technologies: ["Python", "Node.js", "Shell", "Git hooks"],
      links: [
        {
          type: "Source",
          href: "https://github.com/markkennethbadilla/public-agent-provisioning",
          icon: <Icons.github className="size-3" />,
        },
      ],
      image: "",
      video: "",
    },
  ],
  hackathons: [],
} as const;
