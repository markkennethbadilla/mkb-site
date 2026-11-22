// Turnstile siteverify for /api/guide and demo run creation (SPEC.md "Bot and rate limits").
const VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
// Cloudflare's published always-pass test secret; local runs pass it with `--var TURNSTILE_SECRET:...`.
const TEST_SECRET = "1x0000000000000000000000000000000AA";

/** null when the request passes; otherwise the refusal response. Fails closed when the secret is missing in production. */
export async function botRefusal(req: Request, env: Env): Promise<Response | null> {
  const secret = env.TURNSTILE_SECRET;
  if (!secret) {
    console.error("FAIL bot-check: TURNSTILE_SECRET is not set");
    return Response.json({ error: "The bot check is not configured, so this endpoint is closed." }, { status: 503 });
  }
  const token = req.headers.get("cf-turnstile-response");
  if (!token) return Response.json({ error: "Missing bot check token. Reload the page and try again.", reason: "bot-check" }, { status: 403 });
  if (secret === TEST_SECRET) return null; // the test secret always passes; skip the network round trip
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  const ip = req.headers.get("cf-connecting-ip");
  if (ip) form.append("remoteip", ip);
  const res = await fetch(VERIFY, { method: "POST", body: form });
  const out = (await res.json().catch(() => ({ success: false }))) as { success: boolean; "error-codes"?: string[] };
  if (out.success) return null;
  console.error(`FAIL bot-check: ${(out["error-codes"] ?? []).join(",") || res.status}`);
  return Response.json({ error: "The bot check did not pass. Reload the page and try again.", reason: "bot-check" }, { status: 403 });
}
