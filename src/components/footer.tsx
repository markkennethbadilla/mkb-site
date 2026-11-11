import Link from "next/link";
import { DATA } from "@/data/resume";
import { Icons } from "@/components/icons";

export default function Footer() {
  return (
    <footer className="bg-card shadow-[var(--shadow-lift)]">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 py-6 text-sm text-muted-foreground sm:px-8 2xl:max-w-7xl">
        <span className="font-display text-base font-bold text-foreground">{DATA.name}</span>
        <a href={`mailto:${DATA.contact.email}`} className="hover:text-foreground">
          {DATA.contact.email}
        </a>
        <Link href="/resume" className="hover:text-foreground">
          Resume
        </Link>
        <a href={DATA.contact.social.GitHub.url} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="hover:text-foreground">
          <Icons.github className="size-4" />
        </a>
        <a href={DATA.contact.social.LinkedIn.url} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hover:text-foreground">
          <Icons.linkedin className="size-4" />
        </a>
        <span className="font-mono text-[0.6875rem] sm:ml-auto">built on Cloudflare Workers</span>
      </div>
    </footer>
  );
}
