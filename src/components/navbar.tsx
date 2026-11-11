import { FileTextIcon } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export default function Navbar() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-end p-3 sm:p-5">
      <nav aria-label="Main" className="sheet pointer-events-auto flex items-center gap-1 rounded-full p-1">
        <a href="/resume/" className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold">
          <FileTextIcon className="size-4" aria-hidden />
          Resume
        </a>
        <ModeToggle className="size-9 rounded-full p-2.5 text-foreground" />
      </nav>
    </header>
  );
}
