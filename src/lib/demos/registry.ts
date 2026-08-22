/**
 * The three exhibition rooms, and everything the rest of the site knows about them.
 *
 * NO IMPORTS, on purpose - the same discipline as src/lib/site-sections.ts. The
 * gallery, the room chrome, the Worker router and tests/demos.test.mjs all read
 * this one file, and the gate has to be able to load it under plain Node to test
 * what actually ships. A manifest the gate cannot read is a manifest the gate
 * cannot check.
 *
 * WHAT THIS FILE IS FOR. Three demos with three different skeletons would drift
 * into three different standards of honesty within a week. Every claim a room
 * makes about itself - what is real, what is staged, what it does not prove, how
 * many requests it spends - is declared here, in one place, in one shape, and the
 * gate asserts the shape is filled in before the build passes. The rooms diverge
 * completely in how they look and behave. They cannot diverge in what they are
 * allowed to assert.
 *
 * `status` exists so a room can be declared before it is built. The gallery renders
 * only "open" rooms, so a planned entry documents the intent in source without
 * putting a card on the page for something a visitor cannot press. Vapourware in a
 * portfolio is the same defect as an overclaiming README.
 */

export type RoomStatus = "open" | "planned" | "closed";

/**
 * The wall label. Three strings, all required, all rendered in fixed position and
 * never behind a toggle.
 *
 * The third one is the differentiator. Almost nobody writes it, and it is why the
 * previous two versions of this portfolio were deleted: a demo that says only what
 * it proves invites the reader to assume the rest.
 *
 * SHAPE, and the gate enforces it. Two sentences, at most 32 words in total. The
 * first sentence is the whole claim and is rendered bold; the second is the
 * qualifier. Written as one long sentence these become the least readable block on
 * the page, which is a strange fate for the one block that is unskippable.
 */
export type RoomScope = {
  /** What genuinely executes. Must name the LAYER the interesting behaviour is at. */
  real: string;
  /** What is invented or injected. Required for every room, not only rigged ones. */
  staged: string;
  /** The inference a reader would otherwise draw and should not. */
  notProved: string;
};

export type DemoRoom = {
  slug: string;
  name: string;
  /**
   * The hook. What you will watch happen, present tense, concrete, second person.
   * Never "demonstrates concurrency control". A promise may quantify its INPUTS
   * ("fire twelve payments") and never its OUTCOMES ("see the two that got
   * refused") - an outcome printed before the run is either a lie or proof the run
   * is scripted. The same rule governs promiseDetail, and the gate checks both.
   *
   * This was one 40-word paragraph, set at 15px across the full width of the
   * featured card, and it was the first prose a visitor met. Good paragraph, bad
   * hook. The gallery card shows this line; the room page shows both.
   */
  promise: string;
  /** The second half of the hook. Shown on the room page, under the promise. */
  promiseDetail: string;
  /** The transferable engineering capability, in one clause, for a recruiter. */
  capability: string;
  /**
   * What an engineer reads underneath the capability line. THREE lines, and each
   * one is a term, a plain gloss of that term, and what it does in this room, in
   * that order.
   *
   * It used to be one sentence of four terms of art with no plain-language anchor
   * anywhere in it. A non-technical reader got nothing from it and a skimming
   * engineer got a keyword list rather than a mechanism. Rendered as a list, a term
   * a reader does not know costs them one line instead of the whole paragraph.
   */
  mechanism: string[];
  scope: RoomScope;
  /**
   * Where the failure is injected, or null if nothing is injected. The gate
   * requires this term to appear in `scope.staged`, so a rigged room cannot
   * describe itself as anything else.
   */
  injectionPoint: string | null;
  /** oklch hue. Distinct from every other room, from the site's 158, and >=60 from --destructive's 27. */
  hue: number;
  /** One motion character per room, so they read as different places. */
  motion: "mechanical" | "measured" | "discrete";
  /**
   * Worker requests one full run costs. Reserved in ONE call at run creation, so
   * the fan-out that follows spends nothing further. The gate cross-checks this
   * against what the router reserves.
   */
  requestsPerRun: number;
  /** Database rows one run writes, including its share of the expiry sweep. */
  rowsPerRun: number;
  /** Honest range, seconds. The telemetry strip's measured ms is the authority. */
  runSeconds: [number, number];
  /** The one control on the threshold, labelled with exactly what it will do. */
  startLabel: string;
  /** Read-this-first line for the source footer. */
  readFirst: string;
  /** Implementing files, deep-linked. Every path must resolve in the working tree. */
  sourceFiles: string[];
  order: number;
  featured: boolean;
  status: RoomStatus;
};

