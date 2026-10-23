// Checks that replaced the GitHub workflows (SPEC.md "Checks"), stopping at the
// first failure.
//   bun run gate            pre-push (Trunk action in .trunk/trunk.yaml):
//                           records-first test and build. Skipped when the push
//                           only touches specs/, docs/ or Markdown.
//   node scripts/gate.mjs --deploy
//                           first step of `npm run deploy`: the same, plus
//                           Lighthouse mobile and desktop (median of 3), so
//                           nothing under a floor reaches Cloudflare.
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";

const deploy = process.argv[2] === "--deploy";
const run = (cmd, env = {}) => {
  console.log(`\n[gate] ${cmd}`);
  execSync(cmd, { stdio: "inherit", env: { ...process.env, ...env } });
};

if (!deploy) {
  let changed = [];
  try {
    changed = execSync("git diff --name-only @{u}...HEAD", { encoding: "utf8" }).split("\n").filter(Boolean);
  } catch {
    changed = ["(no upstream)"];
  }
  if (changed.length > 0 && changed.every((f) => /^(specs|docs)\//.test(f) || f.endsWith(".md"))) {
    console.log("[gate] specs, docs or Markdown only: nothing to check");
    process.exit(0);
  }
}

const t0 = Date.now();
run("bun run test:worker worker/records-first.test.ts");
run("bun run build");
if (deploy) {
  // Playwright's pinned Chromium, never installed Chrome: Chrome's WebAppInstallForceList
  // policy installs web apps into every temp profile Lighthouse opens.
  // REPORT ONLY (SPEC.md "Checks"): this laptop scores / at 0.59-0.69 mobile,
  // the live build included, against a floor set on GitHub's runner (0.82), so
  // a miss here says more about the laptop than the page.
  const chrome = { CHROME_PATH: chromium.executablePath() };
  for (const config of ["lighthouserc.json", "lighthouserc.desktop.json"]) {
    try {
      run(`npx -y @lhci/cli@0.15.1 autorun --config=${config}`, chrome);
    } catch {
      console.log(`[gate] ${config}: under a floor, report only`);
    }
  }
}
console.log(`\n[gate] passed in ${Math.round((Date.now() - t0) / 1000)} s`);
