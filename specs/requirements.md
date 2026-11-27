# mkb-site requirements

OpenFastTrace register (coverage register T24, mkb-agentops spec 145 "Item format"): one item per locked decision of `SPEC.md` and one per other section, with the tests and gates that hold them, traced on every push by Trunk action `trace-on-push`. First mapping 2026-11-26: a PARTIAL item names what is judged by eye or not yet tested.

### spec:site.d1
`req~spec_site.d1~1`

> Forked `magicuidesign/portfolio` (MIT), not hand-built.

Rationale:
a decision record; new code needs a Prior-art line, nothing re-checks the fork itself

Comment:
spec: site
source: SPEC.md
enforcer: repo:PRIOR-ART.md
enforcer: hook:guard-prior-art

Tags: PARTIAL, beforePARTIAL

### spec:site.d2
`req~spec_site.d2~1`

> The look follows once-ui `magic-portfolio`, rebuilt in our own code.

Rationale:
a decision record; the look is judged by eye and held by the approved screens (e2e/screens.spec.ts)

Comment:
spec: site
source: SPEC.md
enforcer: repo:PRIOR-ART.md

Tags: PARTIAL, beforePARTIAL

### spec:site.d3
`req~spec_site.d3~1`

> Static export, not the OpenNext Workers adapter.

Comment:
spec: site
source: SPEC.md
enforcer: repo:next.config.mjs#output: "export"
enforcer: repo:wrangler.jsonc

Tags: HARD, beforeHARD

Needs: impl

### spec:site.d4
`req~spec_site.d4~1`

> Free models are discovered at runtime, never hardcoded

Rationale:
the harness discovery and the guide's pinned exact ids are code; no test refuses a floating alias

Comment:
spec: site
source: SPEC.md
enforcer: repo:worker/models.ts
enforcer: repo:ai.config.json

Tags: PARTIAL, beforePARTIAL

### spec:site.d4b
`req~spec_site.d4b~1`

> A decision model answers first; the LLM only when the page has no answer.

Rationale:
worker/decide.test.ts asserts the thresholds (answer, in place, decline, hand to LLM); the LLM order is config

Comment:
spec: site
source: SPEC.md
enforcer: repo:ai.config.json
enforcer: repo:worker/guide.ts

Tags: PARTIAL, beforePARTIAL

### spec:site.d5
`req~spec_site.d5~1`

> Filter free models on modality exclusively, not inclusively.

Rationale:
the filter is code; no test case with an audio-plus-text model

Comment:
spec: site
source: SPEC.md
enforcer: repo:worker/models.ts#output_modalities

Tags: PARTIAL, beforePARTIAL

### spec:site.d6
`req~spec_site.d6~1`

> `generateText` + explicit Zod parse, not `generateObject`.

Comment:
spec: site
source: SPEC.md
enforcer: repo:worker/guide.ts#generateText
enforcer: repo:tests/guide.test.mjs#whatever tool speaks to the visitor runs the grounding check

Tags: HARD, beforeHARD

Needs: impl

### spec:site.d7
`req~spec_site.d7~1`

> Gates run client-side and are readable.

Rationale:
the file exists; nothing checks it ships to the browser

Comment:
spec: site
source: SPEC.md
enforcer: repo:src/lib/gates.ts

Tags: PARTIAL, beforePARTIAL

### spec:site.d8
`req~spec_site.d8~1`

> Degradation is announced, never faked.

Rationale:
flows cover the refusal paths; the panel copy for each degraded state is checked by eye

Comment:
spec: site
source: SPEC.md
enforcer: repo:worker/flows.test.ts

Tags: PARTIAL, beforePARTIAL

### spec:site.d9
`req~spec_site.d9~1`

> The guide answers from a closed corpus, and the answer is checked.

Comment:
spec: site
source: SPEC.md
enforcer: repo:tests/guide.test.mjs#rejected answers never reach the visitor
enforcer: repo:tests/guide.test.mjs#the fact corpus is populated
enforcer: repo:src/lib/grounding.ts#checkGrounding

Tags: HARD, beforeHARD

Needs: impl

### spec:site.d9b
`req~spec_site.d9b~1`

> The fact corpus excludes age and date of birth.

