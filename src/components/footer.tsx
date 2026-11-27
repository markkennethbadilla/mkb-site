import { DATA } from "@/data/resume";
import { Icons } from "@/components/icons";

export default function Footer() {
  return (
    <footer className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-8 text-sm text-muted-foreground sm:px-8">
      <span>
        &copy; 2026 / <span className="text-foreground">{DATA.name}</span> / Built on Cloudflare Workers
      </span>
      <span className="flex items-center gap-4 sm:ml-auto">
        <a href="/resume/" className="hover:text-foreground">
          Resume
        </a>
        <a href={DATA.contact.social.GitHub.url} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="hover:text-foreground">
          <Icons.github className="size-4" />
        </a>
        <a href={DATA.contact.social.LinkedIn.url} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hover:text-foreground">
          <Icons.linkedin className="size-4" />
        </a>
        <a href={`mailto:${DATA.contact.email}`} aria-label="Email" className="hover:text-foreground">
          <Icons.email className="size-4" />
        </a>
      </span>
    </footer>
  );
}
