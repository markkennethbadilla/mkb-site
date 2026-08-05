import Link from "next/link";
import Sheet from "@/components/resume/sheet";
import PrintButton from "@/components/resume/print-button";
import { DATA } from "@/data/resume";

/**
 * /resume - the printable one.
 *
 * Two presentations of one document. On screen it is a sheet of paper on a desk,
 * with a toolbar above it; on paper it is the sheet and nothing else. Everything
 * that is screen-only carries `print:hidden`, and the @page rule below sets the
 * physical size, so the printed output has no browser headers, no margins of its
 * own and no toolbar.
 *
 * `size: A4` plus `margin: 0` matters more than it looks. Without it the browser
 * applies its own default margin ON TOP of the sheet's 13mm padding, which pushes
 * the content down far enough to spill a second, nearly-empty page - the single
 * most common way a one-page resume silently becomes two.
 */
export default function ResumePage() {
  return (
    <div className="min-h-dvh bg-muted/40 py-6 print:bg-white print:py-0">
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>

      <div className="mx-auto mb-5 flex w-[210mm] max-w-full items-center justify-between gap-4 px-4 print:hidden">
        <Link
          href="/"
          className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden>&larr;</span> {DATA.name}
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] text-muted-foreground sm:inline">
            One page, A4, real text
          </span>
          <PrintButton />
        </div>
      </div>

      {/* The shadow is the "sheet on a desk" cue and is screen-only; on paper the
          sheet IS the paper, so a drop shadow would print as a grey smudge. */}
      <div className="mx-auto w-fit max-w-full overflow-x-auto px-4 print:overflow-visible print:px-0">
        <div className="shadow-lg print:shadow-none">
          <Sheet />
        </div>
      </div>
    </div>
  );
}
