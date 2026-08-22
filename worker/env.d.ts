// The two bindings `wrangler types` cannot see, and why they are written by hand.
//
// worker-configuration.d.ts is generated from wrangler.jsonc, so it carries every
// binding declared there: KV, both D1 databases, both rate limiters, ASSETS. API
// keys are not declared there. They are set with `wrangler secret put` and read
// from the vault at deploy time, which is the whole point of a secret, so the
// generator has nothing to read them from. Cloudflare's answer is to list them in
// a local .dev.vars file - and .gitignore bans that file here on purpose, because
// secrets live in the vault and are read by slug at the point of use.
//
// So these two lines exist, and they merge into the one generated Env interface
// rather than starting a second one. Adding a binding to wrangler.jsonc still
// means re-running `wrangler types`, not editing this file.
interface Env {
  /** OpenRouter free tier. Powers the agent harness cascade. */
  OPENROUTER_API_KEY?: string;
  /** Mark's own DeepSeek key. The site guide and the ScoreAudit room run on it. */
  DEEPSEEK_API_KEY?: string;
}
