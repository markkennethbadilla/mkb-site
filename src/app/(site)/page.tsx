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
  { n: "300+", label: "checks in the build gate" },
  { n: "10 wk", label: "to build the operations platform" },
  { n: "55 to 6", label: "permissions rebuilt into six areas" },
];

const WEASSIST_PICK = [1, 8, 10, 7, 2, 3];
const LEAN = ["sm:-rotate-1", "sm:translate-y-3 sm:rotate-[0.6deg]", "sm:-rotate-[0.5deg]"];
const GEAR = "url(/art/gate-2.svg) center / 100% 100% no-repeat, radial-gradient(circle closest-side, black 66%, transparent 98%)";
const WRAP = "mx-auto w-full max-w-6xl px-5 sm:px-8 2xl:max-w-7xl";
const TITLE = "cut-title text-4xl sm:text-5xl 2xl:text-6xl";

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

      <section id="about" className={WRAP}>
        <h2 className={TITLE}>How I work</h2>
        <div className="mt-10 grid items-center gap-10 lg:grid-cols-[auto_minmax(0,1fr)]">
          <div className="frame mx-auto w-44 -rotate-2 sm:w-56">
            <Image src={DATA.avatarUrl} alt={DATA.name} width={320} height={320} className="aspect-square object-cover" />
          </div>
          <ol className="grid gap-5 sm:grid-cols-3">
            {DATA.summaryLede.map(([term, detail], i) => (
              <li key={term} className={`sheet flex flex-col gap-2 p-6 ${LEAN[i % LEAN.length]}`}>
                <span className="font-display text-6xl font-extrabold leading-none text-ink" aria-hidden>
                  {i + 1}
                </span>
                <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{term}</span>
                <span className="text-base leading-snug">{detail}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="work" className={WRAP}>
        <h2 className={TITLE}>Work</h2>
        <div className="mt-10">
          <article className="sheet relative z-10 p-6 sm:p-9">
            <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <a href={weassist.href} target="_blank" rel="noopener noreferrer" className="ink-link font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                {weassist.company}
              </a>
              <span className="text-lg font-medium">{weassist.title}</span>
              <span className="tab font-mono sm:ml-auto">{weassist.start} to now</span>
            </header>
            <ul className="mt-6 grid gap-x-10 gap-y-3 leading-snug sm:grid-cols-2">
              {WEASSIST_PICK.map((i) => (
                <li key={i} className="flex gap-3">
                  <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rotate-45 rounded-[2px] bg-glow" />
                  {weassist.description[i]}
                </li>
              ))}
            </ul>
          </article>
          <ol className="mx-3 grid gap-4 sm:mx-8 sm:grid-cols-2">
            {earlier.map((job) => (
              <li key={job.title} className="rounded-b-[1.25rem] bg-secondary p-5 pt-7 text-secondary-foreground shadow-[var(--shadow-cut)]">
                <p className="font-display text-xl font-bold tracking-tight">{job.company}</p>
                <p className="text-sm font-medium">{job.title}</p>
                <p className="mt-1 font-mono text-[0.6875rem]">
                  {job.start} to {job.end}
                </p>
                <p className="mt-2 text-sm leading-snug">{job.description[0]}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="projects" className={WRAP}>
        <h2 className={TITLE}>Things I built to be inspected</h2>
        <div className="mt-10">
          <Gallery />
        </div>
      </section>

      <section id="skills" className={WRAP}>
        <h2 className={TITLE}>Stack</h2>
        <div className="mt-10">
          <SkillGroups />
        </div>
      </section>

      <section id="education" className={WRAP}>
        <h2 className={TITLE}>Education</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {DATA.education.map((e) => (
            <a key={e.school} href={e.href} target="_blank" rel="noopener noreferrer" className="sheet sheet-lift flex items-start gap-4 p-6 sm:p-8">
              {e.logoUrl ? <Image src={e.logoUrl} alt="" width={56} height={56} className="size-14 shrink-0 rounded-full bg-white object-contain p-1.5 shadow-[var(--shadow-cut)]" /> : null}
              <span className="min-w-0 break-words">
                <span className="block font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{e.degree}</span>
                <span className="mt-1 block text-muted-foreground">{e.school}</span>
                <span className="tab mt-3 font-mono">
                  {e.start} to {e.end}
                </span>
              </span>
            </a>
          ))}
          <ul className="slot grid content-center gap-3 p-5 sm:p-6">
            {DATA.certifications.map((c) => (
              <li key={c} className="sheet flex min-w-0 items-start gap-3 rounded-xl p-3.5 text-sm font-medium leading-snug [overflow-wrap:anywhere]">
                <span aria-hidden className="mt-1 size-2.5 shrink-0 rotate-45 rounded-[2px] bg-glow" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="contact" className={WRAP}>
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
