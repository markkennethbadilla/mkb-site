// One credential, read out of the KeePassXC vault at the point of use and never
// written down (operating rule 16: the CSV vaults are gone).
//
// Three scripts need this - cf.mjs, probe-guide.mjs, bench-guide.mjs. The master
// password sits in Windows Credential Manager under
// keepassxc/personal-credential-vault (user "master"); it is read with the
// Python keyring package and fed to keepassxc-cli on stdin, never on argv.
//
// The value is returned to the caller and held in memory for as long as that
// process runs. It is never echoed, never passed as an argv, and never written to
// .env, .dev.vars or any config file.

import { execFileSync } from "node:child_process";

const VAULT = process.env.MKB_VAULT_KDBX ?? "G:/My Drive/credentials/personal-credential-vault.kdbx";
const KEYRING = ["-c", "import keyring;print(keyring.get_password('keepassxc/personal-credential-vault','master'),end='')"];

/**
 * The vault entry for one credential slug, shaped like the old CSV row so the
 * callers did not change: `secret_value` is the entry password and
 * `username_or_client_id` its user name.
 *
 * Exits the process with a message naming the vault rather than throwing,
 * because every caller is a command-line script and all three want the same
 * behaviour: say which vault and which slug, then stop.
 *
 * @param {string} slug entry title under the `credentials` group, e.g. "cloudflare/global-api-key"
 * @returns {{ secret_value: string, username_or_client_id: string }}
 */
export function vaultRow(slug) {
  const run = (file, args, input) => execFileSync(file, args, { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  let out;
  try {
    const pw = run("python", KEYRING);
    if (!pw) throw new Error("no master password in the keyring");
    out = run("keepassxc-cli", ["show", "-q", "-s", "-a", "UserName", "-a", "Password", VAULT, `credentials/${slug}`], pw + "\n");
  } catch (e) {
    console.error(`Cannot read "${slug}" from the vault at ${VAULT}: ${e.stderr?.trim() || e.message}`);
    process.exit(1);
  }
  const [username_or_client_id = "", secret_value = ""] = out.split(/\r?\n/);
  if (!secret_value) {
    console.error(`Vault has no usable secret for slug "${slug}" (looked in ${VAULT}).`);
    process.exit(1);
  }
  return { secret_value, username_or_client_id };
}
