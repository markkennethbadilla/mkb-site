// Static gate for the site guide. Runs with no network and no model.
//
// Each check exists because of a specific way this feature can silently become a
// lie: shipping the offline fixture as if it were the agent, letting the model
// author claims about Mark again, or routing to a section that is not on the page.
//
// This was scripts/check-guide.mjs, which carried its own eight-line pass/fail
// harness, its own failures array and its own process.exit. Two other scripts
// carried an identical copy. node:test is in the standard library and does all
// three jobs, so the harness is gone and every assertion below is the one that
// was already here.
//
// Usage: node --test tests/

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SECTIONS, SECTION_IDS, SUGGESTIONS, buildGuidePrompt } from "../src/lib/site-sections.ts";
import { checkGrounding, GROUNDING_CASES } from "../src/lib/grounding.ts";
import { PUBLIC_FACTS, FACTS_BRIEF, LICENCE } from "../src/lib/public-facts.ts";
import { tokenise, similarity, SIMILARITY_CASES } from "../worker/cache.ts";
import { guardSql, HOSTILE_SQL, ALLOWED_SQL } from "../src/lib/sql-guard.ts";

// Composed the same way the Worker composes it, so the gate tests what ships.
const GUIDE_SYSTEM_PROMPT = buildGuidePrompt(FACTS_BRIEF);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

describe("the fixture is not what ships", () => {
  // The fixture must not be what ships. It is a keyword table; presenting it as
  // an agent is the exact overclaim this site is built to argue against.
  test("MOCK_MODE is off", () => {
    const mock = read("src/components/demo/agent-run.mock.ts");
    assert.ok(
      /export const MOCK_MODE = false;/.test(mock),
      "agent-run.mock.ts still has MOCK_MODE = true, which would ship the offline keyword fixture as if it were the agent."
    );
  });
});

