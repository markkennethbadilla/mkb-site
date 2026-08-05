"use client";

/**
 * Download as PDF, via the browser's own print-to-PDF.
 *
 * NOT a client-side PDF library, and that is the load-bearing decision on this
 * page. html2canvas and friends work by rasterising the DOM into an image and
 * wrapping it in a PDF - which produces a file whose text cannot be selected,
 * searched, or read by an applicant tracking system. Being readable by an ATS is
 * the entire reason this page exists, so a renderer that destroys the text would
 * defeat the page while appearing to work.
 *
 * window.print() against the @page rule in the sheet produces a real A4 PDF with
 * real text, costs zero bytes of bundle, and gets the user their own browser's
 * save dialog rather than a surprise download. The one thing it cannot do is name
 * the file, so document.title is set for the duration of the print and restored
 * afterwards - Chrome and Safari both use the title as the default filename.
 */
export default function PrintButton() {
  const download = () => {
    const previous = document.title;
    document.title = "Mark Kenneth Badilla - Resume";
    // Restoring on afterprint rather than straight after print() because print()
    // is synchronous in some browsers and deferred in others; the event fires in
    // both, and a listener that runs twice does no harm here.
    const restore = () => {
      document.title = previous;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  return (
    <button
      type="button"
      onClick={download}
      className="rounded-lg border border-border bg-card px-3.5 py-2 text-[13px] font-medium transition-colors hover:border-foreground/25 hover:bg-accent"
    >
      Download PDF
    </button>
  );
}
