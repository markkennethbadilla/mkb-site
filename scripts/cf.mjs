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
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VAULT = process.env.MKB_VAULT_CSV ?? "A:\\credentials\\personal-credential-vault.csv";
const SLUG = "cloudflare/global-api-key";

/** Minimal RFC4180 reader - the vault has quoted fields with embedded commas. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

let creds;
try {
  creds = parseCsv(readFileSync(VAULT, "utf8")).find((r) => r.credential_slug === SLUG);
} catch (e) {
  console.error(`Cannot read the credential vault at ${VAULT}: ${e.message}`);
  process.exit(1);
}
if (!creds?.secret_value) {
  console.error(`Vault has no usable secret for slug "${SLUG}" (looked in ${VAULT}).`);
  process.exit(1);
}

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
