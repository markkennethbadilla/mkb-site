import Link from "next/link";
import { FileTextIcon } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { DATA } from "@/data/resume";
import { logoSvg } from "@/lib/logo";

/**
 * A slim sticky header, server-rendered (2026-10-24 overhaul).
 *
 * It replaced the floating bottom dock, which sat on top of the content on a
 * phone and pulled the motion library plus a Radix tooltip per icon into the
 * homepage bundle. A header in the normal flow covers nothing, and every link
 * carries its own visible or aria name, so nothing depends on a hover tooltip.
 */
const SECTIONS = [
  { href: "/#work", label: "Work" },
  { href: "/#projects", label: "Demos" },
  { href: "/#skills", label: "Stack" },
  { href: "/#contact", label: "Contact" },
];

export default function Navbar() {
  const social = Object.values(DATA.contact.social).filter((s) => s.navbar);
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <nav aria-label="Main" className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-6">
        {/* The MKB circuit mark, the same SVG as the favicon (src/lib/logo.ts). Its
            dark squircle and gradient rim read on both themes. */}
        <Link
          href="/"
          aria-label="MKB, Mark Kenneth Badilla, home"
          className="block size-10 shrink-0"
          dangerouslySetInnerHTML={{ __html: logoSvg({ size: 40 }) }}
        />
        <ul className="ml-auto hidden items-center gap-5 text-sm text-muted-foreground md:flex">
          {SECTIONS.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="transition-colors hover:text-foreground">
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-1 md:ml-2">
          <Link
            href="/resume"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-sm font-medium text-background transition-opacity hover:opacity-85"
          >
            <FileTextIcon className="size-4" aria-hidden />
            Resume
          </Link>
          {social.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.name}
              className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
            >
              <s.icon className="size-4" />
            </a>
          ))}
          <ModeToggle className="size-9 p-2.5 text-muted-foreground" />
        </div>
      </nav>
    </header>
  );
}
