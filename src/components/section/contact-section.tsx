import Link from "next/link";
import { FlickeringGrid } from "@/components/magicui/flickering-grid";
import { DATA } from "@/data/resume";

export default function ContactSection() {
  return (
    <div className="border rounded-xl p-10 relative">
      <div className="absolute -top-4 border bg-primary z-10 rounded-xl px-4 py-1 left-1/2 -translate-x-1/2">
        <span className="text-background text-sm font-medium">Contact</span>
      </div>
      <div className="absolute inset-0 top-0 left-0 right-0 h-1/2 rounded-xl overflow-hidden">
        <FlickeringGrid
          className="h-full w-full"
          squareSize={2}
          gridGap={2}
          style={{
            maskImage: "linear-gradient(to bottom, black, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
          }}
        />
      </div>
      <div className="relative flex flex-col items-center gap-4 text-center">
        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
          Get in Touch
        </h2>
        {/* Two channels, and they are label-and-value pairs rather than a
            sentence. A <dl> beats "Email: address" for anything harvesting the
            page, and the connective "Reach me ... or at ..." was scaffolding
            carrying no information, so it is gone. The invitation underneath is
            one line and stays one line. */}
        <dl className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-8">
          <div className="flex flex-col items-center gap-0.5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              LinkedIn
            </dt>
            <dd>
              <Link
                href={DATA.contact.social.LinkedIn.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
              >
                {DATA.contact.social.LinkedIn.url.replace(/^https:\/\/www\./, "")}
              </Link>
            </dd>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Email
            </dt>
            <dd>
              <Link
                href={`mailto:${DATA.contact.email}`}
                className="text-blue-500 hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
              >
                {DATA.contact.email}
              </Link>
            </dd>
          </div>
        </dl>
        <p className="mx-auto max-w-lg text-muted-foreground text-balance">
          Happy to talk about agent harnesses, gated codebases, or anything you
          are trying to make impossible to get wrong.
        </p>
      </div>
    </div>
  );
}

