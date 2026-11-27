import Image from "next/image";
import { ArrowRight, ArrowUpRight, FileTextIcon, MapPin, MessageCircle } from "lucide-react";
import { DATA } from "@/data/resume";
import Gallery from "@/components/demos/gallery";
import SkillGroups from "@/components/section/skill-groups";
import GuideLazy from "@/components/demo/guide-lazy";
import { Icons } from "@/components/icons";

const HERO_BREAK = DATA.description.indexOf(". ");
const ROLE = DATA.description.slice(0, HERO_BREAK);
const TAGLINE = DATA.description.slice(HERO_BREAK + 2);

const PROOF = [
  { n: "180+", label: "checks in the build gates" },
  { n: "10 wk", label: "to build the operations platform" },
  { n: "55 to 6", label: "permissions rebuilt into six areas" },
];

const TOC = [
  ["about", "Introduction"],
  ["work", "Work Experience"],
  ["education", "Studies"],
  ["skills", "Technical skills"],
] as const;

const WEASSIST_PICK = [1, 8, 10, 7, 2, 3];
const WRAP = "mx-auto w-full max-w-5xl px-5 sm:px-8";
const H2 = "cut-title text-3xl sm:text-4xl";
const PILL = "tab h-9 gap-2 px-3.5 hover:bg-muted";

