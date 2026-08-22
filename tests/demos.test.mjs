// Static gate for the exhibition rooms. No network, no model, no database.
//
// Every check here exists because of a specific way a room can quietly become a
// claim it has not earned: a wall label with a slot left empty, a rigged demo that
// never says it is rigged, a source link that rots after a rename, a handler that
// forgets to charge the request budget, or a card promising an outcome before the
// run that produces it.
//
// The registry is the seam that makes this cheap. Every visitor-facing string a
// room asserts about itself lives in one file with no imports, so a Node script can
// read what actually ships.
//
// This was scripts/check-demos.mjs and its own copy of the pass/fail harness. The
// assertions are unchanged; the harness is node:test.
//
// Usage: node --test tests/

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOMS, OPEN_ROOMS, SITE_HUE } from "../src/lib/demos/registry.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const exists = (p) => existsSync(join(ROOT, p));

describe("structure", () => {
  for (const room of OPEN_ROOMS) {
    const page = `src/app/demos/${room.slug}/page.tsx`;

    test(`"${room.slug}" has a route`, () => {
      assert.ok(
        exists(page),
        `The registry lists this room as open but ${page} does not exist. An open room with no page is a card in the gallery that 404s.`
      );
    });

    // The wall label is composed by RoomShell rather than by each room, so a room
    // cannot forget it, collapse it, or move it below the fold. This is what stops
    // a fourth room being written from memory without one.
    test(`"${room.slug}" renders the shared shell`, (t) => {
      if (!exists(page)) return t.skip(`${page} does not exist - see the route check above.`);
      assert.ok(
        /<RoomShell\b/.test(read(page)),
        "A room page must render <RoomShell>, which is what puts the wall label above the stage in a fixed position."
      );
    });
  }

  // A planned room must not be reachable. Vapourware on a portfolio is the same
  // defect as an overclaiming README, only with a click to discover it.
  for (const room of ROOMS.filter((r) => r.status !== "open")) {
    test(`"${room.slug}" is not open, so it must not have a page`, () => {
      assert.ok(
        !exists(`src/app/demos/${room.slug}/page.tsx`),
        "A room that is not open has a page, so the gallery and the router disagree with the filesystem."
      );
    });
  }
});

describe("the wall label", () => {
  // Naming the LAYER is the whole differentiator. "The concurrency is real" answers
  // a question nobody senior asks; "D1 serialises writes, so the race is in the
  // application" answers the one they do. A length check cannot catch the difference,
  // so this requires the vocabulary.
  const LAYER_WORDS = ["layer", "application", "store", "storage", "verifier", "engine", "database"];

  // The wall label is unskippable by design, so it cannot afford to be the least
  // readable block on the page - and it was, at 30 to 45 words of unbroken prose a
  // row. Two sentences and a cap is what fixes that and what stops it coming back.
  // ScopeNote bolds the first sentence, so a value written as one long sentence
  // would render as a whole bold paragraph rather than as a claim and a qualifier.
  const SCOPE_WORD_CAP = 32;

  for (const room of ROOMS) {
    for (const key of ["real", "staged", "notProved"]) {
      test(`"${room.slug}" scope.${key} is written`, () => {
        assert.ok(
          typeof room.scope[key] === "string" && room.scope[key].trim().length > 30,
          `Empty or near-empty. All three lines are required for every room, and the third one is the reason this site exists.`
        );
      });

      test(`"${room.slug}" scope.${key} is short enough to read`, () => {
        const words = room.scope[key].trim().split(/\s+/).length;
        assert.ok(
          words <= SCOPE_WORD_CAP,
          `${words} words, and the cap is ${SCOPE_WORD_CAP}. This block sits above the exhibit at 13px and nobody skimming reaches the end of a 45-word sentence, so the one place the demo admits what it fakes goes unread.`
        );
      });

      test(`"${room.slug}" scope.${key} leads with a short sentence`, () => {
        assert.ok(
          /\.\s+\S/.test(room.scope[key].trim()),
          `One sentence. ScopeNote renders the first sentence at foreground weight and the rest muted, so a single sentence renders as a bold paragraph. Write the claim, then the qualifier.`
        );
      });
    }

    test(`"${room.slug}" scope.real names the layer`, () => {
      assert.ok(
        LAYER_WORDS.some((w) => room.scope.real.toLowerCase().includes(w)),
        `scope.real must say WHERE the interesting behaviour happens, not just that it is real. Expected one of: ${LAYER_WORDS.join(", ")}.`
      );
    });

    // A room with an injected failure has to say what is simulated in the same
    // words it used to declare it. Two of these rooms are rigged, and a wall label
    // that only guarantees three non-empty strings is a gate against forgetting,
    // not against overclaiming.
    const injected = room.injectionPoint;
    if (injected) {
      test(`"${room.slug}" discloses its injection point`, () => {
        assert.ok(
          room.scope.staged.includes(injected),
          `injectionPoint is "${injected}" but scope.staged does not contain it, so the page never tells a visitor what was engineered.`
        );
      });
    }
  }
});

