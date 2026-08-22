// Boot-probe for the exhibition rooms. Runs against a live Worker, not a mock.
//
// tests/demos.test.mjs proves the rooms SAY the right things. This proves they
// DO them, and the difference is the entire point of the exhibition:
//
//   - The unsafe ledger path must actually lose money. If it does not, the room is
//     a story about a race that does not happen, which is the exact overclaim the
//     wall label exists to prevent - and it is the one defect no static check can
//     catch, because the code can be perfectly correct and simply never race.
//   - The safe path must not lose money, under the same fan-out.
//   - Split-Brain must refuse a stale fencing token at the store. A demo that
//     draws the refusal without the database performing it is a cartoon.
//
// THE FILENAME IS DELIBERATE. It is probe-demos.mjs and not probe-demos.test.mjs,
// so `node --test tests/` does not pick it up. This file needs the internet and a
// Worker already running, and a build gate that needs either fails on a train. Node
// runs an explicitly named file whatever it is called, which is what makes the
// opt-in cheap.
//
// Usage:
//   npx wrangler dev --remote        (in another terminal)
//   npm run probe:demos
//
// Point it somewhere else with MKB_PROBE_BASE=https://... npm run probe:demos.
// It is an environment variable rather than an argument because everything after
// `node --test` is read as another file to run.
//
// --remote matters. The rooms read seeded data that only exists in the remote D1,
// and a local empty database would let every assertion below pass vacuously.

import assert from "node:assert/strict";
import { before, describe, test } from "node:test";

const BASE = process.env.MKB_PROBE_BASE ?? "http://127.0.0.1:8787";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: { error: `not JSON: ${text.slice(0, 160)}` } };
  }
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  try {
    return { status: res.status, body: JSON.parse(text) };
  } catch {
    return { status: res.status, body: { error: `not JSON: ${text.slice(0, 160)}` } };
  }
}

