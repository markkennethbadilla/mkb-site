/**
 * Which models the guide runs on, and where they live.
 *
 * A leaf module with no imports, for the same reason as grounding.ts and
 * public-facts.ts: scripts/probe-guide.mjs has to load this under plain Node to
 * test the chain that actually ships, and Node's ESM loader will not resolve the
 * extensionless relative imports the Worker bundle uses. Anything the probe needs
 * has to be reachable without pulling the Worker in behind it.
 *
 * The guide runs on Mark's own DeepSeek key rather than free inference. Free
 * models answered in 6 to 9 seconds, which is long enough that a visitor assumes
 * the page is broken. Measured on the real task (scripts/bench-guide.mjs, six
 * representative questions, one round trip each):
 *
 *   deepseek-v4-flash   mean 1342 ms   1594 tokens   6/6 correct
 *   deepseek-v4-pro     mean 2951 ms   1553 tokens   6/6 correct
 *
 * Flash is primary on that evidence. Pro is the fallback, which makes the fallback
 * an UPGRADE - a deliberate inversion of the usual rule, recorded here rather than
 * done quietly. That rule exists to stop a costly path running unwatched; here the
 * escalation is a single retry, fired only when flash returns no usable tool call,
 * bounded by the daily call ceiling, made rare by the similarity cache, and
 * backstopped by the key's own spending cap. Pro first would cost every visitor
 * three seconds to avoid a retry that the benchmark says should not happen.
 *
 * Ids are pinned and exact. A floating alias would repoint both the model and the
 * price under a running site.
 */

export const GUIDE_CHAIN = ["deepseek-v4-flash", "deepseek-v4-pro"] as const;

export const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
