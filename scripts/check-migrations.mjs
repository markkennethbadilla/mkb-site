// T08: every D1 migration applies cleanly, in order, to a fresh database of each binding.
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ok } from "./log.mjs";

const persist = mkdtempSync(join(tmpdir(), "mkb-site-migrate-"));
for (const binding of ["DEMO_DB", "WAREHOUSE_DB"]) {
  execFileSync(process.execPath, ["node_modules/wrangler/bin/wrangler.js", "d1", "migrations", "apply", binding, "--local", "--persist-to", persist], { stdio: "inherit", windowsHide: true });
}
execFileSync(process.execPath, ["A:/personal-markkennethbadilla/mkb-agentops/scripts/recycle.mjs", persist], { stdio: "inherit", windowsHide: true });
ok({ bindings: 2 });