describe(`exhibition rooms boot-probe against ${BASE}`, () => {
  // --- Is the source actually readable by a stranger? -------------------------
  //
  // tests/demos.test.mjs asserts every sourceFiles path exists IN THE WORKING TREE,
  // which is necessary and says nothing about whether a visitor can open it. For a
  // while it could not: the repo was private, so every "read the source" link under
  // every room 404'd for everyone except Mark, while the section above them was
  // headed "Things I built to be inspected". A gate that proves a file exists on the
  // author's disk is not a gate on inspectability - this is.
  describe("a stranger can read the source", async () => {
    const { ROOMS, REPO_URL, sourceLink } = await import("../src/lib/demos/registry.ts");
    const targets = [REPO_URL, ...ROOMS.flatMap((r) => r.sourceFiles.map(sourceLink))];

    for (const url of targets) {
      test(`a stranger can open ${url.replace(/^https:\/\/github\.com\//, "")}`, async () => {
        /** @type {number | string} */
        let status = 0;
        try {
          status = (await fetch(url, { method: "HEAD", redirect: "follow" })).status;
        } catch (e) {
          status = `unreachable (${String(e).slice(0, 60)})`;
        }
        assert.equal(
          status,
          200,
          `Got ${status}. The room advertises this as readable source. If the repository is private every one of these is a dead link under a heading that says "built to be inspected".`
        );
      });
    }
  });

  // --- The router's own guarantees, which no room can opt out of ---------------

  describe("the router", () => {
    test("an unknown room is refused by name", async () => {
      const unknown = await post("/api/demos/not-a-room/start");
      assert.ok(
        unknown.status === 404 && /not-a-room/.test(JSON.stringify(unknown.body)),
        `Got ${unknown.status} ${JSON.stringify(unknown.body).slice(0, 120)}. A 404 that does not name what was not found is a vague error.`
      );
    });

    test("a shard without a run id is refused", async () => {
      const noRun = await post("/api/demos/ledger-under-fire/transfer", { idemKey: "x" });
      assert.equal(
        noRun.status,
        400,
        `Got ${noRun.status}. A shard must not be able to run outside a paid-for run.`
      );
    });
  });

  // --- Ledger Under Fire ------------------------------------------------------

  /**
   * Fires one run and returns what the books ended up holding.
   *
   * The transfers go out with Promise.all rather than in a loop, because a loop
   * would serialise them and neither path could lose anything. That would make both
   * assertions below pass while proving nothing at all, which is worse than failing.
   */
  async function runLedger(mode) {
    const started = await post("/api/demos/ledger-under-fire/start", { mode });
    if (started.status !== 200) return { error: `start failed: ${JSON.stringify(started.body)}` };

    const { runId, transferCount, genesisCents } = started.body;
    if (!runId || !transferCount) {
      return { error: `start returned no runId/transferCount: ${JSON.stringify(started.body).slice(0, 200)}` };
    }

    await Promise.all(
      Array.from({ length: transferCount }, (_, i) =>
        post("/api/demos/ledger-under-fire/transfer", {
          runId,
          mode,
          index: i,
          idemKey: `${runId}:${i}`,
        })
      )
    );

    const state = await get(`/api/demos/ledger-under-fire/state?runId=${encodeURIComponent(runId)}`);
    return { runId, genesisCents, state: state.body };
  }

  describe("ledger under fire", () => {
    let unsafe;
    let safe;

    before(async () => {
      unsafe = await runLedger("unsafe");
      safe = await runLedger("safe");
    });

    test("the unsafe ledger run completes", () => {
      assert.ok(!unsafe.error, unsafe.error);
    });

    test("the unsafe path reports the invariant", (t) => {
      if (unsafe.error) return t.skip("the unsafe run did not complete.");
      const total = unsafe.state?.totalCents;
      const genesis = unsafe.state?.genesisCents ?? unsafe.genesisCents;
      assert.ok(
        typeof total === "number" && typeof genesis === "number",
        `state must return totalCents and genesisCents so the invariant is checkable. Got ${JSON.stringify(unsafe.state).slice(0, 200)}`
      );
    });

    // The one assertion that cannot be faked by writing good code: the race has
    // to actually happen. It is concurrency, so it is not guaranteed on any single
    // run - but a run that never loses anything means the gap is not real, and the
    // room's central claim is then unearned.
    test("the unsafe path loses money", (t) => {
      if (unsafe.error) return t.skip("the unsafe run did not complete.");
      const total = unsafe.state?.totalCents;
      const genesis = unsafe.state?.genesisCents ?? unsafe.genesisCents;
      assert.ok(
        typeof total === "number" && typeof genesis === "number" && total !== genesis,
        `Books balanced at ${total} against a genesis of ${genesis}. Either the read-then-write gap is not real, or the fan-out is not concurrent. Re-run once before believing it; if it balances repeatedly the room is telling a story about a race that does not happen.`
      );
    });

    test("the safe ledger run completes", () => {
      assert.ok(!safe.error, safe.error);
    });

    test("the safe path keeps the books balanced", (t) => {
      if (safe.error) return t.skip("the safe run did not complete.");
      const total = safe.state?.totalCents;
      const genesis = safe.state?.genesisCents ?? safe.genesisCents;
      assert.equal(
        total,
        genesis,
        `Books at ${total} against a genesis of ${genesis}. The safe path lost money, which is the failure the whole room argues cannot happen.`
      );
    });
  });

  // --- Split-Brain Sandbox ----------------------------------------------------

  describe("split-brain sandbox", () => {
    let started;
    let ticks;
    let state;

    before(async () => {
      started = await post("/api/demos/split-brain/start");
      if (started.status !== 200) return;
      // Three nodes contending at once. Exactly one may come away holding it.
      //
      // `lease` is a STATE STRING, not a boolean - the first version of this probe
      // tested `body.acquired === true` and reported zero acquisitions on a room
      // that was working perfectly. A probe that models a response shape the server
      // does not have fails in the one direction that wastes the most time: it
      // accuses correct code.
      ticks = await Promise.all(
        ["a", "b", "c"].map((node) => post("/api/demos/split-brain/tick", { runId: started.body.runId, node }))
      );
      state = await get(`/api/demos/split-brain/state?runId=${encodeURIComponent(started.body.runId)}`);
    });

    test("the cluster starts", () => {
      assert.equal(
        started.status,
        200,
        `start failed: ${JSON.stringify(started.body).slice(0, 200)}`
      );
    });

    test("exactly one node acquires the lease", (t) => {
      if (started.status !== 200) return t.skip("the cluster did not start.");
      const acquired = ticks.filter((x) => x.body?.lease === "acquired");
      assert.equal(
        acquired.length,
        1,
        `${acquired.length} nodes report lease="acquired". The conditional update is not conditional, or its meta.changes is not being consulted. Got: ${ticks.map((x) => `${x.body?.node}:${x.body?.lease}`).join(", ")}`
      );
    });

    // The refused nodes must be refused BY THE STORE, not by a JS branch that
    // decided not to try. A fenced write is the evidence the check happened where
    // the data is, which is the only place it is worth anything.
    test("the nodes that lost are fenced at the store", (t) => {
      if (started.status !== 200) return t.skip("the cluster did not start.");
      const fenced = ticks.filter((x) => x.body?.lease === "refused" && x.body?.write === "fenced");
      assert.equal(
        fenced.length,
        2,
        `${fenced.length} of the 2 losing nodes report write="fenced". A loser that is not fenced was refused somewhere other than the database.`
      );
    });

    test("the lease carries a fencing token", (t) => {
      if (started.status !== 200) return t.skip("the cluster did not start.");
      const token = state.body?.lease?.token;
      assert.ok(
        typeof token === "number" && token > 0,
        `Got ${JSON.stringify(state.body?.lease)}. Without a monotonic token there is nothing for the store to fence on.`
      );
    });
  });
});