Comment:
spec: site
source: SPEC.md
enforcer: repo:tests/guide.test.mjs#no fact leaks an age or date of birth

Tags: HARD, beforeHARD

Needs: impl

### spec:site.d9c
`req~spec_site.d9c~1`

> The cache is lexical, and says so.

Comment:
spec: site
source: SPEC.md
enforcer: repo:tests/guide.test.mjs#cache \$\{c\.same
enforcer: repo:worker/cache-golden.test.ts

Tags: HARD, beforeHARD

Needs: impl

### spec:site.d10
`req~spec_site.d10~1`

> Section ids are an allowlist, checked at build.

Comment:
spec: site
source: SPEC.md
enforcer: repo:tests/guide.test.mjs#exists in page\.tsx
enforcer: repo:src/lib/site-sections.ts#SECTION_IDS

Tags: HARD, beforeHARD

Needs: impl

### spec:site.d11
`req~spec_site.d11~1`

> The entity is hand-authored SVG, not a marketplace asset.

Rationale:
the component exists; Rive is refused by declined-tools, not by a test here

Comment:
spec: site
source: SPEC.md
enforcer: repo:src/components/demo/entity.tsx

Tags: PARTIAL, beforePARTIAL

### spec:site.d12
`req~spec_site.d12~1`

> `prefers-reduced-motion` skips the journey, never the destination.

Rationale:
no test renders with reduced motion and compares the element tree

Comment:
spec: site
source: SPEC.md
enforcer: repo:src/components/demo/entity.tsx#useReducedMotion

Tags: PARTIAL, beforePARTIAL

### spec:site.d13
`req~spec_site.d13~1`

> The guide shows its own workings, with no toggle.

Rationale:
the workings line is checked by eye in the screens

Comment:
spec: site
source: SPEC.md
enforcer: repo:src/components/demo/agent-console.tsx

Tags: PARTIAL, beforePARTIAL

### spec:site.d14
`req~spec_site.d14~1`

> Copy never asserts behaviour the guide does not always perform.

Rationale:
copy truth is judged by reading

Comment:
spec: site
source: SPEC.md
enforcer: repo:src/components/demo/agent-console.tsx

Tags: PARTIAL, beforePARTIAL

### spec:site.d15
`req~spec_site.d15~1`

> Anything positioned against the entity is MEASURED, not computed.

Rationale:
Floating UI is used; no test of the in-viewport bubble

Comment:
spec: site
source: SPEC.md
enforcer: repo:src/components/demo/entity-overlay.tsx#floating-ui

Tags: PARTIAL, beforePARTIAL

### spec:site.d16
`req~spec_site.d16~1`

> Demo slugs are permanent.

Comment:
spec: site
source: SPEC.md
enforcer: repo:tests/demos.test.mjs#has a route
enforcer: repo:tests/demos.test.mjs#is not open, so it must not have a page

Tags: HARD, beforeHARD

Needs: impl

### spec:site.d17
`req~spec_site.d17~1`

> A room re-lights the whole interface through `--tint-hue`, applied to

Rationale:
the property is declared; portals in the room hue are checked by eye

Comment:
spec: site
source: SPEC.md
enforcer: repo:src/app/globals.css#tint-hue

Tags: PARTIAL, beforePARTIAL

### spec:site.d18
`req~spec_site.d18~1`

> Three explicit route folders, not a `[slug]` dynamic route.

Rationale:
the folders exist; nothing refuses a dynamic route

Comment:
spec: site
source: SPEC.md
enforcer: repo:src/app/demos

Tags: PARTIAL, beforePARTIAL

### spec:site.d19
`req~spec_site.d19~1`

> The site's chrome lives in a `(site)` route group, not in the root layout.

Rationale:
the route group exists; nothing refuses chrome in the root layout

Comment:
spec: site
source: SPEC.md
enforcer: repo:src/app/(site)

Tags: PARTIAL, beforePARTIAL

### spec:site.d20
`req~spec_site.d20~1`

> One reserve per RUN, at creation, IP-keyed - never per request.

Comment:
spec: site
source: SPEC.md
enforcer: repo:worker/demos/router.ts#requestsPerRun
enforcer: repo:tests/demos.test.mjs#limitRun|reserve

Tags: HARD, beforeHARD

Needs: impl

