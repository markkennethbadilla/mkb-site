import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { DATA } from "@/data/resume";
import Gallery from "@/components/demos/gallery";
import SkillGroups from "@/components/section/skill-groups";
import GuideLazy from "@/components/demo/guide-lazy";
import { Icons } from "@/components/icons";

/**
 * The homepage, rebuilt 2026-10-24 (Mark: "maximalist design but concise enough
 * for recruiters to read quick"). A recruiter gets role, stack, proof and contact
 * above the fold; every section below is one editorial block under a coloured
 * rule, with big names, quiet mono metadata and one action.
 *
 * Server components only. The one client island is the guide, which loads on
 * first intent (guide-lazy.tsx). Section ids are the guide's targets
 * (src/lib/site-sections.ts) and must not change.
 */

const HUE = { hero: 160, about: 55, work: 25, skills: 265, education: 140, contact: 160 };
// Text ink flips lighter in dark mode through CSS light-dark() (next-themes sets
// color-scheme), so small coloured type keeps AA contrast on both grounds.
const ink = (h: number) => `light-dark(oklch(0.5 0.15 ${h}), oklch(0.78 0.13 ${h}))`;
// Solid fills behind white text.
const fill = (h: number) => `oklch(0.5 0.15 ${h})`;
const wash = (h: number) => `oklch(0.6 0.14 ${h} / 0.09)`;

const HERO_BREAK = DATA.description.indexOf(". ");
const ROLE = DATA.description.slice(0, HERO_BREAK);
const TAGLINE = DATA.description.slice(HERO_BREAK + 2);

// Checkable figures, each one a line in the WeAssist entry below.
const PROOF = [
  { n: "300+", label: "checks in the build gate" },
  { n: "10 wk", label: "to build the operations platform" },
  { n: "55 to 6", label: "permissions rebuilt into six areas" },
];
const STACK = ["TypeScript", "Next.js", "Node.js", "PostgreSQL", "Python", "LLM agents", "Cloudflare"];

// Work: the claims a reader repeats, in the order they matter. Indexes into DATA.
const WEASSIST_PICK = [1, 8, 10, 7, 2, 3];

function SectionHead({ n, title, hue, aside }: { n: string; title: string; hue: number; aside?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end gap-x-4 gap-y-2 border-t-2 pt-4" style={{ borderColor: ink(hue) }}>
      <span className="font-mono text-xs" style={{ color: ink(hue) }}>
        {n}
      </span>
      <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {aside ? <div className="ml-auto font-mono text-[11px] text-muted-foreground">{aside}</div> : null}
    </div>
  );
}

