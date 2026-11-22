import assert from "node:assert/strict";
import { test } from "node:test";
import { isStaleBuild, recoverFromStaleBuild } from "../src/lib/stale-build.ts";

test("a stale chunk is recognised, an ordinary fault is not", () => {
  assert.ok(isStaleBuild(new Error("Loading chunk 123 failed.")));
  assert.ok(isStaleBuild({ name: "ChunkLoadError", message: "x" }));
  assert.ok(!isStaleBuild(new TypeError("undefined is not a function")));
});

test("reloads once, never loops", () => {
  const m = new Map();
  const store = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
  let reloads = 0;
  assert.equal(recoverFromStaleBuild(new Error("ChunkLoadError"), store, () => reloads++), true);
  assert.equal(recoverFromStaleBuild(new Error("ChunkLoadError"), store, () => reloads++), false);
  assert.equal(reloads, 1);
});
