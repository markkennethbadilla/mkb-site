// Runs wrangler with Cloudflare credentials read from the vault at the point of
// use, then forgets them.
//
// Wrangler is non-interactive here, so it needs credentials in the environment.
// The rule is that secrets live in exactly one place - the vault - and are read
// by slug when needed, never copied into .env, a config file, a script, or a
// shell history line. This process holds the value for as long as the child runs
// and no longer.
//
// Usage: node scripts/cf.mjs d1 migrations apply mkb-site-demo --remote

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { vaultRow } from "./vault.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const creds = vaultRow("cloudflare/global-api-key");

// Spawn wrangler's JS entrypoint under this same Node, not the npx shim: Node 24
// on Windows refuses to spawn a .cmd without a shell (EINVAL), and turning the
// shell on would put every argument through cmd.exe quoting rules.
const WRANGLER = join(ROOT, "node_modules", "wrangler", "bin", "wrangler.js");
if (!existsSync(WRANGLER)) {
  console.error(`wrangler is not installed at ${WRANGLER}. Run: npm install`);
  process.exit(1);
}

const child = spawn(
  process.execPath,
  [WRANGLER, ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      CLOUDFLARE_API_KEY: creds.secret_value,
      CLOUDFLARE_EMAIL: creds.username_or_client_id,
    },
  }
);
child.on("exit", (code) => process.exit(code ?? 1));
