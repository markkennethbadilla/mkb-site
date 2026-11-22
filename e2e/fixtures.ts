import { globSync } from "node:fs";

export { expect, test } from "@playwright/test";

// /resume/ is written by scripts/build-resume.mjs, not by a page.tsx.
export const ROUTES = [
  ...globSync("src/app/**/page.tsx")
    .map((file) => file.replaceAll("\\", "/").slice("src/app".length, -"page.tsx".length))
    .map((route) => route.replace(/\([^)]+\)\//g, ""))
    .filter((route) => !route.includes("[")),
  "/resume/",
].sort();

/** Each test is a distinct visitor to the edge rate limiter (worker/budget.ts keys on cf-connecting-ip). */
export const asVisitor = (ip: string) => ({ extraHTTPHeaders: { "cf-connecting-ip": ip } });