describe("promises", () => {
  // A promise may quantify its INPUTS and never its OUTCOMES. "Fire twelve payments"
  // is an input. "See the two that got refused" is a result printed before the run
  // that produces it, which is either false or proof the run is scripted.
  const OUTCOME_SHAPES =
    /\b(?:see|watch|find|get|count)\s+(?:the\s+)?(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i;

  // The hook is what the gallery card shows, and it was 40 words of paragraph set
  // at 15px across the full width of the featured card. First prose a visitor
  // meets, so it gets a cap the detail line does not.
  const PROMISE_WORD_CAP = 26;

  for (const room of ROOMS) {
    for (const key of ["promise", "promiseDetail"]) {
      test(`"${room.slug}" ${key} promises no outcome`, () => {
        assert.ok(
          !OUTCOME_SHAPES.test(room[key]),
          `${key} names a quantity of results before the run happens: "${room[key]}". Inputs may be counted; outcomes may not.`
        );
      });
    }

    test(`"${room.slug}" promise is a hook, not a paragraph`, () => {
      const words = room.promise.trim().split(/\s+/).length;
      assert.ok(
        words <= PROMISE_WORD_CAP,
        `${words} words, and the cap is ${PROMISE_WORD_CAP}. Everything past the hook belongs in promiseDetail, which the room page prints and the card does not.`
      );
    });

    test(`"${room.slug}" writes a promiseDetail`, () => {
      assert.ok(
        typeof room.promiseDetail === "string" && room.promiseDetail.trim().length > 20,
        "The hook alone tells a visitor what to press and not what they are looking at."
      );
    });
  }
});

describe("the mechanism", () => {
  // Three lines, each one a term, a plain gloss of the term, and what it does in
  // this room. It used to be a single sentence of four terms of art with no plain
  // anchor anywhere in it, which gave a non-technical reader nothing and gave a
  // skimming engineer a keyword list. A list costs an unfamiliar reader one line
  // rather than the whole paragraph.
  const MECHANISM_WORD_CAP = 30;

  for (const room of ROOMS) {
    test(`"${room.slug}" mechanism is three lines`, () => {
      assert.ok(
        Array.isArray(room.mechanism) && room.mechanism.length === 3,
        "Three, so RoomShell renders a list a reader can skim. One line is a sentence wearing a list's clothes; five is the wall this replaced."
      );
    });

    for (const [i, line] of (room.mechanism ?? []).entries()) {
      test(`"${room.slug}" mechanism line ${i + 1} names a term and glosses it`, () => {
        const words = line.trim().split(/\s+/).length;
        assert.ok(
          words <= MECHANISM_WORD_CAP,
          `${words} words, and the cap is ${MECHANISM_WORD_CAP}. "${line}"`
        );
        assert.ok(
          /^[A-Z][\w'-]*(?:[ -][\w'-]+){0,2},\s+[a-z]/.test(line.trim()),
          `A line must open with the term, a comma, then the gloss in lower case, so the term a reader does not know is the first thing they see and the explanation is the next. Got: "${line}"`
        );
      });
    }
  }
});

