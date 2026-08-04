// Static gate for the site guide. Runs with no network and no model.
//
// Each check exists because of a specific way this feature can silently become a
// lie: shipping the offline fixture as if it were the agent, letting the model
// author claims about Mark again, or routing to a section that is not on the page.
//
// Usage: node scripts/check-guide.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SECTIONS, SECTION_IDS, GUIDE_SYSTEM_PROMPT } from "../src/lib/site-sections.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const failures = [];
const check = (name, ok, detail) => {
  if (ok) console.log(`  pass  ${name}`);
  else {
    console.log(`  FAIL  ${name}\n        ${detail}`);
    failures.push(name);
  }
};

console.log("site guide gate\n");

// 1. The fixture must not be what ships. It is a keyword table; presenting it as
//    an agent is the exact overclaim this site is built to argue against.
const mock = read("src/components/demo/agent-run.mock.ts");
check(
  "MOCK_MODE is off",
  /export const MOCK_MODE = false;/.test(mock),
  "agent-run.mock.ts still has MOCK_MODE = true, which would ship the offline keyword fixture as if it were the agent."
);

// 2. The model must have no way to assert anything about Mark. An `answer` tool
//    was removed after every free model used it to invent a university and an
//    employer; this is what notices if it comes back.
//
//    Read as SOURCE, not imported. Partly because worker/ uses extensionless
//    imports that Node will not resolve, but mostly because a gate that asks the
//    module what it exports can be satisfied by a module that lies; one that reads
//    the file cannot.
const toolsSrc = read("worker/guide-tools.ts");
check(
  "no tool lets the model author claims",
  !/^\s*answer:\s*tool\(/m.test(toolsSrc),
  "worker/guide-tools.ts defines an `answer` tool again. The model is told no facts about Mark, so given a way to write prose it invents them - it produced a university he never attended and an employer he never worked for."
);
const allowed = toolsSrc.match(/ALLOWED_TOOLS = \[([^\]]*)\]/)?.[1] ?? "";
check(
  "the allowlist matches the toolbox",
  !allowed.includes("answer") && allowed.includes("navigate_to_section") && allowed.includes("decline"),
  `ALLOWED_TOOLS reads [${allowed.trim()}].`
);

// 3. Arrival copy has to exist and has to be written, not generated.
for (const s of SECTIONS) {
  check(
    `section "${s.id}" has written arrival copy`,
    typeof s.bubble === "string" && s.bubble.trim().length > 0,
    "Every section needs a bubble line, since the model no longer writes one."
  );
}

// 4. Every destination the model can choose must actually be on the page. A
//    section id that does not render is a scroll to nowhere, and the failure is
//    invisible until a visitor asks that exact question.
const page = read("src/app/page.tsx");
for (const id of SECTION_IDS) {
  check(
    `section "${id}" exists in page.tsx`,
    page.includes(`id="${id}"`),
    `SECTION_IDS offers "${id}" but no element on the page has that id.`
  );
}

// 5. The prompt is generated from the section list; if that link were ever broken
//    the model would be routing against a stale menu.
for (const id of SECTION_IDS) {
  check(
    `prompt describes "${id}"`,
    GUIDE_SYSTEM_PROMPT.includes(`- ${id}:`),
    "The system prompt no longer lists this section, so the model cannot choose it."
  );
}

console.log(
  failures.length ? `\n${failures.length} failed\n` : `\nall checks passed\n`
);
process.exit(failures.length ? 1 : 0);
