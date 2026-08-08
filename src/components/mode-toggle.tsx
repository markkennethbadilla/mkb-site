"use client";

import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ModeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const next = theme === "dark" ? "light" : "dark";

  return (
    <Button
      type="button"
      variant="link"
      size="icon"
      // Names what pressing it does, and to what. An icon-only button with no
      // accessible name is announced as bare "button".
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={cn(className)}
      onClick={() => setTheme(next)}
    >
      <SunIcon className="h-full w-full" />
      <MoonIcon className="hidden h-full w-full" />
    </Button>
  );
}
