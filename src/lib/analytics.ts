import type { PostHogConfig } from "posthog-js";

// Rule 91: record everything, mask only password fields.
export const posthogOptions = {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: "2026-08-30",
  person_profiles: "always",
  autocapture: true,
  capture_pageview: "history_change",
  capture_pageleave: true,
  capture_exceptions: true,
  capture_heatmaps: true,
  capture_dead_clicks: true,
  capture_performance: { web_vitals: true, network_timing: true },
  enable_recording_console_log: true,
  disable_session_recording: false,
  session_recording: {
    maskAllInputs: false,
    maskInputOptions: { password: true },
    recordHeaders: true,
    recordBody: true,
  },
} satisfies Partial<PostHogConfig>;
