/**
 * The three exhibition rooms, and everything the rest of the site knows about them.
 *
 * NO IMPORTS, on purpose - the same discipline as src/lib/site-sections.ts. The
 * gallery, the room chrome, the Worker router and scripts/check-demos.mjs all read
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
   * What you will watch happen, present tense, concrete, second person. Never
   * "demonstrates concurrency control". A promise may quantify its INPUTS ("fire
   * twelve payments") and never its OUTCOMES ("see the two that got refused") - an
   * outcome printed before the run is either a lie or proof the run is scripted.
   */
  promise: string;
  /** The transferable engineering capability, in one clause, for a recruiter. */
  capability: string;
  /** What an engineer reads underneath the capability line. */
  mechanism: string;
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
  /** D1 rows one run writes, including its share of the expiry sweep. */
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
      "Fire twelve payments at one account at the same moment, on the unsafe path and then the safe one. Watch the balance come out wrong, then watch it come out right, and read which writes were refused and why.",
    capability: "Keeping money correct when several things touch the same record at once.",
    mechanism:
      "Read-then-write races, idempotency keys, a conditional update that carries its own precondition, and the invariant asserted inside the write rather than by a nightly job.",
    scope: {
      real:
        "Twelve separate HTTP requests, each running a real transaction against a real SQLite database. What races is the read-then-write gap in the application - D1 serialises writes per database, so the bug is at the layer where this bug actually happens in production, not in the engine.",
      staged:
        "The company, the accounts and the amounts are invented. The unsafe path injects the gap deliberately: it reads a balance, awaits, then writes the sum it computed, which is the shape the bug takes in real code.",
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
      "Start with worker/demos/ledger-under-fire.ts - the difference between the two paths is one SQL statement.",
    sourceFiles: ["worker/demos/ledger-under-fire.ts", "migrations/0004_ledger_race.sql"],
    order: 1,
    featured: true,
    status: "open",
  },
  {
    slug: "score-audit",
    name: "ScoreAudit",
    promise:
      "Ask a language model six questions with checkable answers and make it commit to how sure it is. Run it once with the database in reach and once without, and put what it claimed next to what is true.",
    capability: "Not taking a model's word for it.",
    mechanism:
      "Self-reported confidence separated from an independent deterministic verifier, with the gap reported rather than the model's own number - and the same six questions asked with and without a real query tool, so the gap has something to move against.",
    scope: {
      real:
        "A real model call to a real inference endpoint, and real SQL against the same database the questions are about. The verdict is computed at the verifier layer by comparing the model's stated answer to the query result - the model never grades itself, and never sees the verifying SQL.",
      staged:
        "The warehouse is invented seed data. Nothing here is rigged to fail: the only difference between the two runs is that one of them withholds the query tool, and the model is not told what confidence to give either way.",
      notProved:
        "Not that the model is dishonest. It shows the distance between a stated confidence and a checkable result, which is a different and smaller claim. Six questions is an illustration, not a rate.",
    },
    injectionPoint: "the only difference between the two runs is that one of them withholds the query tool",
    hue: 235,
    motion: "measured",
    requestsPerRun: 1,
    rowsPerRun: 4,
    // Measured, not estimated: 10.0 s for six questions with the query tool in
    // reach (three model steps, six queries), 5.3 s without it.
    runSeconds: [5, 12],
    startLabel: "Ask the model, then check it",
    readFirst:
      "Start with worker/demos/score-audit.ts - the verifier is the half that matters, and it never sees the model's confidence.",
    sourceFiles: ["worker/demos/score-audit.ts", "migrations/0002_seed_warehouse.sql"],
    order: 2,
    featured: false,
    status: "open",
  },
  {
    slug: "split-brain",
    name: "Split-Brain Sandbox",
    promise:
      "Three nodes, one job, and only one of them may run it. Cut the primary off from the store and watch a second node take over - then let the first one come back believing it is still in charge.",
    capability: "Making sure exactly one worker owns a job when the network cannot be trusted.",
    mechanism:
      "Lease expiry, fencing tokens, and the specific failure where a paused-then-resumed worker still holds a lease it no longer owns - caught because the store refuses a write carrying a stale token.",
    scope: {
      real:
        "Every lease acquisition and renewal is a real conditional write against a real database, and the nodes contend through genuinely concurrent HTTP requests. The fencing token is checked at the storage layer, which is the only place a check like this is worth anything.",
      staged:
        "Nothing actually dies. A partition is a flag on the node's own row that its code checks before it talks to the store, so this is failover-logic failure injection, not infrastructure failure. Real network partitions are messier than this in ways that matter.",
      notProved:
        "Not that any particular production system is built this way. It is a sandbox for one failure mode, isolated on purpose so the mechanism is visible.",
    },
    injectionPoint: "a flag on the node's own row that its code checks",
    hue: 305,
    motion: "discrete",
    requestsPerRun: 16,
    rowsPerRun: 70,
    runSeconds: [6, 14],
    startLabel: "Start the cluster",
    readFirst:
      "Start with worker/demos/split-brain.ts - the whole guarantee is one WHERE clause on the lease update.",
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
