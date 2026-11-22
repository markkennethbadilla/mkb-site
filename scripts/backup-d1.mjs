// Offsite D1 export plus restore proof (SPEC.md "Backups"): every table's row count must match after a restore.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { log, ok } from "./log.mjs";

const MAX_BYTES = 50 * 1024 * 1024; // rule 116 size ceiling
const DBS = ["mkb-site-demo", "mkb-site-warehouse"];
const KEEP = 4; // weekly runs: a month of history
const RECYCLE = "A:/personal-markkennethbadilla/mkb-agentops/scripts/recycle.mjs";
const stamp = new Date().toISOString().slice(0, 10);
const dir = process.argv[2] ?? join(process.env.USERPROFILE ?? tmpdir(), "cloud", "backups", "mkb-site", stamp);
const skipExport = process.argv.includes("--restore-only");
mkdirSync(dir, { recursive: true });

/** @type {{ stamp: string, dir: string, databases: { name: string, file: string, bytes: number, rows: Record<string, number> }[] }} */
const proof = { stamp, dir, databases: [] };
for (const name of DBS) {
  const file = join(dir, `${name}.sql`);
  if (!skipExport) execFileSync(process.execPath, ["scripts/cf.mjs", "d1", "export", name, "--remote", "--output", file], { stdio: "inherit", windowsHide: true });
  const bytes = statSync(file).size;
  if (bytes > MAX_BYTES) throw new Error(`${name} export ${bytes} bytes is over the ${MAX_BYTES} ceiling`);
  const sql = readFileSync(file, "utf8");
  /** @type {Record<string, number>} */
  const expected = {};
  for (const m of sql.matchAll(/^INSERT INTO "?(\w+)"?/gm)) { const t = m[1] ?? ""; expected[t] = (expected[t] ?? 0) + 1; }

  const db = new DatabaseSync(":memory:");
  db.exec(sql);
  const mismatch = Object.entries(expected)
    .map(([t, n]) => [t, n, db.prepare(`select count(*) as n from "${t}"`).get()?.n])
    .filter(([, n, got]) => n !== got);
  db.close();
  if (mismatch.length) throw new Error(`${name} restore mismatch: ${mismatch.map(([t, n, got]) => `${t} ${got}/${n}`).join(", ")}`);
  proof.databases.push({ name, file, bytes, rows: expected });
  log.info({ step: "RESTORED", db: name, bytes, tables: Object.keys(expected).length }, "backup-d1");
}
writeFileSync(join(dir, "restore-proof.json"), JSON.stringify(proof, null, 2));
const root = join(dir, "..");
const old = readdirSync(root).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().slice(0, -KEEP);
if (old.length) execFileSync(process.execPath, [RECYCLE, ...old.map((d) => join(root, d))], { stdio: "inherit", windowsHide: true });
ok({ dir, databases: proof.databases.map((d) => `${d.name} ${d.bytes} B`) });
