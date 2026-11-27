"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BriefcaseIcon, FileTextIcon, HomeIcon, LayoutGridIcon, UserRoundIcon } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

const LINKS = [
  { href: "/#about", label: "About", Icon: UserRoundIcon },
  { href: "/#work", label: "Work", Icon: BriefcaseIcon },
  { href: "/#projects", label: "Projects", Icon: LayoutGridIcon },
  { href: "/resume/", label: "Resume", Icon: FileTextIcon },
];

const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", second: "2-digit" });

function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span data-clock className="tabular-nums">{now}</span>;
}

export default function Navbar() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 p-3 text-sm sm:p-5">
      <span className="hidden min-w-24 text-muted-foreground md:block">Cebu City</span>
      <nav aria-label="Main" className="sheet pointer-events-auto mx-auto flex min-w-0 max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-1 shadow-[var(--shadow-lift)] [scrollbar-width:none] md:mx-0">
        <Link href="/" aria-label="Home" className="inline-flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-muted">
          <HomeIcon className="size-4" aria-hidden />
        </Link>
        <span aria-hidden className="mx-1 h-5 w-px bg-border" />
        {LINKS.map(({ href, label, Icon }) => (
          <a key={href} href={href} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 font-medium hover:bg-muted sm:px-3">
            <Icon className="size-4" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
            <span className="sr-only sm:hidden">{label}</span>
          </a>
        ))}
        <span aria-hidden className="mx-1 h-5 w-px bg-border" />
        <ModeToggle className="size-9 shrink-0 rounded-full p-2.5 text-foreground" />
      </nav>
      <span className="hidden min-w-24 text-right text-muted-foreground md:block">
        <Clock />
      </span>
    </header>
  );
}
