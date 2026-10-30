// Renders resume/resume.json (JSON Resume schema) with the pinned
// jsonresume-theme-stackoverflow into public/resume/index.html, then prints the
// same page to public/resume/mark-kenneth-badilla-resume.pdf with Playwright.
// Both outputs are gitignored build products; resume.json is the only source.
import { existsSync, unlinkSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { render } from "jsonresume-theme-stackoverflow";
import { chromium } from "@playwright/test";

const ROOT = join(import.meta.dirname, "..");
const PUB = join(ROOT, "public");
const OUT = join(PUB, "resume");
const PDF = "mark-kenneth-badilla-resume.pdf";
const resume = JSON.parse(readFileSync(join(ROOT, "resume/resume.json"), "utf8"));
const { name, label } = resume.basics;

// nosemgrep: html-in-template-string
const head = `<head><meta name="description" content="${name}, ${label}. One-page resume, PDF at /resume/${PDF}."><link rel="alternate" type="application/pdf" href="/resume/${PDF}">`;

// Three string fixes to the theme's fixed <head> (it has no option for them; a
// rehype pipeline for three attributes would be more to maintain than this). Each
// throws if the theme changes, so a theme bump cannot silently undo it.
//   1. viewport without user-scalable=no (Lighthouse a11y meta-viewport)
//   2. Font Awesome CSS loads without blocking first paint (mobile speed)
//   3. drop the theme's ./override.css link, a 404 that also blocks paint
const FIXES = [
  [", user-scalable=no", ""],
  ['referrerpolicy="no-referrer">', `referrerpolicy="no-referrer" media="print" onload="this.media='all'">`],
  ['<link rel="stylesheet" href="./override.css">', ""],
];
const fix = (html) => FIXES.reduce((h, [from, to]) => {
  if (!h.includes(from)) throw new Error(`build-resume: theme head changed, "${from}" not found`);
  return h.replace(from, to);
}, html);

// The web page gets a "Download PDF" entry in the contact profiles; the PDF does not.
const web = structuredClone(resume);
web.basics.profiles.push({ network: "PDF", username: "Download PDF", url: `/resume/${PDF}` });
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "index.html"), fix(render(web)).replace("<head>", head));
writeFileSync(join(OUT, "print.html"), fix(render(resume)));

// The page asks for /me.png; answer every request straight from public/.
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route("http://resume.local/**", (r) =>
{
  const file = join(PUB, new URL(r.request().url()).pathname);
  return existsSync(file) ? r.fulfill({ path: file }) : r.fulfill({ status: 404 });
});
await page.goto("http://resume.local/resume/print.html", { waitUntil: "networkidle" });
await page.pdf({ path: join(OUT, PDF), format: "Letter", scale: 0.95 });
await browser.close();
unlinkSync(join(OUT, "print.html"));
console.log(`resume: ${OUT}`);
