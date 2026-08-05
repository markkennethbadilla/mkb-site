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
// Usage: node scripts/check-demos.mjs

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ROOMS, OPEN_ROOMS, SITE_HUE } from "../src/lib/demos/registry.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const exists = (p) => existsSync(join(ROOT, p));

const failures = [];
const check = (name, ok, detail) => {
  if (ok) console.log(`  pass  ${name}`);
  else {
    console.log(`  FAIL  ${name}\n        ${detail}`);
    failures.push(name);
  }
};

console.log("exhibition rooms gate\n");

// --- Structure -------------------------------------------------------------

for (const room of OPEN_ROOMS) {
  const page = `src/app/demos/${room.slug}/page.tsx`;
  check(
    `"${room.slug}" has a route`,
    exists(page),
    `The registry lists this room as open but ${page} does not exist. An open room with no page is a card in the gallery that 404s.`
  );
  if (!exists(page)) continue;

  // The wall label is composed by RoomShell rather than by each room, so a room
  // cannot forget it, collapse it, or move it below the fold. This is what stops
  // a fourth room being written from memory without one.
  const src = read(page);
  check(
    `"${room.slug}" renders the shared shell`,
    /<RoomShell\b/.test(src),
    "A room page must render <RoomShell>, which is what puts the wall label above the stage in a fixed position."
  );
}

// A planned room must not be reachable. Vapourware on a portfolio is the same
// defect as an overclaiming README, only with a click to discover it.
for (const room of ROOMS.filter((r) => r.status !== "open")) {
  check(
    `"${room.slug}" is not open, so it must not have a page`,
    !exists(`src/app/demos/${room.slug}/page.tsx`),
    "A room that is not open has a page, so the gallery and the router disagree with the filesystem."
  );
}

// --- The wall label --------------------------------------------------------

// Naming the LAYER is the whole differentiator. "The concurrency is real" answers
// a question nobody senior asks; "D1 serialises writes, so the race is in the
// application" answers the one they do. A length check cannot catch the difference,
// so this requires the vocabulary.
const LAYER_WORDS = ["layer", "application", "store", "storage", "verifier", "engine", "database"];

for (const room of ROOMS) {
  for (const key of ["real", "staged", "notProved"]) {
    check(
      `"${room.slug}" scope.${key} is written`,
      typeof room.scope[key] === "string" && room.scope[key].trim().length > 30,
      `Empty or near-empty. All three lines are required for every room, and the third one is the reason this site exists.`
    );
  }

  check(
    `"${room.slug}" scope.real names the layer`,
    LAYER_WORDS.some((w) => room.scope.real.toLowerCase().includes(w)),
    `scope.real must say WHERE the interesting behaviour happens, not just that it is real. Expected one of: ${LAYER_WORDS.join(", ")}.`
  );

  // A room with an injected failure has to say what is simulated in the same
  // words it used to declare it. Two of these rooms are rigged, and a wall label
  // that only guarantees three non-empty strings is a gate against forgetting,
  // not against overclaiming.
  if (room.injectionPoint) {
    check(
      `"${room.slug}" discloses its injection point`,
      room.scope.staged.includes(room.injectionPoint),
      `injectionPoint is "${room.injectionPoint}" but scope.staged does not contain it, so the page never tells a visitor what was engineered.`
    );
  }
}

// --- Promises --------------------------------------------------------------

