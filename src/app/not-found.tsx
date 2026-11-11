import Link from "next/link";
import { ArrowRight, Home } from "lucide-react";
import { OPEN_ROOMS } from "@/lib/demos/registry";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col justify-center gap-8 px-5 py-28 sm:px-8">
      <div className="rounded-[2rem] bg-paper-1 px-4 pt-8 shadow-[var(--shadow-lift)] sm:px-10 sm:pt-12">
        <div
          className="mx-auto flex max-w-md flex-col items-center rounded-t-[10rem] px-5 pt-16 pb-10 text-center text-lit-ink shadow-[var(--shadow-slot)]"
          style={{ background: "radial-gradient(ellipse 70% 60% at 50% 55%, var(--glow-soft) 0%, var(--glow) 100%)" }}
        >
          <p className="font-display text-7xl font-extrabold leading-none tracking-tight sm:text-8xl">404</p>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight">Page not found</h1>
          <Link href="/" className="btn-cut mt-6 bg-paper-1 text-white">
            <Home className="size-4" aria-hidden /> Go home
          </Link>
        </div>
      </div>
      <div>
        <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Looking for a demo?</p>
        <ul className="mt-3 grid gap-3">
          {OPEN_ROOMS.map((room) => (
            <li key={room.slug}>
              <Link href={`/demos/${room.slug}`} className="sheet sheet-lift flex items-center gap-4 p-4">
                <span className="min-w-0 flex-1">
                  <span className="ink-link block font-display text-lg font-bold tracking-tight">{room.name}</span>
                  <span className="mt-1 block text-sm leading-snug text-muted-foreground">{room.capability}</span>
                </span>
                <ArrowRight className="size-4 shrink-0" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
