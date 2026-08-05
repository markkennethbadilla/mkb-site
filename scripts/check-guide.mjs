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
import { SECTIONS, SECTION_IDS, buildGuidePrompt } from "../src/lib/site-sections.ts";
import { checkGrounding, GROUNDING_CASES } from "../src/lib/grounding.ts";
import { PUBLIC_FACTS, FACTS_BRIEF, LICENSED_TERMS } from "../src/lib/public-facts.ts";
import { tokenise, similarity, SIMILARITY_CASES } from "../worker/cache.ts";

// Composed the same way the Worker composes it, so the gate tests what ships.
const GUIDE_SYSTEM_PROMPT = buildGuidePrompt(FACTS_BRIEF);

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
  "whatever tool speaks to the visitor runs the grounding check",
  !/(respond|answer):\s*tool\(/.test(toolsSrc) || /checkGrounding\(/.test(toolsSrc),
  "worker/guide-tools.ts has a tool that produces visitor-facing text without calling checkGrounding. Unchecked, a model with gaps in its facts fills them - the first version produced a university Mark never attended and an employer he never worked for."
);
check(
  "rejected answers never reach the visitor",
  !/(respond|answer):\s*tool\(/.test(toolsSrc) || /decision\.rejected\.push/.test(toolsSrc),
  "An ungrounded answer must be recorded and discarded, not silently used."
);
// Latency is a correctness property here: two sequential model calls at 3-6s each
// is what made the guide feel broken. One tool carrying both the destination and
// the words is what keeps an answer to a single round trip.
const guideSrc = read("worker/guide.ts");
check(
  "an answer costs one model round trip",
  /const MAX_STEPS = 1;/.test(guideSrc),
  "MAX_STEPS is above 1, so an answer can cost more than one sequential model call. Each round trip from Cloudflare to the inference endpoint measured 3 to 6 seconds."
);

// The grounding check itself, run on the fabrications that actually happened.
for (const c of GROUNDING_CASES) {
  const verdict = checkGrounding(c.answer, LICENSED_TERMS);
  check(
    `grounding ${c.grounded ? "accepts" : "rejects"}: "${c.answer.slice(0, 52)}..."`,
    verdict.grounded === c.grounded,
    `${c.why} Got grounded=${verdict.grounded}` +
      (verdict.grounded ? "" : ` (unlicensed: ${verdict.unlicensed.join(", ")})`)
  );
}

// Facts are a closed set; an empty one silently turns the guide back into the
// version that had nothing to say and invented instead.
check(
  "the fact corpus is populated",
  PUBLIC_FACTS.length >= 10,
  `Only ${PUBLIC_FACTS.length} facts. The guide answers from this and nothing else.`
);
check(
  "no fact leaks an age or date of birth",
  !PUBLIC_FACTS.some((f) => /\bage\b|born|birth|\b\d{1,2} years old\b/i.test(f.text)),
  "Age was deliberately excluded: he targets senior roles at 1.5 years' experience, and an age invites pre-screening."
);

// The cache threshold, on the pairs it has to get right.
for (const c of SIMILARITY_CASES) {
  const score = similarity(tokenise(c.a), tokenise(c.b));
  const same = score >= 0.5;
  check(
    `cache ${c.same ? "merges" : "separates"}: "${c.a}" / "${c.b}"`,
    same === c.same,
    `similarity ${score.toFixed(2)} against a 0.5 threshold.`
  );
}

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
