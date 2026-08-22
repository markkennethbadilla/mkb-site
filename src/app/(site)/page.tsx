/* eslint-disable @next/next/no-img-element */
import BlurFade from "@/components/magicui/blur-fade";
import BlurFadeText from "@/components/magicui/blur-fade-text";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DATA } from "@/data/resume";
import Link from "next/link";
import Markdown from "react-markdown";
import ContactSection from "@/components/section/contact-section";
import ProjectsSection from "@/components/section/projects-section";
import SkillGroups from "@/components/section/skill-groups";
import WorkSection from "@/components/section/work-section";
import AgentConsole from "@/components/demo/agent-console";
import { ArrowUpRight } from "lucide-react";
import { Fragment } from "react";

const BLUR_FADE_DELAY = 0.04;

// DATA.description is one verbatim string from driftwood and has to stay one string:
// src/app/layout.tsx feeds it straight to the page metadata and to the Open Graph card,
// and a title welded to a tagline is what a search result wants. On the page it is a job
// title followed by a claim, which is a label and a value, so the split happens HERE at
// render rather than in the data. The sheet already prints the title as its own line.
const HERO_BREAK = DATA.description.indexOf(". ");
const HERO_TITLE = DATA.description.slice(0, HERO_BREAK);
const HERO_TAGLINE = DATA.description.slice(HERO_BREAK + 2);

// Small-caps mono, the same label treatment the guide and the demo rooms already use.
const LABEL = "font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground";

