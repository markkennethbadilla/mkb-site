// Deterministic primitives for the seed generator.
//
// Every source of variation in the seed lives here, and every one of them is
// reproducible: a fixed-seed PRNG instead of Math.random, arithmetic dates instead
// of an argless new Date(). Re-running gen-seed.mjs produces byte-identical SQL, so
// the committed migrations are reviewable as a diff rather than churning on every
// run (rule 36).
//
// The PRNG instance is shared and STATEFUL, so the order of calls across the
// generator is part of the output. Reordering how the warehouse and the books are
// built will change the data even though no logic changed.

/** mulberry32 - small, fast, and identical across Node versions. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const r = mulberry32(20260805);
export const pick = (xs) => xs[Math.floor(r() * xs.length)];
export const int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
export const chance = (p) => r() < p;

/** Days since 2024-01-01, rendered as an ISO date. */
const EPOCH = Date.UTC(2024, 0, 1);
export const day = (n) => new Date(EPOCH + n * 86400000).toISOString().slice(0, 10);
export const stamp = (n, h = 9) =>
  new Date(EPOCH + n * 86400000 + h * 3600000).toISOString().slice(0, 19) + "Z";
/** Days from 2024-01-01 to the first of the given 2026 month. */
export const monthStart = (m) => Math.round((Date.UTC(2026, m - 1, 1) - EPOCH) / 86400000);

/** SQL string literal, with quotes doubled. */
export const q = (s) => "'" + String(s).replaceAll("'", "''") + "'";

/** Batched multi-row INSERTs. D1 rejects a single statement of unbounded length. */
export const rows = (table, cols, values) => {
  const out = [];
  for (let i = 0; i < values.length; i += 100) {
    out.push(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES\n  ` +
        values.slice(i, i + 100).join(",\n  ") +
        ";"
    );
  }
  return out.join("\n\n");
};
