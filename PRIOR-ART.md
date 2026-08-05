# Prior Art

The brief was explicit: do not hand-roll a portfolio, because a hand-rolled one looks
hand-rolled. Candidates were opened in a real browser and judged on screenshots, not on
descriptions.

## Considered

| Candidate | License | Verdict |
|---|---|---|
| [`magicuidesign/portfolio`](https://github.com/magicuidesign/portfolio) (1.4k stars) | **MIT** | **ADOPTED.** Dark, well-typed, content-driven from a single `src/data/resume.tsx`. Plainer than the best-looking option, but the only strong candidate whose licence permits unrestricted use. |
| [`once-ui-system/magic-portfolio`](https://github.com/once-ui-system/magic-portfolio) (1.3k stars) | **CC BY-NC 4.0** | Rejected on licence. Best-looking free option, but NonCommercial is the wrong footing for a professional site, and the attribution clause forces a credit link. |
| Kinetic Studio (Astro, paid) | Commercial | Rejected. The strongest visual of the set, but shaped as an agency site ("Services", "Process", "Start a Project") and would need gutting anyway. |
| chronark.com | n/a | Rejected. Beautifully restrained but far too sparse; no surface to host live demos. |
| Stardrive (Astro boilerplate) | n/a | Rejected. A SaaS product landing page, not a portfolio. |
| August (Astro) | Paid | Rejected. Playful sticker-and-marker aesthetic; wrong signal for an infrastructure engineer. |
| Hand-building from scratch | n/a | Rejected by the brief, and rightly: the previous iteration of this site was hand-rolled and read as AI-generated. |

## Hosting

Cloudflare Workers static assets. The zone was already on this Cloudflare account, the free
tier covers it, and a static export has no server runtime to pay for or cold-start.

**`@opennextjs/cloudflare` was tried first and abandoned:** it cannot build from a non-`C:`
drive on Windows, because Node's ESM loader rejects an `a:` URL scheme. Since every route
here prerenders, `output: "export"` is both simpler and strictly more robust. Revisit
OpenNext only if a route genuinely needs a server.

## Still owed

The site is currently a good-looking resume. The thing that makes it a portfolio worth
visiting - live, non-chatbot demonstrations of agentic systems - is not built yet.
