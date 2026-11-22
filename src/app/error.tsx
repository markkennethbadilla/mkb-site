"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

import { recoverFromStaleBuild } from "@/lib/stale-build";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    if (recoverFromStaleBuild(error, sessionStorage, () => location.reload())) return;
    posthog.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-xl px-5 py-24">
      <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">The page hit an error. It has been reported.</p>
      <button type="button" onClick={reset} className="mt-4 underline">
        Try again
      </button>
    </main>
  );
}