export default function Page() {
  const [weassist, ...earlier] = DATA.work;
  return (
    <main className="flex flex-col gap-24">
      {/* HERO */}
      <section id="hero" className="grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="order-2 flex flex-col gap-6 md:order-1">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: ink(HUE.hero) }}>
              {ROLE}
            </p>
            <h1 className="mt-2 text-5xl font-semibold leading-[0.95] tracking-tighter sm:text-7xl">
              {DATA.name}
            </h1>
          </div>
          <p className="max-w-xl text-lg leading-snug text-foreground/85 sm:text-xl">{TAGLINE}</p>
          <ul className="flex flex-wrap gap-x-2 gap-y-1 font-mono text-xs text-muted-foreground">
            {STACK.map((s, i) => (
              <li key={s} className="flex items-center gap-2">
                {i > 0 ? <span aria-hidden className="opacity-40">/</span> : null}
                {s}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`mailto:${DATA.contact.email}`}
              className="inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition-transform hover:translate-x-0.5 motion-reduce:transition-none"
              style={{ background: fill(HUE.hero) }}
            >
              Email me <ArrowRight className="size-4" aria-hidden />
            </a>
            <Link href="/resume" className="text-sm font-medium underline decoration-2 underline-offset-4" style={{ textDecorationColor: ink(HUE.hero) }}>
              One-page resume
            </Link>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden /> {DATA.location}, remote
            </span>
          </div>
        </div>

        {/* Portrait on a two-ring blob, with the current role pinned to it. */}
        <div className="relative order-1 mx-auto md:order-2">
          <div className="grid size-44 place-items-center rounded-full sm:size-60" style={{ background: wash(HUE.hero) }}>
            <Image
              priority
              src={DATA.avatarUrl}
              alt={DATA.name}
              width={320}
              height={320}
              className="size-36 rounded-full object-cover shadow-xl ring-4 ring-background sm:size-48"
            />
          </div>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background shadow">
            {weassist.title} at {weassist.company}
          </span>
        </div>

        <dl className="order-3 grid grid-cols-3 gap-4 border-y border-border py-5 md:col-span-2">
          {PROOF.map((p) => (
            <div key={p.label}>
              <dt className="sr-only">{p.label}</dt>
              <dd className="text-3xl font-semibold tracking-tight sm:text-5xl" style={{ color: ink(HUE.hero) }}>
                {p.n}
              </dd>
              <dd className="mt-1 text-xs leading-snug text-muted-foreground sm:text-sm">{p.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="guide">
        <GuideLazy />
      </section>

      {/* ABOUT: three statements, numbered because they are a sequence. */}
      <section id="about">
        <SectionHead n="01" title="How I work" hue={HUE.about} />
        <ol className="grid gap-8 sm:grid-cols-3">
          {DATA.summaryLede.map(([term, detail], i) => (
            <li key={term} className="flex flex-col gap-2">
              <span className="text-5xl font-semibold leading-none" style={{ color: ink(HUE.about) }} aria-hidden>
                {i + 1}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{term}</span>
              <span className="text-base leading-snug">{detail}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* WORK: a timeline on one coloured spine. */}
      <section id="work">
        <SectionHead n="02" title="Work" hue={HUE.work} aside="since 2025" />
        <ol className="relative flex flex-col gap-10 border-l-2 pl-6 sm:pl-8" style={{ borderColor: `oklch(0.6 0.14 ${HUE.work} / 0.45)` }}>
          <li className="relative">
            <span aria-hidden className="absolute top-2 -left-[33px] size-4 rounded-full ring-4 ring-background sm:-left-[41px]" style={{ background: ink(HUE.work) }} />
            <div className="flex flex-wrap items-baseline gap-x-3">
              <a href={weassist.href} target="_blank" rel="noopener noreferrer" className="text-2xl font-semibold tracking-tight hover:underline sm:text-3xl">
                {weassist.company}
              </a>
              <span className="text-base">{weassist.title}</span>
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                {weassist.start} to now
              </span>
            </div>
            <ul className="mt-4 grid gap-x-8 gap-y-2 text-[15px] leading-snug sm:grid-cols-2">
              {WEASSIST_PICK.map((i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full" style={{ background: ink(HUE.work) }} />
                  {weassist.description[i]}
                </li>
              ))}
            </ul>
          </li>
          {earlier.map((job) => (
            <li key={job.title} className="relative">
              <span aria-hidden className="absolute top-2 -left-[31px] size-3 rounded-full border-2 bg-background sm:-left-[39px]" style={{ borderColor: ink(HUE.work) }} />
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-xl font-semibold tracking-tight">{job.company}</span>
                <span className="text-sm">{job.title}</span>
                <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                  {job.start} to {job.end}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{job.description[0]}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* PROJECTS: ProjectsSection used to wrap this; the head moved here. */}
      <section id="projects">
        <SectionHead n="03" title="Things I built to be inspected" hue={300} aside="three run for real" />
        <Gallery />
      </section>

      <section id="skills" style={{ "--tint-hue": HUE.skills } as React.CSSProperties}>
        <SectionHead n="04" title="Stack" hue={HUE.skills} aside="eight core, the rest below" />
        <SkillGroups />
      </section>

      {/* EDUCATION and certifications on one strip. */}
      <section id="education">
        <SectionHead n="05" title="Education" hue={HUE.education} />
        <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {DATA.education.map((e) => (
            <a key={e.school} href={e.href} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-4">
              {e.logoUrl ? <Image src={e.logoUrl} alt="" width={48} height={48} className="size-12 rounded-full bg-white object-contain p-1.5" /> : null}
              <div>
                <p className="text-xl font-semibold tracking-tight group-hover:underline">{e.degree}</p>
                <p className="text-sm text-muted-foreground">{e.school}</p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {e.start} to {e.end}
                </p>
              </div>
            </a>
          ))}
          <ul className="flex flex-col gap-2">
            {DATA.certifications.map((c) => (
              <li key={c} className="flex items-start gap-2 text-sm">
                <span aria-hidden className="mt-1.5 size-2 shrink-0 rotate-45" style={{ background: ink(HUE.education) }} />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CONTACT: one big action. */}
      <section id="contact" className="rounded-3xl px-6 py-12 text-center sm:px-12 sm:py-16" style={{ background: wash(HUE.contact) }}>
        <p className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: ink(HUE.contact) }}>
          Hiring for fullstack, AI or automation
        </p>
        <h2 className="mt-3 text-4xl font-semibold tracking-tighter sm:text-6xl">Get in touch</h2>
        <a
          href={`mailto:${DATA.contact.email}`}
          className="mt-6 inline-flex h-12 items-center gap-2 rounded-full px-6 text-base font-semibold text-white"
          style={{ background: fill(HUE.contact) }}
        >
          {DATA.contact.email} <ArrowUpRight className="size-4" aria-hidden />
        </a>
        <div className="mt-5 flex justify-center gap-5 text-sm text-muted-foreground">
          <a href={DATA.contact.social.LinkedIn.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <Icons.linkedin className="size-4" /> LinkedIn
          </a>
          <a href={DATA.contact.social.GitHub.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <Icons.github className="size-4" /> GitHub
          </a>
        </div>
      </section>
    </main>
  );
}