// A promise may quantify its INPUTS and never its OUTCOMES. "Fire twelve payments"
// is an input. "See the two that got refused" is a result printed before the run
// that produces it, which is either false or proof the run is scripted.
const OUTCOME_SHAPES =
  /\b(?:see|watch|find|get|count)\s+(?:the\s+)?(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i;

for (const room of ROOMS) {
  check(
    `"${room.slug}" promises no outcome`,
    !OUTCOME_SHAPES.test(room.promise),
    `The promise names a quantity of results before the run happens: "${room.promise}". Inputs may be counted; outcomes may not.`
  );
}

// --- Colour ----------------------------------------------------------------

// --destructive is pinned at hue 27 in both themes, and "refused" is the signal a
// visitor is told to look for in the featured room. A room hue near 27 makes the
// one thing that must stand out blend into the walls.
const DESTRUCTIVE_HUE = 27;
const circular = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

for (const room of ROOMS) {
  check(
    `"${room.slug}" hue clears the destructive accent`,
    circular(room.hue, DESTRUCTIVE_HUE) >= 60,
    `Hue ${room.hue} is ${circular(room.hue, DESTRUCTIVE_HUE)} degrees from --destructive's ${DESTRUCTIVE_HUE}. A refused write would read as part of the room.`
  );
  check(
    `"${room.slug}" hue is not the site's own`,
    circular(room.hue, SITE_HUE) >= 30,
    `Hue ${room.hue} is too close to the site's ${SITE_HUE}, so walking into the room would not read as going anywhere.`
  );
}

for (let i = 0; i < ROOMS.length; i++) {
  for (let j = i + 1; j < ROOMS.length; j++) {
    check(
      `"${ROOMS[i].slug}" and "${ROOMS[j].slug}" are lit differently`,
      circular(ROOMS[i].hue, ROOMS[j].hue) >= 45,
      `Hues ${ROOMS[i].hue} and ${ROOMS[j].hue} are ${circular(ROOMS[i].hue, ROOMS[j].hue)} degrees apart.`
    );
  }
}

// --- Source links ----------------------------------------------------------

// A link that 404s after a rename still says "inspectable" while pointing at
// nothing, which is a quiet overclaim rather than a broken link.
for (const room of ROOMS) {
  check(
    `"${room.slug}" links at least one file`,
    room.sourceFiles.length > 0,
    "A room with no source links is not inspectable, whatever the copy says."
  );
  for (const path of room.sourceFiles) {
    check(
      `"${room.slug}" source link resolves: ${path}`,
      exists(path),
      "This path does not exist in the working tree, so the GitHub deep link is dead."
    );
  }
}

// --- The request budget ----------------------------------------------------

// The failure this catches is silent and expensive: a room that forgets to charge
// the budget works perfectly until the day the site's whole free-tier allowance is
// gone and the guide stops answering.
const routerSrc = read("worker/demos/router.ts");
check(
  "the router reserves",
  /reserve\(\s*env\s*,\s*"demo"/.test(routerSrc),
  "worker/demos/router.ts does not call reserve(env, \"demo\", ...), so nothing charges the demo pool."
);
check(
  "the router charges the declared cost",
  /room\.requestsPerRun/.test(routerSrc),
  "The reserve cost must come from the registry's requestsPerRun, so the number a visitor reads is the number that is charged. A literal here can drift from the manifest."
);

for (const room of OPEN_ROOMS) {
  const handler = `worker/demos/${room.slug}.ts`;
  if (!exists(handler)) {
    check(`"${room.slug}" has a handler`, false, `${handler} does not exist.`);
    continue;
  }
  const src = read(handler);
  check(
    `"${room.slug}" does not reserve for itself`,
    !/\breserve\s*\(/.test(src),
    `${handler} calls reserve(). Only the router may - a handler that also reserves double-charges the pool, and at a dozen shards a click that is how a day's allowance disappears.`
  );
  check(
    `"${room.slug}" does not rate-limit for itself`,
    !/\blimitRun\s*\(|LIMITER\b/.test(src),
    `${handler} reaches for a rate limiter. The router owns that decision so all three rooms cannot drift apart on it.`
  );
  check(
    `"${room.slug}" declares a request cost`,
    Number.isInteger(room.requestsPerRun) && room.requestsPerRun > 0,
    "requestsPerRun must be a positive integer; it is what the router charges."
  );
  check(
    `"${room.slug}" declares a row cost`,
    Number.isInteger(room.rowsPerRun) && room.rowsPerRun >= 0,
    "D1 Free allows 100,000 row writes a day. A room with an undeclared row cost is the same failure class as one with an undeclared request cost."
  );
}

// --- Contract --------------------------------------------------------------

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
const registryHits = FORBIDDEN.filter((_, i) => FORBIDDEN_RE[i].test(registryText));
check(
  "no room names an employer internal",
  registryHits.length === 0,
  `The registry contains ${registryHits.join(", ")}. Rooms describe the problem, never where he met it.`
);

// A room linking to /#work would point a live demonstration of transactional
// integrity straight at the least-evidenced transactional claim on the site, and
// manufacture the exact inference the wall label exists to prevent.
check(
  "no room links to the work section",
  !registryText.includes("#work"),
  "Rooms link to source and to each other. Never to /#work."
);

// --- The gallery -----------------------------------------------------------

const gallerySrc = read("src/components/demos/gallery.tsx");
check(
  "the gallery renders every open room",
  /OPEN_ROOMS/.test(gallerySrc),
  "The gallery must render from OPEN_ROOMS, or a new room can exist with no way in and no way to notice."
);

// --- The export shape ------------------------------------------------------
//
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
{
  const nextConfig = read("next.config.mjs");
  check(
    "the export cannot emit a page and a directory under one name",
    /trailingSlash:\s*true/.test(nextConfig),
    "next.config.mjs does not set trailingSlash: true. Without it a route that has children is written as both <name>.html and <name>/, and Assets serves the directory - so the page 404s in production while building and deploying without a single warning."
  );
}

console.log(failures.length ? `\n${failures.length} failed\n` : `\nall checks passed\n`);
process.exit(failures.length ? 1 : 0);
