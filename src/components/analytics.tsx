"use client";

import posthog from "posthog-js";
import { useEffect } from "react";

import { posthogOptions } from "@/lib/analytics";

export function Analytics() {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, posthogOptions);
  }, []);
  return null;
}
