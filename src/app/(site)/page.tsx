import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { DATA } from "@/data/resume";
import Gallery from "@/components/demos/gallery";
import SkillGroups from "@/components/section/skill-groups";
import GuideLazy from "@/components/demo/guide-lazy";
import { Icons } from "@/components/icons";
import { LightBox } from "@/components/hero/light-box";

const HERO_BREAK = DATA.description.indexOf(". ");
const ROLE = DATA.description.slice(0, HERO_BREAK);
const TAGLINE = DATA.description.slice(HERO_BREAK + 2);

const PROOF = [
  { n: "180+", label: "checks in the build gates" },
  { n: "10 wk", label: "to build the operations platform" },
  { n: "55 to 6", label: "permissions rebuilt into six areas" },
];

const NAV = [
  ["about", "How I work"],
  ["work", "Work"],
  ["projects", "Projects"],
  ["skills", "Stack"],
  ["education", "Education"],
  ["contact", "Contact"],
] as const;

const WEASSIST_PICK = [1, 8, 10, 7, 2, 3];
const GEAR = "url(/art/gate-2.svg) center / 100% 100% no-repeat, radial-gradient(circle closest-side, black 66%, transparent 98%)";
const WRAP = "mx-auto w-full max-w-6xl px-5 sm:px-8 2xl:max-w-7xl";
const TITLE = "cut-title text-3xl sm:text-4xl 2xl:text-5xl";
// SPEC Art theme "Sources": a row stays flat until hover, then lifts as a lit sheet.
const ROW = "grid gap-3 rounded-[1.25rem] p-5 transition-[background-color,box-shadow,translate] duration-300 ease-out hover:-translate-y-0.5 hover:bg-card hover:shadow-[var(--shadow-cut)] sm:gap-6 sm:p-6";
const DATED = `${ROW} sm:grid-cols-[9rem_minmax(0,1fr)]`;
const DATE = "font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:pt-1.5";

