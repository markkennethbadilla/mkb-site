// Every outbound link on the site, fetched. Networked, so it is NOT in `check` -
// a build gate that needs the internet fails on a train.
//
// Usage: node scripts/check-links.mjs
//
// WHY IT EXISTS. The skills section links fifty-odd technologies to their own
// sites, written from memory in one sitting, which is fifty-odd chances to ship a
// dead link on a page whose entire argument is that claims can be checked. The
// first run found four: two URLs that were simply wrong, and two that were fine.
//
// THE 403 PROBLEM, and why this does not just assert res.ok. Several vendors -
// OpenAI among them - return 403 to anything that does not look like a browser.
// Treating that as a broken link would have sent someone hunting for a replacement
// for a page that works perfectly, so a 403 is reported as UNVERIFIABLE rather
// than failed, and the exit code ignores it. Only a 404, a 410 or a connection
// failure is a real defect here.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const source = read("src/data/resume.tsx");
const block = source.slice(source.indexOf("resumeSkills:"), source.indexOf("certifications:"));
const links = [...block.matchAll(/\{ name: "([^"]+)"[^}]*?url: "([^"]+)"/g)].map((m) => ({
  name: m[1],
  url: m[2],
}));

// The room source links live in the registry and are checked by probe-demos.mjs
// against the real Worker; this file owns the outbound ones only.
console.log(`outbound links: ${links.length}\n`);

let broken = 0;
let unverifiable = 0;

async function check({ name, url }) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; mkb-site link check)" },
    });
    if (res.ok) return;
    if (res.status === 403 || res.status === 429) {
      unverifiable++;
      console.log(`  ${res.status}   ${name} - blocks automated requests, open it by hand`);
      return;
    }
    broken++;
    console.log(`  FAIL  ${res.status} ${name}\n        ${url}`);
  } catch (e) {
    broken++;
    console.log(`  FAIL  ${name} did not resolve\n        ${url}\n        ${String(e).slice(0, 90)}`);
  }
}

for (let i = 0; i < links.length; i += 8) {
  await Promise.all(links.slice(i, i + 8).map(check));
}

console.log(
  broken
    ? `\n${broken} broken${unverifiable ? `, ${unverifiable} unverifiable` : ""}\n`
    : `\nall ${links.length} resolve${unverifiable ? ` (${unverifiable} unverifiable, checked by hand)` : ""}\n`
);
process.exit(broken ? 1 : 0);
