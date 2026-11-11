import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { vaultRow } from "./vault.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const wrangler = join(ROOT, "node_modules", "wrangler", "bin", "wrangler.js");
const run = (args, env = {}) =>
  new Promise((resolve, reject) => {
    console.log(`START wrangler ${args.join(" ")}`);
    const child = spawn(process.execPath, [wrangler, ...args], {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
    child.on("exit", (code) => {
      if (code === 0) {
        console.log(`OK wrangler ${args.join(" ")}`);
        resolve();
      } else {
        console.error(`FAIL wrangler ${args.join(" ")} exit=${code}`);
        reject(new Error(`exit ${code}`));
      }
    });
  });

try {
  await run(["d1", "migrations", "apply", "DEMO_DB", "--local"], { CI: "true" });
  await run(["d1", "migrations", "apply", "WAREHOUSE_DB", "--local"], { CI: "true" });
  await run(["dev", "--port", "8788"], {
    CLOUDFLARE_INCLUDE_PROCESS_ENV: "true",
    DEEPSEEK_API_KEY: vaultRow("deepseek/active-personal-api-key").secret_value,
  });
} catch {
  process.exit(1);
}
