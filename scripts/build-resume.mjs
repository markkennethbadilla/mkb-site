// Renders resume/resume.json (JSON Resume schema) with the pinned
// jsonresume-theme-stackoverflow into public/resume/index.html, then prints the
// same page to public/resume/mark-kenneth-badilla-resume.pdf with Playwright.
// Both outputs are gitignored build products; resume.json is the only source.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { render } from "jsonresume-theme-stackoverflow";
import { chromium } from "@playwright/test";

const ROOT = join(import.meta.dirname, "..");
const PUB = join(ROOT, "public");
const OUT = join(PUB, "resume");
const PDF = "mark-kenneth-badilla-resume.pdf";
const resume = JSON.parse(readFileSync(join(ROOT, "resume/resume.json"), "utf8"));
const { name, label } = resume.basics;

const head = `<head><meta name="description" content="${name}, ${label}. One-page resume, PDF at /resume/${PDF}."><link rel="alternate" type="application/pdf" href="/resume/${PDF}">`;
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "index.html"), render(resume).replace("<head>", head));

// The page asks for /me.png; answer every request straight from public/.
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route("http://resume.local/**", (r) =>
{
  const file = join(PUB, new URL(r.request().url()).pathname);
  return existsSync(file) ? r.fulfill({ path: file }) : r.fulfill({ status: 404 });
});
await page.goto("http://resume.local/resume/index.html", { waitUntil: "networkidle" });
await page.pdf({ path: join(OUT, PDF), format: "Letter", scale: 0.95 });
await browser.close();
console.log(`resume: ${OUT}`);
