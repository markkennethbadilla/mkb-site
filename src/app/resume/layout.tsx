import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume",
  description:
    "Mark Kenneth Badilla - Full Stack AI Engineer. One page, printable, and readable by an applicant tracking system.",
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
