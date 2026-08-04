import { Icons } from "@/components/icons";
import { HomeIcon, NotebookIcon } from "lucide-react";
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
    "I get the full potential out of LLMs not by prompting harder, but by building the harness: gated codebases, physical guardrails, and agentic workflows that let AI agents ship production systems fast without breaking them. At WeAssist I own AI and data automation end to end, covering the ground of a small team, because diagnosing an inefficiency is only half the job if you cannot ship the fix yourself. Previously I built core systems for a multi-tenant ERP platform at Hatchit Solutions. [BS Information Technology, Magna Cum Laude](/#education).",
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
  // Blog is deliberately not linked: an empty blog reads worse than no blog.
  // Re-add the entry once there is real writing in content/.
  navbar: [{ href: "/", icon: HomeIcon, label: "Home" }],
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
        "Own AI and data automation end to end. Built the operations portal (Next.js + PostgreSQL, 111 tables, 941 commits in ten weeks) with a 6-area RBAC grid that has no bypass role by design, and a 106-check gate suite wired into the build so bad code is physically uncommittable, human or AI. Run it on three self-hosted servers across three providers with zero-downtime deploys, rehearsing recovery rather than diagramming it: six live drills including killing the main server outright, back to writing in 66 seconds. Every deploy backs up production and proves the restore before anything migrates. Mined 7,047 meeting transcripts into a structured intelligence database in one unattended overnight run costing about nine dollars. Killed my own flagship predictive churn model when the labeled data could not support an honest one, and shipped an explainable rules-based detector instead.",
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
        "Core systems for a multi-tenant ERP platform. Zero stock errors in 12+ months through atomic inventory operations. Cut query times 94% (5s to 300ms) with composite indexing. Processed 10,000+ daily background jobs with BullMQ/Redis. Multi-level approval workflows serving 15+ document types, and financial reconciliation handling 5,000+ daily transactions at 99.9% accuracy.",
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