export default function Page() {
  const [weassist, ...earlier] = DATA.work;
  return (
    <main className="flex flex-col gap-24 pb-24 sm:gap-32">
      <section id="hero">
        <LightBox role={ROLE} tagline={TAGLINE} />
        <div className="relative overflow-hidden bg-paper-1 text-white">
          <div
            aria-hidden
            className="absolute inset-y-0 right-0 w-full [mask-image:linear-gradient(to_top,black_30%,transparent_75%)] sm:w-[38rem] sm:[mask-image:linear-gradient(to_left,black_45%,transparent)]"
          >
            <div
              className="absolute -right-28 -bottom-40 size-[26rem] bg-paper-2 dark:bg-paper-3 sm:-right-24 sm:top-1/2 sm:bottom-auto sm:size-[44rem] sm:-translate-y-1/2"
              style={{ mask: GEAR, WebkitMask: GEAR, maskComposite: "intersect", WebkitMaskComposite: "source-in" }}
            />
          </div>
          <dl className={`${WRAP} relative grid gap-8 py-12 pb-40 sm:grid-cols-3 sm:py-16 sm:pr-64 lg:pr-80`}>
            {PROOF.map((p) => (
              <div key={p.label}>
                <dt className="sr-only">{p.label}</dt>
                <dd className="font-display text-5xl font-extrabold tracking-tight text-glow sm:text-6xl">{p.n}</dd>
                <dd className="mt-2 text-sm leading-snug text-white/85 sm:text-base">{p.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="guide" className={WRAP}>
        <GuideLazy />
      </section>

      <div className={`${WRAP} grid grid-cols-[minmax(0,1fr)] gap-16 min-[85rem]:grid-cols-[15rem_minmax(0,1fr)] min-[85rem]:gap-20`}>
        <aside className="min-[85rem]:sticky min-[85rem]:top-24 min-[85rem]:self-start">
          <div className="frame w-28 -rotate-2 sm:w-36">
            <Image src={DATA.avatarUrl} alt={DATA.name} width={320} height={320} className="aspect-square object-cover" />
          </div>
          <p className="mt-6 font-display text-2xl font-extrabold tracking-tight">{DATA.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{ROLE}</p>
          <nav aria-label="Sections" className="mt-8 hidden min-[85rem]:block">
            <ol className="grid gap-3">
              {NAV.map(([id, label], i) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="group flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground focus-visible:text-foreground"
                  >
                    <span aria-hidden className="h-0.5 w-6 rounded-full bg-current transition-[width] duration-300 ease-out group-hover:w-14 group-focus-visible:w-14" />
                    {String(i + 1).padStart(2, "0")} {label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="mt-8 flex gap-5 text-sm font-semibold">
            <a href={DATA.contact.social.GitHub.url} target="_blank" rel="noopener noreferrer" className="ink-link inline-flex items-center gap-1.5">
              <Icons.github className="size-4" /> GitHub
            </a>
            <a href={DATA.contact.social.LinkedIn.url} target="_blank" rel="noopener noreferrer" className="ink-link inline-flex items-center gap-1.5">
              <Icons.linkedin className="size-4" /> LinkedIn
            </a>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-24 sm:gap-28">
          <section id="about" className="scroll-mt-24">
            <h2 className={TITLE}>How I work</h2>
            <ol className="mt-8 grid gap-2">
              {DATA.summaryLede.map(([term, detail], i) => (
                <li key={term} className={`${ROW} sm:grid-cols-[5rem_minmax(0,1fr)]`}>
                  <span className="font-display text-4xl font-extrabold leading-none text-ink" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="grid gap-1">
                    <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{term}</span>
                    <span className="leading-snug">{detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section id="work" className="scroll-mt-24">
            <h2 className={TITLE}>Work</h2>
            <ol className="mt-8 grid gap-2">
              <li className={DATED}>
                <span className={DATE}>{weassist.start} to now</span>
                <div className="min-w-0">
                  <a href={weassist.href} target="_blank" rel="noopener noreferrer" className="ink-link inline-flex items-center gap-1 font-display text-2xl font-extrabold tracking-tight">
                    {weassist.title}, {weassist.company} <ArrowUpRight className="size-4" aria-hidden />
                  </a>
                  <ul className="mt-4 grid gap-2.5 leading-snug">
                    {WEASSIST_PICK.map((i) => (
                      <li key={i} className="flex gap-3">
                        <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rotate-45 rounded-[2px] bg-glow" />
                        {weassist.description[i]}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
              {earlier.map((job) => (
                <li key={job.title} className={DATED}>
                  <span className={DATE}>
                    {job.start} to {job.end}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-xl font-bold tracking-tight">
                      {job.title}, {job.company}
                    </p>
                    <p className="mt-2 text-sm leading-snug text-muted-foreground">{job.description[0]}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section id="projects" className="scroll-mt-24">
            <h2 className={TITLE}>Things I built to be inspected</h2>
            <div className="mt-8">
              <Gallery />
            </div>
          </section>

          <section id="skills" className="scroll-mt-24">
            <h2 className={TITLE}>Stack</h2>
            <div className="mt-8">
              <SkillGroups />
            </div>
          </section>

          <section id="education" className="scroll-mt-24">
            <h2 className={TITLE}>Education</h2>
            <ol className="mt-8 grid gap-2">
              {DATA.education.map((e) => (
                <li key={e.school} className={DATED}>
                  <span className={DATE}>
                    {e.start} to {e.end}
                  </span>
                  <a href={e.href} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-start gap-4">
                    {e.logoUrl ? <Image src={e.logoUrl} alt="" width={48} height={48} className="size-12 shrink-0 rounded-full bg-white object-contain p-1.5 shadow-[var(--shadow-cut)]" /> : null}
                    <span className="min-w-0 break-words">
                      <span className="block font-display text-xl font-extrabold tracking-tight">{e.degree}</span>
                      <span className="mt-1 block text-muted-foreground">{e.school}</span>
                    </span>
                  </a>
                </li>
              ))}
              {DATA.certifications.map((c) => (
                <li key={c} className={DATED}>
                  <span className={DATE}>Certification</span>
                  <span className="min-w-0 font-medium leading-snug [overflow-wrap:anywhere]">{c}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <section id="contact" className={`${WRAP} scroll-mt-24`}>
        <div className="rounded-[2rem] bg-paper-1 px-4 pt-10 shadow-[var(--shadow-lift)] sm:px-10 sm:pt-14">
          <div
            className="mx-auto flex max-w-2xl flex-col items-center rounded-t-[12rem] px-5 pt-24 pb-12 text-center text-lit-ink shadow-[var(--shadow-slot)] sm:pt-28 sm:pb-16"
            style={{ background: "radial-gradient(ellipse 70% 60% at 50% 55%, var(--glow-soft) 0%, var(--glow) 100%)" }}
          >
            <p className="max-w-[15rem] font-mono text-xs font-semibold uppercase tracking-[0.16em] sm:max-w-none">Hiring for fullstack, AI or automation</p>
            <h2 className="mt-3 font-display text-5xl font-extrabold tracking-tight sm:text-7xl">Get in touch</h2>
            <a href={`mailto:${DATA.contact.email}`} className="btn-cut mt-7 max-w-full break-all bg-paper-1 text-white">
              {DATA.contact.email} <ArrowUpRight className="size-4 shrink-0" aria-hidden />
            </a>
            <div className="mt-6 flex justify-center gap-6 text-sm font-semibold">
              <a href={DATA.contact.social.LinkedIn.url} target="_blank" rel="noopener noreferrer" className="ink-link inline-flex items-center gap-1.5">
                <Icons.linkedin className="size-4" /> LinkedIn
              </a>
              <a href={DATA.contact.social.GitHub.url} target="_blank" rel="noopener noreferrer" className="ink-link inline-flex items-center gap-1.5">
                <Icons.github className="size-4" /> GitHub
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
