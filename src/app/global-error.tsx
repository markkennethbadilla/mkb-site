"use client";

import "./globals.css";

import posthog from "posthog-js";
import { useEffect } from "react";

import { recoverFromStaleBuild } from "@/lib/stale-build";

export default function GlobalError({ error }: { error: Error }) {
  useEffect(() => {
    if (recoverFromStaleBuild(error, sessionStorage, () => location.reload())) return;
    posthog.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="p-4">
        <main>
          <h1>Something went wrong</h1>
          <p>The site hit an error. It has been reported. Please reload the page.</p>
        </main>
      </body>
    </html>
  );
}
