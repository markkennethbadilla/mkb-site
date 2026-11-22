// Runs promptfoo with this project's OpenRouter key (1 USD monthly limit, SPEC.md "Budget cap") read from the vault.
import { spawnSync } from "node:child_process";
import { ok } from "./log.mjs";
import { vaultRow } from "./vault.mjs";

const key = process.env.OPENROUTER_API_KEY ?? vaultRow("openrouter/personal-api-key").secret_value;
const env = {
  ...process.env,
  OPENROUTER_API_KEY: key,
  PROMPTFOO_DISABLE_TELEMETRY: "1",
  PROMPTFOO_DISABLE_UPDATE: "1",
  PROMPTFOO_DISABLE_REMOTE_GENERATION: "true",
};
const run = (args) => {
  const r = spawnSync("npx", ["-y", "promptfoo@0.126.0", ...args], { stdio: "inherit", env, shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
if (process.argv[2] === "redteam") {
  run(["redteam", "generate", "-c", "promptfooconfig.redteam.yaml", "--force", "-o", "redteam.yaml"]);
  run(["redteam", "eval", "-c", "redteam.yaml", "--max-concurrency", "4", "--no-progress-bar", "-o", "test-runs/redteam.json"]);
} else {
  run(["eval", "-c", "promptfooconfig.mjs", "--no-cache", "--no-progress-bar", "-o", "test-runs/evals.json"]);
}
ok({ mode: process.argv[2] ?? "evals" });
