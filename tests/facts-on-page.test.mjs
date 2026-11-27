// Every name a guide fact licenses appears in what the page renders, so an answer cannot drift from the page. Prior-art: scripts/check-guide.mjs checks chips against the corpus -> this checks the corpus against the page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PUBLIC_FACTS } from "../src/lib/public-facts.ts";

const PAGE = ["src/data/resume.tsx", "src/app/(site)/page.tsx", "src/lib/demos/registry.ts", "src/components/footer.tsx", "resume/resume.json"]
  .map((p) => readFileSync(join(import.meta.dirname, "..", p), "utf8"))
  .join("\n");

// Terms on purpose not on the page: an alias the answer check accepts, or a fact Mark gave that the page does not show.
const OFF_PAGE = new Set(["Postgres", "Windows", "macOS", "green", "OST", "OSTs"]);

test("every fact term is on the page or knowingly off it", () => {
  const drift = PUBLIC_FACTS.flatMap((f) => f.terms.filter((t) => !OFF_PAGE.has(t) && !PAGE.includes(t)).map((t) => `${f.id}: ${t}`));
  assert.deepEqual(drift, []);
});

test("the check catches a term the page does not show", () => {
  assert.equal(PAGE.includes("APAC"), false);
});