describe("the house prose rules", () => {
  // Mark writes and dictates this copy, and voice-to-text plus a model's default
  // register put em dashes and mid-sentence colons back every time anyone edits it.
  // Both read as machine-written, on a site whose whole argument is that a person
  // checked the work. Cheaper to assert than to re-audit three rooms by eye.
  const VISITOR_STRINGS = (room) => [
    ["name", room.name],
    ["promise", room.promise],
    ["promiseDetail", room.promiseDetail],
    ["capability", room.capability],
    ...room.mechanism.map((l, i) => [`mechanism[${i}]`, l]),
    ...["real", "staged", "notProved"].map((k) => [`scope.${k}`, room.scope[k]]),
    ["startLabel", room.startLabel],
    ["readFirst", room.readFirst],
  ];

  // Built from code points rather than typed, so the file that bans the character
  // does not contain it and a repo-wide grep for it stays clean. U+2014 em dash,
  // U+2013 en dash.
  const DASHES = [0x2014, 0x2013].map((c) => String.fromCharCode(c));

  for (const room of ROOMS) {
    test(`"${room.slug}" uses no em or en dash`, () => {
      const hits = VISITOR_STRINGS(room).filter(([, v]) => DASHES.some((d) => v.includes(d)));
      assert.equal(
        hits.length,
        0,
        `Em and en dashes are banned in this copy. Rewrite the sentence rather than substituting a hyphen. Offending: ${hits.map(([k]) => k).join(", ")}`
      );
    });

    test(`"${room.slug}" uses no colon mid-sentence`, () => {
      const hits = VISITOR_STRINGS(room).filter(([, v]) => v.includes(":"));
      assert.equal(
        hits.length,
        0,
        `The "claim: elaboration" construction reads as machine-written. Offending: ${hits.map(([k]) => k).join(", ")}`
      );
    });
  }
});

describe("colour", () => {
  // --destructive is pinned at hue 27 in both themes, and "refused" is the signal a
  // visitor is told to look for in the featured room. A room hue near 27 makes the
  // one thing that must stand out blend into the walls.
  const DESTRUCTIVE_HUE = 27;
  const circular = (a, b) => {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  };

  for (const room of ROOMS) {
    test(`"${room.slug}" hue clears the destructive accent`, () => {
      assert.ok(
        circular(room.hue, DESTRUCTIVE_HUE) >= 60,
        `Hue ${room.hue} is ${circular(room.hue, DESTRUCTIVE_HUE)} degrees from --destructive's ${DESTRUCTIVE_HUE}. A refused write would read as part of the room.`
      );
    });

    test(`"${room.slug}" hue is not the site's own`, () => {
      assert.ok(
        circular(room.hue, SITE_HUE) >= 30,
        `Hue ${room.hue} is too close to the site's ${SITE_HUE}, so walking into the room would not read as going anywhere.`
      );
    });
  }

  for (let i = 0; i < ROOMS.length; i++) {
    for (let j = i + 1; j < ROOMS.length; j++) {
      test(`"${ROOMS[i].slug}" and "${ROOMS[j].slug}" are lit differently`, () => {
        assert.ok(
          circular(ROOMS[i].hue, ROOMS[j].hue) >= 45,
          `Hues ${ROOMS[i].hue} and ${ROOMS[j].hue} are ${circular(ROOMS[i].hue, ROOMS[j].hue)} degrees apart.`
        );
      });
    }
  }
});

describe("source links", () => {
  // A link that 404s after a rename still says "inspectable" while pointing at
  // nothing, which is a quiet overclaim rather than a broken link.
  for (const room of ROOMS) {
    test(`"${room.slug}" links at least one file`, () => {
      assert.ok(
        room.sourceFiles.length > 0,
        "A room with no source links is not inspectable, whatever the copy says."
      );
    });

    for (const path of room.sourceFiles) {
      test(`"${room.slug}" source link resolves: ${path}`, () => {
        assert.ok(
          exists(path),
          "This path does not exist in the working tree, so the GitHub deep link is dead."
        );
      });
    }
  }
});

