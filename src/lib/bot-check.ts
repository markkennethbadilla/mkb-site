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

export async function botToken(): Promise<string> {
  const ts = await load();
  const local = ["localhost", "127.0.0.1"].includes(location.hostname);
  const el = document.createElement("div");
  // Visible only when Cloudflare needs an interaction (appearance interaction-only).
  el.style.cssText = "position:fixed;bottom:1rem;right:1rem;z-index:60";
  document.body.appendChild(el);
  try {
    return await new Promise<string>((resolve, reject) => {
      const id = ts.render(el, {
        sitekey: local ? TEST_KEY : SITE_KEY,
        execution: "execute",
        appearance: "interaction-only",
        callback: resolve,
        "error-callback": () => reject(new Error("The bot check failed. Reload the page and try again.")),
      });
      ts.execute(id);
    });
  } finally {
    el.remove();
  }
}

export const BOT_HEADER = "cf-turnstile-response";
