import { DATA } from "@/data/resume";

/**
 * One sheet of A4, and everything about it is shaped by two readers who want
 * opposite things.
 *
 * A HUMAN skims it in about six seconds and wants hierarchy, whitespace and a
 * shape they recognise. AN APPLICANT TRACKING SYSTEM strips every bit of that
 * away and reads the DOM as a flat stream of text. Most resume templates serve
 * the first and quietly break the second - a two-column layout reads as
 * interleaved nonsense once flattened, an icon beside an email address carries no
 * email address at all, and a heading rendered as an SVG is not a heading.
 *
 * So the rules here are not stylistic:
 *
 *   - ONE COLUMN in DOM order, top to bottom, exactly as a parser sees it. Flex is
 *     used only to put a date on the same visual line as a job title, never to
 *     create a second reading order.
 *   - Real text for everything that carries information. No icons, no SVG, no
 *     background images, and nothing in ::before - pseudo-element content is
 *     invisible to a parser, so a bullet drawn that way is a bullet that does not
 *     exist. The lists below are real <ul><li>.
 *   - The section headings are real <h2> and are spelled the ordinary way -
 *     Experience, Education, Skills, Projects, Certifications. A parser matches
 *     against a vocabulary; "What I have been up to" matches nothing.
 *   - Contact details are plain text AND real mailto:/https: anchors, so they
 *     survive both a parser that reads text and one that harvests hrefs.
 *
 * SIZING. The sheet is exactly 210mm x 297mm with 13mm padding, so the content box
 * is 184mm x 271mm. Type is in pt because this is a print document and pt is what
 * print sizes mean. Everything is set to leave headroom rather than fill the page
 * exactly - content grows, and a resume that silently becomes two pages is worse
 * than one that looks slightly airy.
 *
 * Every fact comes from src/data/resume.tsx. Nothing is added here, and in
 * particular no figure is re-introduced that that file deliberately dropped.
 */

/** Strips inline markdown links to their text - the summary carries one. */
function plain(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
}

/**
 * Splits a prose description into the discrete claims it was written as.
 *
 * The descriptions in resume.tsx are paragraphs of full sentences, which is right
 * for the web page and wrong for a resume: a recruiter scans bullets and a wall of
 * prose gets skipped. Splitting on a full stop followed by a capital recovers the
 * sentence boundaries without touching "Next.js", which has no space after its dot.
 */
function bullets(description: string): string[] {
  return description
    .split(/(?<=\.)\s+(?=[A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-[3.2mm]">
      <h2 className="border-b border-black/25 pb-[0.8mm] text-[8pt] font-bold uppercase tracking-[0.09em]">
        {title}
      </h2>
      <div className="mt-[1.6mm]">{children}</div>
    </section>
  );
}

export default function Sheet() {
  const email = DATA.contact.email;
  const linkedIn = DATA.contact.social.LinkedIn.url;
  const github = DATA.contact.social.GitHub.url;

  return (
    <article
      // The print colour scheme is forced here rather than inherited. The site is
      // tinted and ships a dark theme; a resume printed in either would waste toner
      // and read badly, and a recruiter opening the PDF at midnight should not get
      // white-on-black. Black on white is the only correct answer for paper, so the
      // sheet states it outright instead of depending on whatever theme is active.
      className="mx-auto w-[210mm] min-h-[297mm] bg-white px-[13mm] py-[13mm] text-black print:m-0 print:w-[210mm]"
      style={{ colorScheme: "light" }}
    >
      <header>
        <h1 className="text-[19pt] font-bold leading-[1.05] tracking-tight">{DATA.name}</h1>
        <p className="mt-[1.2mm] text-[9.5pt] font-medium">AI Engineer</p>
        {/* Contact is one plain line: text a parser can read, wrapped in anchors a
            harvester can read. Separators are literal characters, not borders. */}
        <p className="mt-[1.8mm] text-[8pt] leading-[1.5]">
          {DATA.location}
          {" | "}
          <a href={`mailto:${email}`} className="underline decoration-black/25">
            {email}
          </a>
          {" | "}
          <a href={linkedIn} className="underline decoration-black/25">
            linkedin.com/in/markkennethbadilla
          </a>
          {" | "}
          <a href={github} className="underline decoration-black/25">
            github.com/markkennethbadilla
          </a>
          {" | "}
          <a href={DATA.url} className="underline decoration-black/25">
            markkennethbadilla.com
          </a>
        </p>
      </header>

      <Section title="Summary">
        <p className="text-[8.4pt] leading-[1.42]">{plain(DATA.resumeSummary)}</p>
      </Section>

      <Section title="Experience">
        {DATA.work.map((job) => (
          <div key={`${job.company}-${job.title}`} className="mt-[2.4mm] first:mt-0">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[9pt] font-semibold">
                {job.title}
                {", "}
                {job.company}
              </h3>
              <span className="shrink-0 text-[8pt] tabular-nums">
                {job.start} - {job.end}
              </span>
            </div>
            <p className="text-[8pt] italic">{job.location}</p>
            <ul className="mt-[1mm] list-disc space-y-[0.6mm] pl-[4.2mm] text-[8.4pt] leading-[1.4]">
              {bullets(job.description).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </Section>

      <Section title="Education">
        {DATA.education.map((school) => (
          <div key={school.school} className="flex items-baseline justify-between gap-3">
            <h3 className="text-[9pt] font-semibold">
              {school.degree}
              {", "}
              {school.school}
            </h3>
            <span className="shrink-0 text-[8pt] tabular-nums">
              {school.start} - {school.end}
            </span>
          </div>
        ))}
      </Section>

      <Section title="Skills">
        {/* Grouped, comma-separated lines. Never a grid of pills - pills are the
            classic ATS trap, because they look like a skills matrix and flatten
            into an unpunctuated run of words a parser cannot split back apart.
            The group label is a real text prefix on the same line, so a parser
            reading straight through gets "Languages TypeScript, JavaScript..."
            rather than a heading orphaned from the list it introduces. */}
        {/* Sized tight on purpose. Seven groups is a lot of lines, and adding them
            took the page from 39mm of headroom to 10mm - close enough that one more
            skill would have pushed it to a second sheet without anyone noticing. A
            narrower label column also buys the values more width, which is what
            actually removes wrapped lines. */}
        <dl className="space-y-[0.4mm]">
          {DATA.resumeSkills.map((g) => (
            <div key={g.group} className="flex gap-[1.5mm] text-[7.9pt] leading-[1.32]">
              <dt className="w-[20mm] shrink-0 font-semibold">{g.group}</dt>
              <dd>{g.items.join(", ")}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Projects">
        {DATA.projects.map((p) => (
          <div key={p.title} className="mt-[1.8mm] first:mt-0">
            <h3 className="text-[8.6pt] font-semibold">
              {p.title}
              {/* The URL is written out rather than hidden behind link text. On
                  paper a hyperlink is invisible, and a parser that only harvests
                  hrefs still gets one from the anchor. */}
              <span className="font-normal">
                {" - "}
                <a href={p.href} className="underline decoration-black/25">
                  {p.href.replace(/^https:\/\//, "")}
                </a>
              </span>
            </h3>
            <p className="text-[8.4pt] leading-[1.4]">{p.description}</p>
          </div>
        ))}
      </Section>

      <Section title="Certifications">
        <p className="text-[8.4pt] leading-[1.45]">{DATA.certifications.join(", ")}</p>
      </Section>
    </article>
  );
}
