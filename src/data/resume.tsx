import { Icons } from "@/components/icons";
import { FileTextIcon, HomeIcon } from "lucide-react";
import { ReactLight } from "@/components/ui/svgs/reactLight";
import { NextjsIconDark } from "@/components/ui/svgs/nextjsIconDark";
import { Typescript } from "@/components/ui/svgs/typescript";
import { Nodejs } from "@/components/ui/svgs/nodejs";
import { Python } from "@/components/ui/svgs/python";
import { Postgresql } from "@/components/ui/svgs/postgresql";
import { Docker } from "@/components/ui/svgs/docker";

export const DATA = {
  name: "Mark Kenneth Badilla",
  initials: "MKB",
  url: "https://markkennethbadilla.com",
  location: "Cebu City, Philippines",
  locationLink: "https://www.google.com/maps/place/cebu+city",
  description:
    "AI Engineer. I build the harness that lets LLM agents ship production code safely, and the systems that come out of it.",
  summary:
    "I get the full potential out of LLMs not by prompting harder, but by building the harness around them. That means gated codebases, physical guardrails, and agentic workflows that let AI agents ship production systems fast without breaking them. In practice nothing ships unless it passes checks I wrote, more than 300 of them, wired into the build itself, so a bad change cannot be committed at all. One deploy pipeline runs every app I own and takes none of them offline to do it, backing up production and restoring it into a scratch database to diff the row counts before any migration runs. The infrastructure is self-hosted across three servers on three separate providers with no open ports on any of them, and I rehearse the recovery rather than diagramming it. Six live outage drills, including killing the main server outright, back to writing in 66 seconds. I cover the ground of a small team because diagnosing an inefficiency is only half the job if you cannot ship the fix yourself. Previously I built core systems for a multi-tenant ERP platform at Hatchit Solutions. [BS Information Technology, Magna Cum Laude](/#education).",
  avatarUrl: "/me.png",
  skills: [
    { name: "Typescript", icon: Typescript },
    { name: "Next.js", icon: NextjsIconDark },
    { name: "React", icon: ReactLight },
    { name: "Node.js", icon: Nodejs },
    { name: "Python", icon: Python },
    { name: "Postgres", icon: Postgresql },
    { name: "Docker", icon: Docker },
  ],
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
  resumeSummary:
    "AI Engineer working on agentic engineering, which is the harness around LLM agents. Gated codebases, deterministic guardrails and verification, so an agent can ship production code without breaking things. I build the checks that make a bad change uncommittable, deploy without downtime, and rehearse the recovery rather than diagramming it.",

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
      description:
        "Own AI and data automation end to end. Built the internal operations platform (Next.js and PostgreSQL) in ten weeks, with a six-area permission grid that has no bypass role by design and its own gate suite wired into the build, so bad code is uncommittable whether a person or an agent wrote it. Run it on three self-hosted servers across three separate providers with zero-downtime deploys, and rehearse recovery rather than diagramming it. Six live outage drills including killing the main server outright, back to writing in 66 seconds. Every deploy backs up production, restores it into a scratch database and diffs the row counts before anything migrates. Mined thousands of meeting transcripts into a structured signals database in one unattended overnight run, then shipped a rules-based, explainable scorer that ranks records by risk with the reason written out. Killed my own flagship predictive-model project when a label audit showed the data could not support an honest model, and shipped an explainable rules-based detector instead.",
    },
    {
      company: "Hatchit Solutions",
      href: "https://hatchitsolutions.com",
      badges: [],
      location: "Cebu City",
      title: "Software Engineer I",
      logoUrl: "/hatchit.png",
      start: "June 2025",
      end: "April 2026",
      description:
        "Core systems for a multi-tenant ERP platform, covering atomic inventory operations, query performance work through composite indexing, high-volume background job processing on BullMQ and Redis, multi-level approval workflows across many document types, and financial reconciliation.",
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
      description:
        "Full project lifecycle across design, development, testing and deployment.",
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
      description:
        "A forkable template for making AI coding agents safe by construction. Rules loaded every turn, skills loaded on demand, hooks that intercept tool calls before they run, git guards that block the commit, and a self-check tier that forces every guard to fire and fails if it does not.",
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
