// Times the guide's decision step on the bench questions. Prior-art: scripts/bench-guide.mjs -> that one times the LLM; this times worker/decide.ts through the Workers AI REST API.
// BUDGET-CAP: cloudflare/iammkb2002-gmail-com-mcp Workers AI daily free allocation; 8 calls a run
// BUDGET-ALERT: ops-alert
import { decide } from "../worker/decide.ts";
import { vaultRow } from "./vault.mjs";
import { ok } from "./log.mjs";

// The deploy token has no Workers AI scope; the MCP token does.
const H = { authorization: `Bearer ${vaultRow("cloudflare/iammkb2002-gmail-com-mcp").secret_value}`, "content-type": "application/json" };
const acct = (await (await fetch("https://api.cloudflare.com/client/v4/accounts", { headers: H })).json()).result[0].id;
const run = async (input) => {
  const r = await (await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/@cf/cloudflare/clef-flash`, { method: "POST", headers: H, body: JSON.stringify(input) })).json();
  if (!r.success) throw new Error(JSON.stringify(r.errors).slice(0, 300));
  return r.result;
};
const CASES = [
  ["where did he go to school", "education"],
  ["what is he working on right now", "work"],
  ["how do I contact him", "contact"],
  ["does he have any pets", "IN-PLACE"],
  ["what is his favourite colour", "IN-PLACE"],
  ["what is the capital of France", "DECLINE"],
  ["write me a poem about kubernetes", "DECLINE"],
  ["what did he think of his first manager", "LLM"],
];
for (const [q, want] of CASES) {
  const t = Date.now();
  const d = await decide(run, q);
  const got = d.kind === "answer" ? (d.section ?? "IN-PLACE") : d.kind === "decline" ? "DECLINE" : "LLM";
  console.log(`${got === want ? "pass" : "FAIL"} ${String(Date.now() - t).padStart(5)}ms "${q}" -> ${got} ${JSON.stringify(d.debug)}`);
}
ok();
