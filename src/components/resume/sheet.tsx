import { DATA } from "@/data/resume";
import { cn } from "@/lib/utils";

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
 * The size ranking is load-bearing and it is not decoration. The path a resume
 * actually travels is print to PDF, then upload, and a PDF has no <h2> left in it.
 * Heading detection falls back to font size and weight relative to the body text,
 * so a section heading set smaller than the paragraph beneath it ranks below a job
 * title. Section headings are therefore the largest thing on the sheet after the
 * name, and nothing below them may be raised past them.
 *
 * NOTHING HERE INFERS WHERE A CLAIM ENDS, and nothing here is a paragraph. Job
 * descriptions, the summary and the project blurb all arrive pre-split from
 * src/data/resume.tsx, one claim per array element, and each one prints as a real
 * list item. The author states every split. This file no longer cuts a string at a
 * full stop to find the first sentence, because there is no longer a string to cut.
 *
 * Every fact comes from src/data/resume.tsx. Nothing is added here, and in
 * particular no figure is re-introduced that that file deliberately dropped.
 */

// The claim line of a project blurb. The gallery card on the site prints the whole
// mechanism list under it; on paper only this line fits, because the rest sits
// directly above a technologies line already carrying the same keywords. The union
// is here because the same field is one authored sentence for a project with
// nothing more to say and a list of claims for one that has.
const claimLine = (description: string | readonly string[]) =>
  typeof description === "string" ? description : description[0];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-[2.8mm]">
      <h2 className="border-b border-black/25 pb-[0.8mm] text-[10pt] font-bold uppercase tracking-[0.09em]">
        {title}
      </h2>
      <div className="mt-[1.2mm]">{children}</div>
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
        <p className="mt-[1.2mm] text-[9.5pt] font-medium">Full Stack AI Engineer</p>
        {/* Contact is one plain line: text a parser can read, wrapped in anchors a
            harvester can read. Separators are literal characters, not borders. */}
        <p className="mt-[1.8mm] text-[8.6pt] leading-[1.5]">
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
        {/* The mandate sentence is set bold and a shade larger than the claims that
            follow it, so the first line a six-second reader lands on is the one
            that says what he is hired to do. */}
        <p className="text-[9.2pt] font-semibold leading-[1.35]">{DATA.resumeSummary[0]}</p>
        {/* The rest was one running paragraph and is now one claim per bullet. Two
            columns rather than a stack, and that is the page budget rather than a
            style: stacked, these four claims cost four printed lines, where the
            paragraph they replaced cost three. Measured, a column is 334px wide and
            holds about 56 characters, which puts the block back at three lines.

            Grid ROW flow, never grid-flow-col and never CSS columns. Either one
            leaves the DOM in one order and the eye reading in another, and the whole
            point of this file is that those two orders are the same. */}
        <ul className="mt-[1mm] grid list-disc grid-cols-2 gap-x-[3mm] gap-y-[0.4mm] pl-[4.2mm] text-[9pt] leading-[1.35]">
          {DATA.resumeSummary.slice(1).map((claim) => (
            <li key={claim}>{claim}</li>
          ))}
        </ul>
      </Section>

      <Section title="Experience">
        {DATA.work.map((job) => {
          // A role whose claims are all short prints two to a row, and that is where
          // the room for the longer role's split-out bullets comes from. Measured on
          // the built page: the Hatchit engineer role goes from six printed lines to
          // five, which is the ~4mm the sheet needed back.
          //
          // 60 is a little past the ~56 characters a 334px column actually fits, so
          // the two longest items there wrap once and their rows print two lines.
          // That is deliberate - tightening it to 56 drops the role back to one
          // column and six lines, which costs more than the ragged row does. The
          // WeAssist claims run to twice this length, so that role stays one column
          // rather than wrapping every second line.
          const twoUp = job.description.every((line) => line.length <= 60);
          return (
            <div key={`${job.company}-${job.title}`} className="mt-[2mm] first:mt-0">
              <div className="flex items-baseline justify-between gap-3">
                {/* Title, employer and place on one line. The location used to sit on
                    its own italic line under this row, which cost three printed lines
                    across three roles and gave a parser a second thing to attribute. */}
                <h3 className="text-[9.5pt] font-semibold">
                  {job.title}
                  {", "}
                  {job.company}
                  {", "}
                  {job.location}
                </h3>
                <span className="shrink-0 text-[8.6pt] tabular-nums">
                  {job.start} - {job.end}
                </span>
              </div>
              {/* Row flow, for the same reason as the summary above. The order of
                  these claims carries meaning - what he owns first, the judgement
                  call last - and a column-major flow would have the eye reading them
                  in one order while the DOM says another. */}
              <ul
                className={cn(
                  "mt-[1mm] list-disc pl-[4.2mm] text-[9pt] leading-[1.3]",
                  twoUp ? "grid grid-cols-2 gap-x-[3mm] gap-y-[0.4mm]" : "space-y-[0.4mm]",
                )}
              >
                {job.description.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </Section>

      {/* Skills sits directly under Experience rather than fourth. Where the dates
          add up to a short number, the list of tools is the strongest surface on
          the sheet, and a recruiter who stops reading after two sections should
          have hit it. */}
      <Section title="Skills">
        {/* Grouped, comma-separated lines. Never a grid of pills - pills are the
            classic ATS trap, because they look like a skills matrix and flatten
            into an unpunctuated run of words a parser cannot split back apart. */}
        {/* The space between <dt> and <dd> is written out and it is load-bearing.
            Two adjacent elements with no text node between them concatenate under
            textContent and under cheerio .text(), which is what an LLM agent or a
            scraper reads, so "Languages" and "TypeScript" arrived welded as
            "LanguagesTypeScript" and both tokens were lost. A whitespace-only run
            in a flex container is not laid out as a flex item, so nothing moves. */}
        {/* Sized tight on purpose, and tighter than everything around it. Seven
            groups of 53 names is a lot of lines, and this is the one block that can
            give room back without costing a fact, so it is where the page budget
            gets balanced. Measured headroom after the size rework is 6mm - one more
            group would need a line found somewhere else first. A narrower label
            column also buys the values more width, which is what actually removes
            wrapped lines. */}
        <dl className="space-y-[0.4mm]">
          {DATA.resumeSkills.map((g) => (
            <div key={g.group} className="flex gap-[1.5mm] text-[8.2pt] leading-[1.32]">
              <dt className="w-[20mm] shrink-0 font-semibold">{g.group}</dt>{" "}
              {/* Names only. The site's pills carry each item's logo, link and
                  one-line explanation; on paper those are noise at best, and a
                  hyperlink is invisible. An ATS wants the words. */}
              <dd>{g.items.map((i) => i.name).join(", ")}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Education">
        {DATA.education.map((school) => (
          <div key={school.school} className="flex items-baseline justify-between gap-3">
            <h3 className="text-[9.5pt] font-semibold">
              {school.degree}
              {", "}
              {school.school}
            </h3>
            <span className="shrink-0 text-[8.6pt] tabular-nums">
              {school.start} - {school.end}
            </span>
          </div>
        ))}
      </Section>

      <Section title="Projects">
        {DATA.projects.map((p) => (
          <div key={p.title} className="mt-[1.8mm] first:mt-0">
            {/* Same flex row as an Experience heading, for the same reason. A
                project with no year beside it is a gap a parser has to guess at. */}
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[9.5pt] font-semibold">
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
              <span className="shrink-0 text-[8.6pt] tabular-nums">{p.dates}</span>
            </div>
            <p className="text-[9pt] leading-[1.4]">{claimLine(p.description)}</p>
            <p className="text-[8.6pt] leading-[1.35]">{p.technologies.join(", ")}</p>
          </div>
        ))}
      </Section>

      <Section title="Certifications">
        <p className="text-[9pt] leading-[1.45]">{DATA.certifications.join(", ")}</p>
      </Section>
    </article>
  );
}
