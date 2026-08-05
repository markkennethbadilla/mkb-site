// Boot-probe for the exhibition rooms. Runs against a live Worker, not a mock.
//
// scripts/check-demos.mjs proves the rooms SAY the right things. This proves they
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
// Usage:
//   npx wrangler dev --remote        (in another terminal)
//   node scripts/probe-demos.mjs [baseUrl]
//
// --remote matters. The rooms read seeded data that only exists in the remote D1,
// and a local empty database would let every assertion below pass vacuously.

const BASE = process.argv[2] ?? "http://127.0.0.1:8787";

let failures = 0;
const check = (name, ok, detail) => {
  if (ok) console.log(`  pass  ${name}`);
  else {
    console.log(`  FAIL  ${name}\n        ${detail}`);
    failures++;
  }
};

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

console.log(`exhibition rooms boot-probe against ${BASE}\n`);

// --- Is the source actually readable by a stranger? -------------------------
//
// check-demos.mjs asserts every sourceFiles path exists IN THE WORKING TREE, which
// is necessary and says nothing about whether a visitor can open it. For a while
// it could not: the repo was private, so every "read the source" link under every
// room 404'd for everyone except Mark, while the section above them was headed
// "Things I built to be inspected". A gate that proves a file exists on the author's
// disk is not a gate on inspectability - this is.
{
  const { ROOMS, REPO_URL, sourceLink } = await import("../src/lib/demos/registry.ts");
  const targets = [REPO_URL, ...ROOMS.flatMap((r) => r.sourceFiles.map(sourceLink))];
  for (const url of targets) {
    let status = 0;
    try {
      status = (await fetch(url, { method: "HEAD", redirect: "follow" })).status;
    } catch (e) {
      status = `unreachable (${String(e).slice(0, 60)})`;
    }
    check(
      `a stranger can open ${url.replace(/^https:\/\/github\.com\//, "")}`,
      status === 200,
      `Got ${status}. The room advertises this as readable source. If the repository is private every one of these is a dead link under a heading that says "built to be inspected".`
    );
  }
}

// --- The router's own guarantees, which no room can opt out of ---------------

{
  const unknown = await post("/api/demos/not-a-room/start");
  check(
    "an unknown room is refused by name",
    unknown.status === 404 && /not-a-room/.test(JSON.stringify(unknown.body)),
    `Got ${unknown.status} ${JSON.stringify(unknown.body).slice(0, 120)}. A 404 that does not name what was not found is a vague error.`
  );

  const noRun = await post("/api/demos/ledger-under-fire/transfer", { idemKey: "x" });
  check(
    "a shard without a run id is refused",
    noRun.status === 400,
    `Got ${noRun.status}. A shard must not be able to run outside a paid-for run.`
  );
}

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

{
  const unsafe = await runLedger("unsafe");
  if (unsafe.error) {
    check("the unsafe ledger run completes", false, unsafe.error);
  } else {
    const total = unsafe.state?.totalCents;
    const genesis = unsafe.state?.genesisCents ?? unsafe.genesisCents;
    check(
      "the unsafe path reports the invariant",
      typeof total === "number" && typeof genesis === "number",
      `state must return totalCents and genesisCents so the invariant is checkable. Got ${JSON.stringify(unsafe.state).slice(0, 200)}`
    );
    // The one assertion that cannot be faked by writing good code: the race has
    // to actually happen. It is concurrency, so it is not guaranteed on any single
    // run - but a run that never loses anything means the gap is not real, and the
    // room's central claim is then unearned.
    check(
      "the unsafe path loses money",
      typeof total === "number" && typeof genesis === "number" && total !== genesis,
      `Books balanced at ${total} against a genesis of ${genesis}. Either the read-then-write gap is not real, or the fan-out is not concurrent. Re-run once before believing it; if it balances repeatedly the room is telling a story about a race that does not happen.`
    );
  }

  const safe = await runLedger("safe");
  if (safe.error) {
    check("the safe ledger run completes", false, safe.error);
  } else {
    const total = safe.state?.totalCents;
    const genesis = safe.state?.genesisCents ?? safe.genesisCents;
    check(
      "the safe path keeps the books balanced",
      total === genesis,
      `Books at ${total} against a genesis of ${genesis}. The safe path lost money, which is the failure the whole room argues cannot happen.`
    );
  }
}

// --- Split-Brain Sandbox ----------------------------------------------------

{
  const started = await post("/api/demos/split-brain/start");
  if (started.status !== 200) {
    check("the cluster starts", false, `start failed: ${JSON.stringify(started.body).slice(0, 200)}`);
  } else {
    const { runId } = started.body;

    // Three nodes contending at once. Exactly one may come away holding it.
    //
    // `lease` is a STATE STRING, not a boolean - the first version of this probe
    // tested `body.acquired === true` and reported zero acquisitions on a room
    // that was working perfectly. A probe that models a response shape the server
    // does not have fails in the one direction that wastes the most time: it
    // accuses correct code.
    const ticks = await Promise.all(
      ["a", "b", "c"].map((node) => post("/api/demos/split-brain/tick", { runId, node }))
    );
    const acquired = ticks.filter((t) => t.body?.lease === "acquired");
    check(
      "exactly one node acquires the lease",
      acquired.length === 1,
      `${acquired.length} nodes report lease="acquired". The conditional update is not conditional, or its meta.changes is not being consulted. Got: ${ticks.map((t) => `${t.body?.node}:${t.body?.lease}`).join(", ")}`
    );

    // The refused nodes must be refused BY THE STORE, not by a JS branch that
    // decided not to try. A fenced write is the evidence the check happened where
    // the data is, which is the only place it is worth anything.
    const fenced = ticks.filter((t) => t.body?.lease === "refused" && t.body?.write === "fenced");
    check(
      "the nodes that lost are fenced at the store",
      fenced.length === 2,
      `${fenced.length} of the 2 losing nodes report write="fenced". A loser that is not fenced was refused somewhere other than the database.`
    );

    const state = await get(`/api/demos/split-brain/state?runId=${encodeURIComponent(runId)}`);
    const token = state.body?.lease?.token;
    check(
      "the lease carries a fencing token",
      typeof token === "number" && token > 0,
      `Got ${JSON.stringify(state.body?.lease)}. Without a monotonic token there is nothing for the store to fence on.`
    );
  }
}

console.log(failures ? `\n${failures} failed\n` : `\nall probes passed\n`);
process.exit(failures ? 1 : 0);