describe("the request budget", () => {
  // The failure this catches is silent and expensive: a room that forgets to charge
  // the budget works perfectly until the day the site's whole free-tier allowance is
  // gone and the guide stops answering.
  const routerSrc = read("worker/demos/router.ts");

  test("the router reserves", () => {
    assert.ok(
      /reserve\(\s*env\s*,\s*"demo"/.test(routerSrc),
      'worker/demos/router.ts does not call reserve(env, "demo", ...), so nothing charges the demo pool.'
    );
  });

  test("the router charges the declared cost", () => {
    assert.ok(
      /room\.requestsPerRun/.test(routerSrc),
      "The reserve cost must come from the registry's requestsPerRun, so the number a visitor reads is the number that is charged. A literal here can drift from the manifest."
    );
  });

  for (const room of OPEN_ROOMS) {
    const handler = `worker/demos/${room.slug}.ts`;

    test(`"${room.slug}" has a handler`, () => {
      assert.ok(exists(handler), `${handler} does not exist.`);
    });

    test(`"${room.slug}" does not reserve for itself`, (t) => {
      if (!exists(handler)) return t.skip(`${handler} does not exist.`);
      assert.ok(
        !/\breserve\s*\(/.test(read(handler)),
        `${handler} calls reserve(). Only the router may - a handler that also reserves double-charges the pool, and at a dozen shards a click that is how a day's allowance disappears.`
      );
    });

    test(`"${room.slug}" does not rate-limit for itself`, (t) => {
      if (!exists(handler)) return t.skip(`${handler} does not exist.`);
      assert.ok(
        !/\blimitRun\s*\(|LIMITER\b/.test(read(handler)),
        `${handler} reaches for a rate limiter. The router owns that decision so all three rooms cannot drift apart on it.`
      );
    });

    test(`"${room.slug}" declares a request cost`, () => {
      assert.ok(
        Number.isInteger(room.requestsPerRun) && room.requestsPerRun > 0,
        "requestsPerRun must be a positive integer; it is what the router charges."
      );
    });

    test(`"${room.slug}" declares a row cost`, () => {
      assert.ok(
        Number.isInteger(room.rowsPerRun) && room.rowsPerRun >= 0,
        "D1 Free allows 100,000 row writes a day. A room with an undeclared row cost is the same failure class as one with an undeclared request cost."
      );
    });
  }
});

describe("contract", () => {
  // Clause 4.1 covers proprietary and operational information. Room copy is written
  // fast and from memory, and it is published under Mark's own domain beside his
  // employer's name. This is the last place a system name can be caught.
  const FORBIDDEN = [
    "nexus", "autobots", "recon", "workstackos", "weassist", "hatchit",
    "weassist.uk", "hetzner", "netcup", "vultr", "cve-",
  ];
  const FORBIDDEN_RE = FORBIDDEN.map(
    (t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
  );
  const registryText = JSON.stringify(ROOMS);

  test("no room names an employer internal", () => {
    const registryHits = FORBIDDEN.filter((_, i) => FORBIDDEN_RE[i].test(registryText));
    assert.equal(
      registryHits.length,
      0,
      `The registry contains ${registryHits.join(", ")}. Rooms describe the problem, never where he met it.`
    );
  });

  // A room linking to /#work would point a live demonstration of transactional
  // integrity straight at the least-evidenced transactional claim on the site, and
  // manufacture the exact inference the wall label exists to prevent.
  test("no room links to the work section", () => {
    assert.ok(
      !registryText.includes("#work"),
      "Rooms link to source and to each other. Never to /#work."
    );
  });
});

describe("the gallery", () => {
  test("the gallery renders every open room", () => {
    assert.ok(
      /OPEN_ROOMS/.test(read("src/components/demos/gallery.tsx")),
      "The gallery must render from OPEN_ROOMS, or a new room can exist with no way in and no way to notice."
    );
  });
});

describe("the export shape", () => {
  // A route that is both a page and a parent of other pages used to be written as
  // BOTH `out/<name>.html` and a directory `out/<name>/`. Cloudflare Assets resolves
  // the directory, finds no index inside it, and returns 404 - for a page that built
  // correctly, uploaded correctly, and is sitting right there. It cost two rounds of
  // debugging: /demos first, then /resume, and both times every other signal was
  // green. `trailingSlash: true` removes the ambiguity by writing
  // `out/<name>/index.html` and nothing else.
  //
  // This asserts the config rather than the output, because the gate has to run
  // before a build as well as after one, and the config is what decides it.
  test("the export cannot emit a page and a directory under one name", () => {
    assert.ok(
      /trailingSlash:\s*true/.test(read("next.config.mjs")),
      "next.config.mjs does not set trailingSlash: true. Without it a route that has children is written as both <name>.html and <name>/, and Assets serves the directory - so the page 404s in production while building and deploying without a single warning."
    );
  });
});
