// One credential, read out of the vault at the point of use and never written
// down.
//
// Three scripts need this - cf.mjs, probe-guide.mjs, bench-guide.mjs - and until
// now all three carried their own copy of a hand-written RFC 4180 reader. Quoting,
// doubled quotes, CRLF line endings and newlines inside a quoted field are the
// classic places a small CSV reader goes wrong, and having three of them meant
// three places to get it wrong differently. csv-parse is the maintained parser and
// this file is the only caller of it.
//
// The value is returned to the caller and held in memory for as long as that
// process runs. It is never echoed, never passed as an argv, and never written to
// .env, .dev.vars or any config file.

import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";

const VAULT = process.env.MKB_VAULT_CSV ?? "A:\\credentials\\personal-credential-vault.csv";

/**
 * The vault row for one credential slug.
 *
 * Exits the process with a message naming the vault path rather than throwing,
 * because every caller is a command-line script and all three want the same
 * behaviour: say which file and which slug, then stop.
 *
 * @param {string} slug value of the credential_slug column, e.g. "cloudflare/global-api-key"
 * @returns {Record<string, string>} the whole row, keyed by the CSV header
 */
export function vaultRow(slug) {
  /** @type {Record<string, string>[]} */
  let rows;
  try {
    // csv-parse types the return as unknown[] until it is told what a row looks
    // like, and `columns: true` is what makes a row an object keyed by the header.
    rows = /** @type {Record<string, string>[]} */ (
      parse(readFileSync(VAULT, "utf8"), {
        columns: true,
        skip_empty_lines: true,
        // A trailing comma or a short final row should not abort the read. The row
        // being looked for either has a secret_value or it does not, and the check
        // below is what decides that.
        relax_column_count: true,
        bom: true,
      })
    );
  } catch (e) {
    console.error(`Cannot read the credential vault at ${VAULT}: ${e.message}`);
    process.exit(1);
  }

  const row = rows.find((r) => r.credential_slug === slug);
  if (!row?.secret_value) {
    console.error(`Vault has no usable secret for slug "${slug}" (looked in ${VAULT}).`);
    process.exit(1);
  }
  return row;
}