### spec:site.d21
`req~spec_site.d21~1`

> Every room states what it does NOT prove, in fixed position, never

Comment:
spec: site
source: SPEC.md
enforcer: repo:tests/demos.test.mjs#scope\.\$\{key\} is written
enforcer: repo:tests/demos.test.mjs#injectionPoint

Tags: HARD, beforeHARD

Needs: impl

### spec:site.d22
`req~spec_site.d22~1`

> A promise may count its inputs and never its outcomes.

Comment:
spec: site
source: SPEC.md
enforcer: repo:tests/demos.test.mjs

Tags: HARD, beforeHARD

Needs: impl

### spec:site.d23
`req~spec_site.d23~1`

> The demo gallery has no live/resting badge.

Rationale:
absence of a badge is not tested

Comment:
spec: site
source: SPEC.md
enforcer: repo:src/components/demos/room-card.tsx

Tags: PARTIAL, beforePARTIAL

### spec:site.d24
`req~spec_site.d24~1`

> `sql-guard.ts` guards model-authored SQL only, which is ScoreAudit and

Comment:
spec: site
source: SPEC.md
enforcer: repo:tests/guide.test.mjs#sql guard refuses
enforcer: repo:worker/sql-boundary.test.ts

Tags: HARD, beforeHARD

Needs: impl

### spec:site.d25
`req~spec_site.d25~1`

> The site guide does not route into rooms.

Comment:
spec: site
source: SPEC.md
enforcer: repo:tests/guide.test.mjs#exists in page\.tsx

Tags: HARD, beforeHARD

Needs: impl

### spec:site.d26
`req~spec_site.d26~1`

> Figures in the fact corpus are bound to the fact that licensed them.

Comment:
spec: site
source: SPEC.md
enforcer: repo:tests/guide.test.mjs#licenses every figure it states
enforcer: repo:tests/guide.test.mjs#is bound to something

Tags: HARD, beforeHARD

Needs: impl

### spec:site.d27
`req~spec_site.d27~1`

> His real work may be described, anonymised. The nouns and the counts that

Comment:
spec: site
source: SPEC.md
enforcer: repo:tests/guide.test.mjs#names no employer internal
enforcer: repo:tests/guide.test.mjs#page prose names no employer internal

Tags: HARD, beforeHARD

Needs: impl

### spec:site.d28
`req~spec_site.d28~1`

> The resume is JSON Resume, rendered at build, never hand-built.

Rationale:
the build renders it; the one-page check (pypdf, raster look) is run by hand before a deploy

Comment:
spec: site
source: SPEC.md
enforcer: repo:scripts/build-resume.mjs
enforcer: repo:package.json#build-resume

Tags: PARTIAL, beforePARTIAL

### spec:site.s31
`req~spec_site.s31~1`

> Rebuilt in our own code from the once-ui `magic-portfolio` demo (studied, never copied): a quiet neutral page, one green wash at the top, a floating pill nav, tight bold type, hairline cards.
> | Radius | cards 1rem, pills and buttons full |
> | Motion | hovers only: a card rises 2px and its border takes the accent, 200 ms ease out; the theme icon spins in on change (reduced motion: none) |
> | Feedback | everything clickable shows the pointer cursor (`globals.css` base layer, since Tailwind v4 dropped it on buttons); the theme toggle cycles follow system, light, dark with a Monitor, Sun or Moon icon for the current choice and says both current and next in its name |

Rationale:
section What it does: its lines are held by the repo gate and the deploy gate as a whole; per-line tracing is the next mapping

Comment:
spec: site
source: SPEC.md
enforcer: repo:.trunk/trunk.yaml#repo-checks-on-push
enforcer: hook:guard-spec-sync
enforcer: hook:guard-deploy-gate

Tags: PARTIAL, beforePARTIAL

### spec:site.s32
`req~spec_site.s32~1`