export const ROOMS: DemoRoom[] = [
  {
    slug: "ledger-under-fire",
    name: "Ledger Under Fire",
    promise:
      "Fire twelve payments at one account at the same moment, on the unsafe path and then the safe one.",
    promiseDetail:
      "Watch the balance come out wrong, then watch it come out right, and read which writes were refused and why.",
    capability: "Keeping money correct when several things touch the same record at once.",
    mechanism: [
      "Read-then-write race, two requests read the same balance before either one writes, so the second quietly overwrites the first.",
      "Idempotency key, an id the caller sends and the database stores, so a retried payment lands once instead of twice.",
      "Conditional update, one statement that carries the balance it expected and refuses if that changed, so the rule holds inside the write rather than in a nightly repair job.",
    ],
    scope: {
      real:
        "Twelve real HTTP requests, each a real database transaction. Cloudflare D1 serialises writes, so the race sits in the application code rather than the engine, the same as in production.",
      staged:
        "The company, the accounts and the amounts are invented. The unsafe path reads a balance, awaits, then writes the sum it computed, the shape this bug takes in real code.",
      notProved:
        "Not that the safe path would hold at a real company's size. This is a dozen requests against a free database, not a payments system under load.",
    },
    injectionPoint: "reads a balance, awaits, then writes",
    hue: 90,
    motion: "mechanical",
    requestsPerRun: 14,
    rowsPerRun: 60,
    runSeconds: [4, 10],
    startLabel: "Fire 12 concurrent payments",
    readFirst:
      "Start with worker/demos/ledger-under-fire.ts, where one SQL statement is the entire difference between the two paths.",
    sourceFiles: ["worker/demos/ledger-under-fire.ts", "migrations/0004_ledger_race.sql"],
    order: 1,
    featured: true,
    status: "open",
  },
  {
    slug: "score-audit",
    name: "ScoreAudit",
    promise:
      "Ask a language model six questions with checkable answers and make it commit to how sure it is.",
    promiseDetail:
      "Run it once with the database in reach and once without, then put what it claimed next to what is true.",
    capability: "Not taking a model's word for it.",
    mechanism: [
      "Stated confidence, the model scores every answer from 0 to 100 for how sure it is, with nothing telling it what to say.",
      "Independent check, a SQL query grades that answer against the real data, and the model never grades itself and never sees the query.",
      "Calibration gap, stated confidence minus measured accuracy in points, so a positive number means it sounded surer than it turned out to be.",
    ],
    scope: {
      real:
        "A real model call to a real endpoint, and real SQL against the database the questions ask about. The verifier layer compares the stated answer to the query result.",
      staged:
        "The warehouse is invented seed data and nothing is rigged to fail. The only difference between the two runs is that one of them withholds the query tool.",
      notProved:
        "Not that the model is dishonest. It shows the distance between a stated confidence and a checkable result, and six questions is an illustration, not a rate.",
    },
    injectionPoint: "only difference between the two runs is that one of them withholds the query tool",
    hue: 235,
    motion: "measured",
    requestsPerRun: 1,
    rowsPerRun: 4,
    // Measured, not estimated: 10.0 s for six questions with the query tool in
    // reach (three model steps, six queries), 5.3 s without it.
    runSeconds: [5, 12],
    startLabel: "Ask the model, then check it",
    readFirst:
      "Start with worker/demos/score-audit.ts. The verifier is the half that matters, and it never sees the model's confidence.",
    sourceFiles: ["worker/demos/score-audit.ts", "migrations/warehouse/0002_seed_warehouse.sql"],
    order: 2,
    featured: false,
    status: "open",
  },
  {
    slug: "split-brain",
    name: "Split-Brain Sandbox",
    promise:
      "Three nodes, one job, and only one may run it. Split brain is what happens when two of them both believe they are in charge.",
    promiseDetail:
      "Cut the primary off from the store and watch a second node take over, then let the first one come back still believing it is the leader.",
    capability: "Making sure exactly one worker owns a job when the network cannot be trusted.",
    mechanism: [
      "Lease, a timed claim on the job that expires unless the holder renews it, so a node that goes silent loses it automatically.",
      "Fencing token, a counter that rises by one every time the lease changes hands.",
      "Stale-token write, the database refuses anything carrying an old number, so a node that was asleep cannot act on a claim it no longer holds.",
    ],
    scope: {
      real:
        "Every lease claim and renewal is a real conditional write, and the nodes genuinely race each other. The token is checked at the storage layer, the only place that check counts.",
      staged:
        "Nothing is unplugged. Cutting a node off sets a flag on the node's own row, which its own code checks before it talks to the store.",
      notProved:
        "Not that this survives a real network partition. The failover logic is what is tested here, and real network failures are messier in ways that matter.",
    },
    injectionPoint: "sets a flag on the node's own row",
    hue: 305,
    motion: "discrete",
    requestsPerRun: 16,
    rowsPerRun: 70,
    runSeconds: [6, 14],
    startLabel: "Start the cluster",
    readFirst:
      "Start with worker/demos/split-brain.ts, where one WHERE clause on the lease update carries the whole guarantee.",
    sourceFiles: ["worker/demos/split-brain.ts", "migrations/0006_split_brain.sql"],
    order: 3,
    featured: false,
    status: "open",
  },
];

/** The site's own hue. A room that matched it would not read as a different place. */
export const SITE_HUE = 158;

export const OPEN_ROOMS = ROOMS.filter((r) => r.status === "open").sort((a, b) => a.order - b.order);

export function roomBySlug(slug: string): DemoRoom | undefined {
  return ROOMS.find((r) => r.slug === slug);
}

/** The room after this one, for the corridor control. Wraps to undefined at the end. */
export function nextRoom(slug: string): DemoRoom | undefined {
  const i = OPEN_ROOMS.findIndex((r) => r.slug === slug);
  return i === -1 ? undefined : OPEN_ROOMS[i + 1];
}

/** GitHub deep links, so "read the source" means a file rather than a repo root. */
export const REPO_URL = "https://github.com/markkennethbadilla/mkb-site";
export const sourceLink = (path: string) => `${REPO_URL}/blob/main/${path}`;
