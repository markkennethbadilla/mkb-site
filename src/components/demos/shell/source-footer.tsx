import Link from "next/link";
import { nextRoom, sourceLink, REPO_URL, type DemoRoom } from "@/lib/demos/registry";

/**
 * How to leave, and where to read the code.
 *
 * Leaving is authored rather than left to the back button: the corridor control
 * names the NEXT room and what it promises, in a fixed order chosen by how much a
 * reader has to hold in their head, not by how impressive each one is.
 *
 * The source links point at FILES, not at the repository root. "Here is the repo"
 * is an invitation to go looking; "start with worker/demos/ledger.ts, the
 * difference between the two paths is one SQL statement" is an invitation to read.
 * scripts/check-demos.mjs asserts every one of those paths resolves to a real file,
 * because a source link that rots after a rename is a quiet overclaim - it still
 * says "inspectable" while pointing at a 404.
 *
 * Rooms link to source and to each other, never to /#work. A live demonstration of
 * transactional integrity sitting next to a link to the site's least-evidenced
 * transactional claim would manufacture exactly the inference the wall label exists
 * to prevent.
 */
export default function SourceFooter({ room }: { room: DemoRoom }) {
  const next = nextRoom(room.slug);

  return (
    <footer className="mt-14 space-y-8 border-t border-border pt-8">
      {next ? (
        <Link
          href={`/demos/${next.slug}`}
          className="group block rounded-xl border border-border bg-card/50 p-5 transition-colors hover:border-foreground/25 hover:bg-card"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Next room
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-lg font-semibold tracking-tight">{next.name}</span>
            <span aria-hidden className="text-muted-foreground transition-transform group-hover:translate-x-0.5">
              &rarr;
            </span>
          </div>
          <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-muted-foreground">
            {next.capability}
          </p>
        </Link>
      ) : (
        <Link
          href="/demos"
          className="group block rounded-xl border border-border bg-card/50 p-5 transition-colors hover:border-foreground/25 hover:bg-card"
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            That is all three
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-lg font-semibold tracking-tight">Back to the gallery</span>
            <span aria-hidden className="text-muted-foreground transition-transform group-hover:translate-x-0.5">
              &rarr;
            </span>
          </div>
        </Link>
      )}

      <div className="space-y-2.5">
        <p className="text-[13px] leading-relaxed text-muted-foreground">{room.readFirst}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {room.sourceFiles.map((path) => (
            <li key={path}>
              <a
                href={sourceLink(path)}
                target="_blank"
                rel="noreferrer noopener"
                className="font-mono text-[11px] text-foreground/75 underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/50"
              >
                {path}
              </a>
            </li>
          ))}
          <li>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="font-mono text-[11px] text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
            >
              whole repository
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