> - `maxOutputTokens` is always 600 per step.
> - Turnstile (widget `mkb-site guide and demos`, invisible, vault `cloudflare/iammkb2002-turnstile-mkb-site`): OPTIONAL, changed 2026-11-27 because minting a token took about 3 s and visitors waited on it. `src/components/demo/guide-lazy.tsx` imports `src/lib/bot-check.ts` once the page is idle; one reused widget mints tokens in the background, and a guide question or demo run creation attaches one (header `cf-turnstile-response`) only if it is already minted, never waiting (a token older than 240 s of its 300 s life is skipped). `worker/bot-check.ts` lets a request without a token through; the edge burst limiter, the per-IP and pool caps, the daily model-call ceiling and the key spend limits bound load. A token that is sent is verified with siteverify; a failed one is `403 {reason:"bot-check"}`, still recorded first. A missing `TURNSTILE_SECRET` in production closes both endpoints (503). Local runs use Cloudflare's always-pass test keys: the browser picks the test sitekey on localhost and 127.0.0.1, and `scripts/dev-worker.mjs` and `playwright.config.ts` pass `--var TURNSTILE_SECRET:<test secret>` to the local Worker (the local runner rewrites the request host to the route domain, so the Worker cannot tell local from live by host). The e2e fixture (`e2e/fixtures.ts`) also answers PostHog and Turnstile's script locally, so no test depends on a vendor CDN or reaches the real PostHog project. Proof: `worker/bot-check.test.ts`.

Rationale:
section How it works: its lines are held by the repo gate and the deploy gate as a whole; per-line tracing is the next mapping

Comment:
spec: site
source: SPEC.md
enforcer: repo:.trunk/trunk.yaml#repo-checks-on-push
enforcer: hook:guard-spec-sync
enforcer: hook:guard-deploy-gate

Tags: PARTIAL, beforePARTIAL

### spec:site.s33
`req~spec_site.s33~1`

> - D1 `mkb-site-demo` (`DEMO_DB`): `inbound_requests` (every POST, rule 43), arena tables, budget counters, guide answer cache rows. Swept hourly by the cron in `wrangler.jsonc` (arenas only; `inbound_requests` is never deleted).
> - **Secrets** (personal vault, read by `scripts/vault.mjs`, never written to a file):

Rationale:
section What it reads and writes: its lines are held by the repo gate and the deploy gate as a whole; per-line tracing is the next mapping

Comment:
spec: site
source: SPEC.md
enforcer: repo:.trunk/trunk.yaml#repo-checks-on-push
enforcer: hook:guard-spec-sync
enforcer: hook:guard-deploy-gate

Tags: PARTIAL, beforePARTIAL

### spec:site.s34
`req~spec_site.s34~1`

> 2. Pending D1 migrations to `mkb-site-demo` and `mkb-site-warehouse` (remote). Migrations go first so the code never runs against a schema it does not expect: on 2026-08-22 the Worker shipped reading `split_brain_events.id` while migration 0007 sat unapplied, and the Split-Brain Sandbox returned 500 on every run until 2026-10-12.
> - Wrangler runs through `scripts/cf.mjs` with the scoped token in vault `credentials/cloudflare/iammkb2002-workers-deploy`, never the Global API Key.
> - Lighthouse: the live site, daily, from mkb-vps-sg (personal-infra `servers/mkb-vps-sg/lighthouse/`), floor 0.70 in every category on every page (agentops rule 73), never in the deploy or the push. URLs and floors: personal-infra `servers/mkb-vps-sg/lighthouse/mkb-site.lighthouserc.json`; result ping healthchecks.io `manga lighthouse-live (daily)`, email on a miss.
> - Install the hooks once per clone: `trunk git-hooks sync`. `git push --no-verify` skips the push gate, but `bun run deploy` always runs `bun run gate`.
> | Run-id-keyed limiter never limited run creation | IP-keyed reserve; `tests/demos.test.mjs` asserts reserve() in the router |

Rationale:
section How to run, check and hand over: its lines are held by the repo gate and the deploy gate as a whole; per-line tracing is the next mapping

Comment:
spec: site
source: SPEC.md
enforcer: repo:.trunk/trunk.yaml#repo-checks-on-push
enforcer: hook:guard-spec-sync
enforcer: hook:guard-deploy-gate

Tags: PARTIAL, beforePARTIAL

### spec:site.trace
`req~spec_site.trace~1`

> T24

Comment:
spec: site
source: specs/coverage.md
enforcer: repo:.trunk/trunk.yaml#trace-on-push
enforcer: owner:mkb-agentops/scripts/trace.mjs

Tags: HARD, beforeHARD

Needs: impl
