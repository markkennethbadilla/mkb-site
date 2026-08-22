import type { Metadata } from "next";

// `absolute` bypasses the root title template, so Chrome's print-to-PDF names the
// saved file after the person rather than "Resume _ Mark Kenneth Badilla.pdf" - the
// pipe in the template is illegal in a Windows filename and gets rewritten.
export const metadata: Metadata = {
  title: { absolute: "Mark Kenneth Badilla - Resume" },
  description:
    "Full Stack AI Engineer at WeAssist since March 2026. Previously Software Engineer at Hatchit Solutions. BS Information Technology, Magna Cum Laude.",
};

/**
 * The printable resume sits outside the site's chrome entirely.
 *
 * Not in the (site) route group, so it gets no dock, no background grid and no
 * max-w-4xl measure. Those are right for a page you scroll and wrong for a page
 * whose whole job is to be exactly 210mm wide and land on one sheet of paper.
 *
 * It also gets no room chrome, because it is not an exhibit.
 */
export default function ResumeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