export default function Page() {
  return (
    <main className="min-h-dvh flex flex-col gap-14 relative">
      {/* Every section spans the SAME container width. An earlier version gave
          the hero and prose a narrower inner column, which left the top of the
          page hugging the left edge while the demo below spanned the full
          width - it read as misaligned rather than as a deliberate measure.
          The container is 4xl so full-width prose still lands at a readable
          line length. */}
      <section id="hero">
        <div className="w-full space-y-8">
          <div className="gap-2 gap-y-6 flex flex-col md:flex-row justify-between">
            <div className="gap-2 flex flex-col order-2 md:order-1">
              <BlurFadeText
                delay={BLUR_FADE_DELAY}
                className="text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl"
                yOffset={8}
                text={`Hi, I'm ${DATA.name.split(" ")[0]}`}
              />
              <BlurFade delay={BLUR_FADE_DELAY}>
                <dl className="max-w-[600px] space-y-1.5">
                  <dt className={LABEL}>{HERO_TITLE}</dt>
                  <dd className="text-muted-foreground md:text-lg lg:text-xl">
                    {HERO_TAGLINE}
                  </dd>
                </dl>
              </BlurFade>
              {/* The three facts a recruiter opens the page for - where he is,
                  what he does now, and the one-page version - were all further
                  down or behind the dock. Every value reads from DATA, so the
                  role here cannot drift away from the work section.
                  A real <ul>, because the three facts sat in one <p> separated
                  by <span> middots - which is a bullet character pretending to
                  be list structure, so a parser read one run-on sentence. The
                  middots survive as decoration inside the items they precede,
                  marked aria-hidden. */}
              <BlurFade delay={BLUR_FADE_DELAY}>
                <ul className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <li>{DATA.location}</li>
                  <li className="flex items-center gap-x-2">
                    <span aria-hidden className="text-muted-foreground/40">&middot;</span>
                    {DATA.work[0].title} at {DATA.work[0].company} since {DATA.work[0].start}
                  </li>
                  <li className="flex items-center gap-x-2">
                    <span aria-hidden className="text-muted-foreground/40">&middot;</span>
                    <Link href="/resume" className="underline underline-offset-4 transition-colors hover:text-foreground">
                      One-page resume
                    </Link>
                  </li>
                </ul>
              </BlurFade>
            </div>
            <BlurFade delay={BLUR_FADE_DELAY} className="order-1 md:order-2">
              <Avatar className="size-24 md:size-32 border rounded-full shadow-lg ring-4 ring-muted">
                <AvatarImage alt={DATA.name} src={DATA.avatarUrl} />
                <AvatarFallback>{DATA.initials}</AvatarFallback>
              </Avatar>
            </BlurFade>
          </div>
        </div>
      </section>
      {/* Sits directly under the hero on purpose. The guide only works if a
          visitor has already met it and stopped paying attention to it before
          they ask it anything - meeting it for the first time at the bottom of
          the page gives away that it is going to do something. */}
      <section id="guide">
        <BlurFade delay={BLUR_FADE_DELAY * 2}>
          <AgentConsole />
        </BlurFade>
      </section>
      <section id="about">
        <div className="flex min-h-0 flex-col gap-y-4">
          <BlurFade delay={BLUR_FADE_DELAY * 3}>
            <h2 className="text-2xl font-bold tracking-tight">About</h2>
          </BlurFade>
          {/* Three shapes, no paragraphs. The lede and the closing line are
              label-and-value pairs and are rendered as real definition lists;
              only the middle block is a bullet list, and it is the only part
              that still goes through Markdown, for its ** emphasis.
              The label column is fixed on sm and up and collapses to a stacked
              single column on a phone, the same grid idiom the demo rooms use. */}
          <BlurFade delay={BLUR_FADE_DELAY * 4}>
            <div className="flex flex-col gap-y-6 text-pretty font-sans leading-relaxed text-muted-foreground">
              <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[10.5rem_1fr]">
                {DATA.summaryLede.map(([term, detail]) => (
                  <Fragment key={term}>
                    <dt className={`${LABEL} sm:pt-1`}>{term}</dt>
                    <dd className="mb-3 sm:mb-0">{detail}</dd>
                  </Fragment>
                ))}
              </dl>
              <div className="prose max-w-none font-sans leading-relaxed text-muted-foreground dark:prose-invert prose-strong:text-foreground">
                <Markdown>{DATA.summary}</Markdown>
              </div>
              <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[10.5rem_1fr]">
                <dt className={`${LABEL} sm:pt-1`}>Before that</dt>
                <dd className="mb-3 sm:mb-0">{DATA.summaryBefore}</dd>
                <dt className={`${LABEL} sm:pt-1`}>Degree</dt>
                <dd>
                  <Link
                    href="/#education"
                    className="underline underline-offset-4 transition-colors hover:text-foreground"
                  >
                    {DATA.education[0].degree}
                  </Link>
                </dd>
              </dl>
            </div>
          </BlurFade>
        </div>
      </section>
      <section id="work">
        <div className="flex min-h-0 flex-col gap-y-6">
          <BlurFade delay={BLUR_FADE_DELAY * 5}>
            <h2 className="text-2xl font-bold tracking-tight">Work Experience</h2>
          </BlurFade>
          <BlurFade delay={BLUR_FADE_DELAY * 6}>
            <WorkSection />
          </BlurFade>
        </div>
      </section>
      {/* ProjectsSection renders its own <section id="projects">, so it is NOT
          wrapped in another one here - two elements sharing an id is invalid, and
          the guide's getElementById would silently target whichever came first. */}
      <ProjectsSection />
      <section id="skills">
        <div className="flex min-h-0 flex-col gap-y-4">
          <BlurFade delay={BLUR_FADE_DELAY * 7}>
            <h2 className="text-2xl font-bold tracking-tight">Skills</h2>
          </BlurFade>
          <SkillGroups delayStart={BLUR_FADE_DELAY * 8} />
        </div>
      </section>
      <section id="education">
        <div className="flex min-h-0 flex-col gap-y-6">
          <BlurFade delay={BLUR_FADE_DELAY * 9}>
            <h2 className="text-2xl font-bold tracking-tight">Education</h2>
          </BlurFade>
          <div className="flex flex-col gap-8">
            {DATA.education.map((education, index) => (
              <BlurFade
                key={education.school}
                delay={BLUR_FADE_DELAY * 10 + index * 0.05}
              >
                <Link
                  href={education.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-x-3 justify-between group"
                >
                  <div className="flex items-center gap-x-3 flex-1 min-w-0">
                    {education.logoUrl ? (
                      <img
                        src={education.logoUrl}
                        alt={education.school}
                        className="size-8 md:size-10 p-1 border rounded-full shadow ring-2 ring-border overflow-hidden object-contain flex-none"
                      />
                    ) : (
                      <div className="size-8 md:size-10 p-1 border rounded-full shadow ring-2 ring-border bg-muted flex-none" />
                    )}
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <div className="font-semibold leading-none flex items-center gap-2">
                        {education.school}
                        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" aria-hidden />
                      </div>
                      <div className="font-sans text-sm text-muted-foreground">
                        {education.degree}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground text-right flex-none">
                    <span>
                      {education.start} - {education.end}
                    </span>
                  </div>
                </Link>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>
      <section id="contact">
        <BlurFade delay={BLUR_FADE_DELAY * 16}>
          <ContactSection />
        </BlurFade>
      </section>
    </main>
  );
}
