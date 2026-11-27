"use client";

import { Button } from "@/components/ui/button";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

// Cycles system -> light -> dark; the icon shows the current choice, so every press visibly changes it.
const ORDER = ["system", "light", "dark"] as const;
type Mode = (typeof ORDER)[number];
const ICON = { system: Monitor, light: Sun, dark: Moon };
const NAME = { system: "follow system", light: "light", dark: "dark" };

export function ModeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const current: Mode = hydrated && ORDER.includes(theme as Mode) ? (theme as Mode) : "system";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = ICON[current];
  const label = `Theme: ${NAME[current]}. Switch to ${NAME[next]}`;

  return (
    <Button
      type="button"
      variant="link"
      size="icon"
      aria-label={label}
      title={label}
      className={cn(className)}
      onClick={() => setTheme(next)}
    >
      <Icon key={current} className="h-full w-full motion-safe:animate-in motion-safe:spin-in-90 motion-safe:fade-in motion-safe:duration-300" />
    </Button>
  );
}