export default function Page() {
  const [weassist, ...earlier] = DATA.work;
  return (
    <main className="flex flex-col gap-24 pb-16 sm:gap-32">
      <section id="hero" className="glow-wash relative pt-36 pb-4 sm:pt-44">
        <div className={`${WRAP} flex flex-col items-center text-center`}>
          <a href="#guide" className="inline-flex items-center gap-2 rounded-full border border-border bg-accent/70 py-1 pr-3.5 pl-1 text-sm">
            <span className="rounded-full bg-card px-2.5 py-0.5 font-medium">Live agent</span>
            <span className="text-ink">Ask about my work</span>
          </a>
          <h1 className="cut-title mt-7 text-5xl sm:text-7xl">{DATA.name}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            <span className="font-semibold text-foreground">{ROLE}.</span> {TAGLINE}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href={`mailto:${DATA.contact.email}`} className="btn-cut">
              Email me <ArrowRight className="size-4" aria-hidden />
            </a>
            <a href="/resume/" className="btn-cut btn-paper">
              One-page resume
            </a>
          </div>
          <a href="#about" className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-border bg-card py-1 pr-4 pl-1 text-sm hover:bg-muted">
            <Image src={DATA.avatarUrl} alt="" width={64} height={64} className="size-8 rounded-full object-cover" />
            About {DATA.name}
          </a>
          <p className="mt-4 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden /> {DATA.location}, remote
          </p>
          <dl className="sheet mt-14 grid w-full divide-y divide-border overflow-hidden text-left sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {PROOF.map((p) => (
              <div key={p.label} className="p-6">
                <dt className="sr-only">{p.label}</dt>
                <dd className="cut-title text-4xl">{p.n}</dd>
                <dd className="mt-1.5 text-sm text-muted-foreground">{p.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="guide" className={WRAP}>
        <GuideLazy />
      </section>

      <div className={`${WRAP} grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-16`}>
        <aside className="flex flex-col items-center gap-4 text-center lg:sticky lg:top-28 lg:self-start">
          <div className="frame size-36 rounded-full">
            <Image src={DATA.avatarUrl} alt={DATA.name} width={320} height={320} className="aspect-square object-cover" />
          </div>
          <p className="flex items-center gap-1.5 text-sm">
            <MapPin className="size-4 text-ink" aria-hidden /> Cebu City, PH
          </p>
          <nav aria-label="On this page" className="mt-4 hidden w-full lg:block">
            <ol className="grid gap-3 text-left text-sm">
              {TOC.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className="group flex items-center gap-3 text-muted-foreground hover:text-foreground">
                    <span aria-hidden className="h-px w-4 bg-current transition-[width] duration-200 group-hover:w-8" />
                    {label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-col gap-20">
          <section id="about" className="scroll-mt-28">
            <a href="#guide" className="inline-flex items-center gap-2 rounded-full border border-border bg-accent/70 py-1.5 pr-2 pl-3 text-sm">
              <MessageCircle className="size-4 text-ink" aria-hidden /> Ask the live agent
              <ArrowRight className="size-4" aria-hidden />
            </a>
            <h2 className="cut-title mt-6 text-5xl sm:text-6xl">{DATA.name}</h2>
            <p className="mt-2 text-2xl text-muted-foreground">{ROLE}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <a href={DATA.contact.social.GitHub.url} target="_blank" rel="noopener noreferrer" className={PILL}>
                <Icons.github className="size-4" /> GitHub
              </a>
              <a href={DATA.contact.social.LinkedIn.url} target="_blank" rel="noopener noreferrer" className={PILL}>
                <Icons.linkedin className="size-4" /> LinkedIn
              </a>
              <a href={`mailto:${DATA.contact.email}`} className={PILL}>
                <Icons.email className="size-4" /> Email
              </a>
              <a href="/resume/" className={PILL}>
                <FileTextIcon className="size-4" aria-hidden /> Resume
              </a>
            </div>
            <ol className="mt-10 grid gap-6">
              {DATA.summaryLede.map(([term, detail], i) => (
                <li key={term} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
                  <span className="cut-title text-2xl text-ink" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="text-lg leading-relaxed">
                    <span className="block text-sm font-medium text-muted-foreground">{term}</span>
                    {detail}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section id="work" className="scroll-mt-28">
            <h2 className={H2}>Work Experience</h2>
            <ol className="mt-8 grid gap-10">
              <li>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <a href={weassist.href} target="_blank" rel="noopener noreferrer" className="ink-link inline-flex items-center gap-1 text-xl font-semibold">
                    {weassist.company} <ArrowUpRight className="size-4" aria-hidden />
                  </a>
                  <span className="text-muted-foreground">{weassist.start} to now</span>
                </div>
                <p className="mt-1 text-ink">{weassist.title}</p>
                <ul className="mt-5 grid list-disc gap-3 pl-5 leading-relaxed marker:text-muted-foreground">
                  {WEASSIST_PICK.map((i) => (
                    <li key={i}>{weassist.description[i]}</li>
                  ))}
                </ul>
              </li>
              {earlier.map((job) => (
                <li key={job.title}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-xl font-semibold">{job.company}</p>
                    <span className="text-muted-foreground">
                      {job.start} to {job.end}
                    </span>
                  </div>
                  <p className="mt-1 text-ink">{job.title}</p>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{job.description[0]}</p>
                </li>
              ))}
            </ol>
          </section>

          <section id="education" className="scroll-mt-28">
            <h2 className={H2}>Studies</h2>
            <div className="mt-8 grid gap-8">
              {DATA.education.map((e) => (
                <div key={e.school}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <a href={e.href} target="_blank" rel="noopener noreferrer" className="ink-link text-xl font-semibold">
                      {e.school}
                    </a>
                    <span className="text-muted-foreground">
                      {e.start} to {e.end}
                    </span>
                  </div>
                  <p className="mt-1 text-ink">{e.degree}</p>
                </div>
              ))}
              <ul className="flex flex-wrap gap-2">
                {DATA.certifications.map((c) => (
                  <li key={c} className="tab [overflow-wrap:anywhere]">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section id="skills" className="scroll-mt-28">
            <h2 className={H2}>Technical skills</h2>
            <div className="mt-8">
              <SkillGroups />
            </div>
          </section>
        </div>
      </div>

      <section id="projects" className={`${WRAP} scroll-mt-28`}>
        <h2 className={H2}>Things I built to be inspected</h2>
        <div className="mt-8">
          <Gallery />
        </div>
      </section>

      <section id="contact" className={`${WRAP} scroll-mt-28`}>
        <div className="sheet overflow-hidden" style={{ background: "radial-gradient(ellipse 80% 120% at 0% 0%, var(--glow-soft) 0%, var(--card) 60%)" }}>
          <div className="flex flex-col items-center px-6 py-14 text-center sm:py-16">
            <h2 className="cut-title text-3xl sm:text-4xl">Get in touch</h2>
            <p className="mt-3 text-muted-foreground">Hiring for fullstack, AI or automation</p>
            <a href={`mailto:${DATA.contact.email}`} className="btn-cut mt-7 max-w-full break-all">
              {DATA.contact.email} <ArrowUpRight className="size-4 shrink-0" aria-hidden />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