describe("the model cannot assert anything about Mark", () => {
  // The model must have no way to assert anything about Mark. An `answer` tool
  // was removed after every free model used it to invent a university and an
  // employer; this is what notices if it comes back.
  //
  // Read as SOURCE, not imported. Partly because worker/ uses extensionless
  // imports that Node will not resolve, but mostly because a gate that asks the
  // module what it exports can be satisfied by a module that lies; one that reads
  // the file cannot.
  const toolsSrc = read("worker/guide-tools.ts");

  test("whatever tool speaks to the visitor runs the grounding check", () => {
    assert.ok(
      !/(respond|answer):\s*tool\(/.test(toolsSrc) || /checkGrounding\(/.test(toolsSrc),
      "worker/guide-tools.ts has a tool that produces visitor-facing text without calling checkGrounding. Unchecked, a model with gaps in its facts fills them - the first version produced a university Mark never attended and an employer he never worked for."
    );
  });

  test("rejected answers never reach the visitor", () => {
    assert.ok(
      !/(respond|answer):\s*tool\(/.test(toolsSrc) || /decision\.rejected\.push/.test(toolsSrc),
      "An ungrounded answer must be recorded and discarded, not silently used."
    );
  });

  // Latency is a correctness property here: two sequential model calls at 3-6s each
  // is what made the guide feel broken. One tool carrying both the destination and
  // the words is what keeps an answer to a single round trip.
  test("an answer costs one model round trip", () => {
    const guideSrc = read("worker/guide.ts");
    assert.ok(
      /const MAX_STEPS = 1;/.test(guideSrc),
      "MAX_STEPS is above 1, so an answer can cost more than one sequential model call. Each round trip from Cloudflare to the inference endpoint measured 3 to 6 seconds."
    );
  });
});

describe("grounding", () => {
  // The grounding check itself, run on the fabrications that actually happened.
  for (const c of GROUNDING_CASES) {
    test(`grounding ${c.grounded ? "accepts" : "rejects"}: "${c.answer.slice(0, 52)}..."`, () => {
      const verdict = checkGrounding(c.answer, LICENCE);
      assert.equal(
        verdict.grounded,
        c.grounded,
        `${c.why} Got grounded=${verdict.grounded}` +
          (verdict.grounded ? "" : ` (unlicensed: ${verdict.unlicensed.join(", ")})`)
      );
    });
  }
});

describe("suggestion chips", () => {
  // A suggestion chip that routes nowhere is quiet rot: one of these pointed at the
  // gate-harness section for a while after that section came off the page. There is
  // no cheap way to prove a model will answer a given chip, but there IS a cheap way
  // to prove the corpus contains the material - every chip must share a distinctive
  // word with some fact or some section summary.
  const CORPUS = (
    PUBLIC_FACTS.map((f) => f.text).join(" ") +
    " " +
    SECTIONS.map((s) => `${s.id} ${s.summary}`).join(" ")
  ).toLowerCase();
  const CHIP_STOP = new Set([
    "what", "where", "when", "who", "how", "does", "do", "did", "is", "are", "was",
    "he", "his", "him", "the", "a", "an", "to", "of", "in", "on", "at", "for", "with",
    "and", "or", "i", "get", "go", "any", "it", "right", "now", "actually", "know",
  ]);

  for (const chip of SUGGESTIONS) {
    test(`suggestion is answerable: "${chip}"`, () => {
      const words = chip.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !CHIP_STOP.has(w));
      // One word is enough, and raising it to two was tried and reverted: it failed
      // "Where did he go to school?", which is the most precisely aimed chip on the
      // page. A good chip is SHORT, so counting matches measures brevity rather than
      // answerability. What this catches is the failure it was written for - a chip
      // aimed at material that is no longer in the corpus, which is how one of them
      // ended up pointing at the gate-harness section for a while after that section
      // came off the page.
      const covered = words.filter((w) => CORPUS.includes(w));
      assert.ok(
        covered.length >= 1,
        `No word in this chip appears anywhere in the fact corpus or the section summaries, so the guide has nothing to answer it with. Words checked: ${words.join(", ") || "(none)"}.`
      );
    });
  }
});

describe("the fact corpus", () => {
  // Facts are a closed set; an empty one silently turns the guide back into the
  // version that had nothing to say and invented instead.
  test("the fact corpus is populated", () => {
    assert.ok(
      PUBLIC_FACTS.length >= 10,
      `Only ${PUBLIC_FACTS.length} facts. The guide answers from this and nothing else.`
    );
  });

  test("no fact leaks an age or date of birth", () => {
    assert.ok(
      !PUBLIC_FACTS.some((f) => /\bage\b|born|birth|\b\d{1,2} years old\b/i.test(f.text)),
      "Age was deliberately excluded: it invites a judgement about the work that has nothing to do with the work, and in most markets an employer cannot ask for it at all."
    );
  });

  // Every multi-digit number a fact WRITES has to be a number that fact LICENSES.
  // Without this the corpus can drift ahead of the licence: a fact gains a figure,
  // the model repeats the fact verbatim, and the grounding check throws out a
  // sentence the corpus itself supplied. The guide then silently gets quieter with
  // no failure anywhere.
  for (const fact of PUBLIC_FACTS) {
    test(`fact "${fact.id}" licenses every figure it states`, () => {
      const written = [...fact.text.replace(/(\d),(?=\d{3}\b)/g, "$1").matchAll(/\b(\d{2,})\b/g)].map((m) => m[1]);
      const licensed = new Set((fact.figures ?? []).map((f) => f.value));
      const missing = written.filter((n) => !licensed.has(n));
      assert.equal(
        missing.length,
        0,
        `Writes ${missing.join(", ")} but does not license it. Add a figures entry binding it to what it measures.`
      );
    });
  }

  // A binding with no companion words licenses the figure everywhere, which is the
  // flat pool this design replaced. An empty `near` is worse than no entry at all,
  // because it looks bound.
  for (const fact of PUBLIC_FACTS) {
    for (const figure of fact.figures ?? []) {
      test(`figure ${figure.value} in "${fact.id}" is bound to something`, () => {
        assert.ok(
          figure.near.length > 0 && figure.near.every((w) => /^[a-z.]+$/.test(w)),
          "A figure with no companion words is licensed in any sentence, which is exactly the failure the binding exists to stop. Companions must be lowercase single words."
        );
      });
    }
  }
});

describe("contract clause 4.1", () => {
  // Contract clause 4.1 covers proprietary and operational information. The guide is
  // a broadcast surface, so this is the last place a system name, a client, a
  // provider or a live hostname can be caught before it is published under Mark's
  // own domain. A rule without a gate is a comment.
  const FORBIDDEN = [
    "nexus", "autobots", "recon", "workstackos", "weassist.uk", "hetzner",
    "netcup", "vultr", "recall.ai", "gohighlevel", "teramind", "clickup",
    "breezy", "pinecone", "apollo", "churn", "cve-",
  ];
  // Whole words only. A bare substring test failed "reconstruct an application's
  // route map" on the internal name "recon", which is the shape of false positive
  // that gets a gate weakened rather than fixed.
  const FORBIDDEN_RE = FORBIDDEN.map(
    (term) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
  );

  for (const fact of PUBLIC_FACTS) {
    test(`fact "${fact.id}" names no employer internal`, () => {
      const hit = FORBIDDEN.filter((_, i) => FORBIDDEN_RE[i].test(fact.text));
      assert.equal(
        hit.length,
        0,
        `Contains ${hit.join(", ")}. Internal system names, client names, hosting providers, live hostnames and incident specifics stay off this site - see the header of src/lib/public-facts.ts.`
      );
    });
  }

  // The same list, over the page copy. The guide's corpus is the careful surface;
  // the resume text is the one a visitor reads without asking anything, and it is
  // where a paragraph gets pasted in from a CV draft that was written for a named
  // recruiter rather than for the open internet.
  //
  // PROSE ONLY, and the length threshold is what makes that precise. The risk this
  // guards is a SENTENCE that describes an employer's systems - "we run X" - not a
  // one-word entry in a skills inventory. A tool he can use is a transferable skill
  // and belongs on a resume; a tool an employer subscribes to is clause 4.1 material
  // and does not. Scanning every string in the file conflated those two and failed on
  // "GoHighLevel" sitting in a list beside "n8n" and "Figma".
  //
  // It also stopped scanning comments, which it never should have: the first version
  // failed on a comment whose entire purpose was to record WHY Apollo, Teramind,
  // ClickUp and Breezy are excluded. A guard that fires on its own documentation
  // teaches people to delete the documentation.
  // Comments are stripped BEFORE the strings are extracted, and the order matters.
  // A quoted phrase inside a comment - this file quotes Mark - opens a match that
  // then runs through the surrounding comment text until the next quote, so the
  // scanner read a paragraph of prose that does not exist and failed on words that
  // only appear in a note explaining why they are excluded.
  const PROSE_MIN = 60;
  test(`page prose names no employer internal (strings over ${PROSE_MIN} chars)`, () => {
    const resumeSrc = read("src/data/resume.tsx")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const resumeProse = [...resumeSrc.matchAll(/"((?:[^"\\]|\\.){60,})"/g)].map((m) => m[1]).join("\n");
    const resumeHits = FORBIDDEN.filter((_, i) => FORBIDDEN_RE[i].test(resumeProse));
    assert.equal(
      resumeHits.length,
      0,
      `src/data/resume.tsx prose contains ${resumeHits.join(", ")}.`
    );
  });
});

describe("the answer cache", () => {
  // The cache threshold, on the pairs it has to get right.
  for (const c of SIMILARITY_CASES) {
    test(`cache ${c.same ? "merges" : "separates"}: "${c.a}" / "${c.b}"`, () => {
      const score = similarity(tokenise(c.a), tokenise(c.b));
      const same = score >= 0.5;
      assert.equal(same, c.same, `similarity ${score.toFixed(2)} against a 0.5 threshold.`);
    });
  }
});

describe("sections and the prompt", () => {
  // Arrival copy has to exist and has to be written, not generated.
  for (const s of SECTIONS) {
    test(`section "${s.id}" has written arrival copy`, () => {
      assert.ok(
        typeof s.bubble === "string" && s.bubble.trim().length > 0,
        "Every section needs a bubble line, since the model no longer writes one."
      );
    });
  }

  // Every destination the model can choose must actually be on the page. A
  // section id that does not render is a scroll to nowhere, and the failure is
  // invisible until a visitor asks that exact question.
  // The home page moved into a (site) route group when the exhibition rooms landed:
  // the rooms need a wider stage and no dock, and a route group decides that at build
  // time instead of undoing it after hydration.
  const page = read("src/app/(site)/page.tsx");
  for (const id of SECTION_IDS) {
    test(`section "${id}" exists in page.tsx`, () => {
      assert.ok(
        page.includes(`id="${id}"`),
        `SECTION_IDS offers "${id}" but no element on the page has that id.`
      );
    });
  }

  // The prompt is generated from the section list; if that link were ever broken
  // the model would be routing against a stale menu.
  for (const id of SECTION_IDS) {
    test(`prompt describes "${id}"`, () => {
      assert.ok(
        GUIDE_SYSTEM_PROMPT.includes(`- ${id}:`),
        "The system prompt no longer lists this section, so the model cannot choose it."
      );
    });
  }
});

describe("the SQL guard", () => {
  // The SQL guard carried its own hostile corpus and nothing ran it. A guard nobody
  // exercises is indistinguishable from a comment, and this one now protects live
  // per-visitor arena rows added by migration 0004, so it needs to be proven in both
  // directions on every build - refusing what it must refuse, and allowing what it
  // must allow. A guard that only ever refuses is easy to write and useless.
  //
  // The corpora are READ FROM THE GUARD'S OWN MODULE rather than copied here, so a
  // bypass case added to HOSTILE_SQL is asserted the moment it is written. That is
  // what makes this cheap to extend: adding a case is a one-line edit in one file.
  for (const c of HOSTILE_SQL) {
    test(`sql guard refuses: ${c.label}`, () => {
      const v = guardSql(c.sql);
      assert.ok(
        !v.ok && v.rule === c.rule,
        v.ok ? `ALLOWED it. Expected rule "${c.rule}".` : `Refused with "${v.rule}", expected "${c.rule}".`
      );
    });
  }

  for (const c of ALLOWED_SQL) {
    test(`sql guard allows: ${c.label}`, () => {
      const v = guardSql(c.sql);
      assert.ok(v.ok, v.ok ? "" : `Refused a legitimate query with "${v.rule}": ${v.reason}`);
    });
  }

  // The corpora themselves must not quietly empty out. A guard proven against an
  // empty list passes forever and protects nothing, and that is exactly what the
  // two for-loops above become if the arrays are ever deleted.
  //
  // The floors are set well under the current counts on purpose. They are a guard
  // against the corpus disappearing, not a target, and a floor pinned to today's
  // exact number turns every legitimate rewrite of the guard into a red build.
  test("the hostile corpus is populated", () => {
    assert.ok(
      HOSTILE_SQL.length >= 8,
      `Only ${HOSTILE_SQL.length} hostile cases. Every loop above becomes vacuous as this shrinks.`
    );
  });

  test("the allowed corpus is populated", () => {
    assert.ok(
      ALLOWED_SQL.length >= 5,
      `Only ${ALLOWED_SQL.length} allowed cases. A guard that only ever refuses is easy to write and useless.`
    );
  });
});
