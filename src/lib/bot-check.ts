// Cloudflare Turnstile, invisible, one fresh token per guarded request (SPEC.md "Bot and rate limits").
const SITE_KEY = "0x4AAAAAAGM-upb8s_srlkEI";
// Cloudflare's published always-pass test key, so local runs and e2e never meet a real challenge.
const TEST_KEY = "1x00000000000000000000AA";
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Turnstile = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  execute: (id: string) => void;
  reset: (id: string) => void;
};
declare global {
  interface Window { turnstile?: Turnstile }
}

let ready: Promise<Turnstile> | undefined;
function load(): Promise<Turnstile> {
  ready ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile did not load.")));
    s.onerror = () => { ready = undefined; reject(new Error("The bot check could not load. Check your connection and try again.")); };
    document.head.appendChild(s);
  });
  return ready;
}

// One widget, reused; a token is fetched ahead so a guarded request never waits on the challenge.
let id: string | undefined;
let pend: { res: (t: string) => void; rej: (e: Error) => void } | undefined;
let queue: Promise<unknown> = Promise.resolve();
let next: Promise<string> | undefined;
let at = 0;

function fresh(): Promise<string> {
  const run = queue.catch(() => undefined).then(async () => { // SILENT-OK: the earlier run's error already reached its caller
    const ts = await load();
    return new Promise<string>((res, rej) => {
      pend = { res, rej };
      if (id === undefined) {
        const el = document.createElement("div");
        // Visible only when Cloudflare needs an interaction (appearance interaction-only).
        el.style.cssText = "position:fixed;bottom:1rem;right:1rem;z-index:60";
        document.body.appendChild(el);
        id = ts.render(el, {
          sitekey: ["localhost", "127.0.0.1"].includes(location.hostname) ? TEST_KEY : SITE_KEY,
          execution: "execute",
          appearance: "interaction-only",
          callback: (t: string) => pend?.res(t),
          "error-callback": () => pend?.rej(new Error("The bot check failed. Reload the page and try again.")),
        });
      } else ts.reset(id);
      ts.execute(id);
    });
  });
  queue = run;
  return run;
}

function prefetch() {
  at = Date.now();
  const p = fresh();
  next = p;
  p.catch((e: Error) => {
    console.warn("bot-check prefetch failed:", e.message);
    if (next === p) next = undefined;
  });
}

export async function botToken(): Promise<string> {
  // Tokens live 300 s; reuse a prefetched one only well inside that.
  const p = next && Date.now() - at < 240_000 ? next : fresh();
  next = undefined;
  const t = await p;
  prefetch();
  return t;
}

// Warm up as soon as this loads (guide-lazy imports it on idle), so the first guarded request is instant.
if (typeof window !== "undefined") {
  if (document.readyState === "complete") prefetch();
  else window.addEventListener("load", () => setTimeout(prefetch, 1000), { once: true });
}

export const BOT_HEADER = "cf-turnstile-response";
