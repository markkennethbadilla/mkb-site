# SPEC - markkennethbadilla.com

## What this is

Mark Kenneth Badilla's personal site. It is a portfolio, and its centrepiece is a
live demonstration of the thing he claims to do: constrain an LLM agent with
deterministic gates so it physically cannot ship a dangerous change.

## Features

- **Resume surface** - hero, about, work history, education, skills, projects,
  contact. All content lives in one file, `src/data/resume.tsx`.
  Rebuilt 2026-10-24 (Mark, "maximalist design but concise enough for recruiters
  to read quick"). The hero gives role, name, stack, three checkable figures, an
  Email me button and the resume link above the fold. Every section below is an
  editorial block under a numbered coloured rule (`SectionHead` in
  `src/app/(site)/page.tsx`), with no bordered cards. About is three numbered
  statements, Work is a timeline on one coloured spine with six picked WeAssist
  claims, Education carries the certifications, Contact is one big email button.
  Colour ink uses CSS `light-dark()` so small coloured type passes AA in both themes.
  The page is server components only. The floating bottom dock, the canvas
  FlickeringGrid, BlurFade and the Radix tooltips/accordion/avatar were deleted
  (the dock covered content on phones; together they held mobile speed at 66 to 71).
  The header is a sticky bar in normal flow (`src/components/navbar.tsx`). The guide
  renders as plain markup and imports the real console on first pointer, touch or
  focus (`src/components/demo/guide-lazy.tsx`, next/dynamic). Local mobile Lighthouse
  after the rebuild, 92 to 94 speed.
  Stack leads with eight core skills, large, each with its one-line "what it is"
  printed (no hover-only text), and the rest under one native `<details>` as comma
  lists per group (`CORE` in `skill-groups.tsx`). The public-agent-provisioning block
  matches the rooms, in green with its own drawing (`agent-guards` in
  `room-specimen.tsx`, a guard stopping a tool call). A one-line footer
  (`src/components/footer.tsx`) closes every site page.
  The logo is the MKB ligature (Mark 2026-10-25, "more simple but creatively
  done"), one SVG in `src/lib/logo.ts`: the letters share stems (the M's last stroke
  is the K's stem, the K's arms meet the B's stem), white on the site green, on a
  squircle from the pinned `figma-squircle`. The favicon uses thicker strokes.
  `src/app/icon.tsx` and `src/app/apple-icon.tsx` render it at build through next/og
  ImageResponse (apple-icon full bleed on a solid square), and the header logo
  inlines the same SVG. The export writes the icons as `/icon` and
  `/apple-icon` with no extension, so `public/_headers` sets their Content-Type to
  image/png (the site sends nosniff). The Magic UI
  FlickeringGrid is back behind the top of each page (Mark asked for it), loaded by
  `src/components/grid-backdrop.tsx` only on first interaction or after 6 s, never for
  reduced motion.
- **The site guide** (`/#guide`) - a small card under the hero. Ask it something
  in free text and it decides which section of the page answers you, then leaves
  its slot: the page eases to that section, everything else dims, and a small
  animated entity perches beside the lit section with a written line about what
  you are looking at. "Ask something else" flies it home and it parks again. Off
  the topic of Mark or this page, it declines and stays put.
- **Projects** (`/#projects`) - the three exhibition rooms plus the published
  repositories, each linking to its source. There is deliberately no standalone
  `/demos` index: it rendered the same gallery as this section, so a visitor who
  followed it landed on a page identical to the one they left. This replaced the gate-harness demo on 2026-08-05. The harness code
  (`src/lib/gates.ts`, `src/components/demo/harness.tsx`, `/api/agent`) is still
  in the repo and still works; it is simply not on the page.
  The three rooms are editorial blocks, not bordered cards (Mark 2026-10-24, the
  cards read as AI generated). Each block opens with a small server-rendered SVG of
  what the room does (`src/components/demos/room-specimen.tsx`: twelve payments into
  one balance, stated versus checked confidence per question, three nodes with one
  lease) in the room's hue, then the name large, the capability as the hook, the
  promise, quiet metadata and one round arrow as the call to action. Ledger is wide
  with "Start here" in its own colour. Motion is Tailwind `motion-safe:animate-pulse`,
  so reduced motion gets a still and the homepage ships no extra JavaScript.
- **The exhibition rooms** (`/demos/<slug>`) - three demos that run for real
  against D1 when a visitor presses the button, one per strand of the work:
  *Ledger Under Fire* (concurrency and money), *ScoreAudit* (a model's stated
  confidence against a deterministic verifier), *Split-Brain Sandbox* (leader
  election, lease expiry and fencing tokens). Since 2026-10-24 each room's header
  carries the same RoomSpecimen drawing as its homepage block (beside the title on
  wide screens, above it on a phone) and a larger title. Each room re-lights the entire
  interface with its own hue, carries the same wall label in the same position,
  and refuses to run on arrival.
- **Live telemetry** - per attempt: latency, input/output/total tokens, cost,
  position in the fallback chain, finish reason, and whether the output schema
  was enforced. The provider chain in use is shown before anything is run. Every
  room carries the same idea as one monospace strip: requests spent, wall clock,
  and whether the numbers came from D1, a model, a cache or a fixed example.

## Routes

| Route | Type | Purpose |
|---|---|---|
| `/` | static | The resume surface and the guide. Single page. |
| `/resume/` | static | One Letter page, general (any role), rendered at build from `resume/resume.json` (JSON Resume schema) by the pinned `jsonresume-theme-stackoverflow@3.3.0`, headshot from `basics.image` = `/me.png`. PDF at `/resume/mark-kenneth-badilla-resume.pdf`. Outside the site chrome. |
| `/demos/ledger-under-fire` | static | Room 1. |
| `/demos/score-audit` | static | Room 2. |
| `/demos/split-brain` | static | Room 3. |
| `/api/agent` | Worker | POST. Runs one agent attempt. Not reachable from the page. |
| `/api/models` | Worker | GET. Reports the discovered free-model chain, limiter status and budget spend. |
| `/api/guide` | Worker | POST. One guide question: runs the tool-calling loop, returns a section or a decline. |
| `/api/demos/<slug>/<action>` | Worker | POST/GET. Every room endpoint, behind one router that owns the budget. |

## Locked decisions

1. **Forked `magicuidesign/portfolio` (MIT), not hand-built.** A hand-rolled
   portfolio looks hand-rolled; the previous iteration of this site proved it.
2. **Rejected `once-ui-system/magic-portfolio` despite it looking better.** It is
   CC BY-NC 4.0 - non-commercial with mandatory attribution, which is the wrong
   licence for a professional site, and the attribution clause forces a credit link.
3. **Static export, not the OpenNext Workers adapter.** OpenNext cannot build from
   a non-`C:` drive on Windows (Node's ESM loader rejects an `a:` URL scheme), and
   every route here prerenders anyway. A Worker handles only `/api/*`.
4. **Free models are discovered at runtime, never hardcoded** - still true of the
   gate harness (`/api/agent`), because OpenRouter's free tier churns and a pinned
   slug guarantees a dead demo within weeks. **The guide no longer discovers.** A
   key Mark owns has a stable published model list, so discovery would be a
   network round trip to learn something already known. Its chain is pinned to
   exact versioned ids, never a floating alias, which would repoint both the model
   and the price under a running site.
4b. **The guide's fallback is an upgrade, deliberately.** `deepseek-v4-flash`
   first, `deepseek-v4-pro` only when flash returns no usable tool call. This
   inverts the usual rule that a fallback must be cheaper, because that rule exists
   to stop a costly path running unwatched - and here the escalation is a single
   retry, capped by the daily ceiling, made rare by the cache, and backstopped by
   the key's own limit. The alternative, pro first, costs every visitor six seconds
   to avoid a retry that happens once in six questions.
5. **Filter free models on modality exclusively, not inclusively.** Google's Lyria
   advertises `output_modalities: ["text","audio"]`, so `includes("text")` accepts
   a music model. A usable chat model emits text and nothing else.
6. **`generateText` + explicit Zod parse, not `generateObject`.** Every model in
   the cascade failed provider-side structured output, including a paid one. The
   Zod contract still rejects non-conforming output; it is simply enforced by us.
   A schema no model can satisfy is not a guardrail, it is an outage.
7. **Gates run client-side and are readable.** `src/lib/gates.ts` ships to the
   browser on purpose - a visitor can read exactly what blocked them.
8. **Degradation is announced, never faked.** With no key, past the rate limit, or
   with every model down, the panel says so and shows a labelled fixed example.
9. **The guide answers from a closed corpus, and the answer is checked.** The
   first version gave it an `answer` tool with no facts behind it, and
   `scripts/probe-guide.mjs` caught every free model inventing biography: a
   university Mark never attended, an employer he never worked for. The lesson was
   not "never let it speak" - it was that **a model with no material will always
   produce material**. So it now has real material
   (`src/lib/public-facts.ts`, a closed public-facing set) and its output is
   checked before anyone sees it: every proper noun, year and figure in an answer
   must be licensed by that corpus, or the answer is discarded and the written
   section line is used instead. The prompt asks for accuracy; `checkGrounding` is
   what makes accuracy the only thing that gets through. With facts in place the
   check stopped firing entirely - it is the backstop, not the fix.
9b. **The fact corpus excludes age and date of birth.** Not a safety judgement: an
   age invites a judgement about the work that has nothing to do with the work,
   and in most markets an employer cannot ask for it at all. Also excluded: phone, address, health,
   family, finances, employer system names, and the Hatchit ERP metrics, which
   have no artifact behind them unlike everything else he claims. See decision 27
   for what was settled about describing the work itself.
9c. **The cache is lexical, and says so.** Repeated questions are served from KV on
   token-overlap similarity with a domain synonym map, not embeddings - no free
   embedding model is available on this account. Calling it semantic would be the
   overclaim this site exists to argue against. Only grounded or declined runs are
   cached, so an outage cannot be pinned in place for a week and a single bad
   answer cannot become permanent.
10. **Section ids are an allowlist, checked at build.** The model picks from a Zod
    enum built from `SECTION_IDS`, and `scripts/check-guide.mjs` fails the build if
    any of those ids does not render in `page.tsx`. A destination that does not
    exist is otherwise invisible until a visitor asks that exact question.
11. **The entity is hand-authored SVG, not a marketplace asset.** It has to morph
    into an ordinary card when it parks, re-tint with `--tint-hue`, and carry no
    attribution credit on a site whose purpose is winning work. A Rive character
    fails all three and costs a wasm runtime. Motion is `motion`'s shared-layout
    transition; travel is Lenis with `smoothWheel` off, so normal page scrolling
    is untouched.
12. **`prefers-reduced-motion` skips the journey, never the destination.** Gate the
    animation, never the element tree - branching the tree on `useReducedMotion`
    makes server and client markup disagree and React discards the subtree.
13. **The guide shows its own workings, with no toggle.** One line of small
    monospace under every answer: model or cache, latency, whether the text passed
    the grounding check, and which tools ran. A "show the work" button would hide
    the evidence behind an interaction most visitors never perform, on a page whose
    argument is that a demo should be inspectable. A recruiter skips the line
    without effort; an engineer does not have to go looking for proof.
14. **Copy never asserts behaviour the guide does not always perform.** The waiting
    line used to read "Working out where that lives", which is false for every
    question answered in place. Phase-accurate copy costs nothing and a visitor
    catches the discrepancy immediately.
15. **Anything positioned against the entity is MEASURED, not computed.** It moves
    under a shared layout animation, so motion renders it with a transform and its
    real centre is not the value passed to `left`. Bubble and minimised pill are
    positioned with Floating UI (`@floating-ui/react-dom`, `autoUpdate` per
    animation frame), never hand math. The answer bubble is anchored to the
    highlighted SECTION, `top-end`, outside the spotlight, for every answer; it
    flips below only when there is no room above, and shifts on both axes so it
    is always fully in the viewport (overlapping the section only when neither
    side fits). It used to hang below the entity, ran off-screen on Contact and
    covered the section. The pill stays anchored to the entity.

16. **Demo slugs are permanent.** These URLs go into job applications and will
    outlive several redesigns of this site. A retired room keeps its route and
    renders a closure page linking its source; it is never renamed, shortened or
    404'd.
17. **A room re-lights the whole interface through `--tint-hue`, applied to
    `<body>`.** Two non-obvious things made this work. Custom properties are
    substituted where the *using* declaration lives, so `--background: oklch(...
    var(--tint-hue))` written on `:root` is computed against `:root`'s hue and
    overriding the hue on a descendant changes nothing - the palette block has to
    be repeated for `[data-tint]`. And an unregistered custom property is a string
    to the animation system, so `--tint-hue` is declared with `@property` as a
    `<number>` to make it interpolable. The scope is `<body>` rather than a
    wrapper because Radix portals to `document.body`, and a wrapper would leave
    every tooltip and popover rendering in the site's green inside a brass room.
18. **Three explicit route folders, not a `[slug]` dynamic route.** Not for bundle
    reasons - per-slug dynamic import solves that. The rooms are meant to diverge
    completely, and a single page component switching on three slugs fights that
    every time one of them changes.
19. **The site's chrome lives in a `(site)` route group, not in the root layout.**
    Rooms need a wider stage and no dock. Hiding the dock with `usePathname`
    instead would ship it in the prerendered HTML and remove it on hydration -
    a visible jump on the page a recruiter opens from an email, and the same class
    of hydration branching as decision 12.
20. **One reserve per RUN, at creation, IP-keyed - never per request.** A run is a
    fan-out of a dozen or more concurrent requests from one click. Charging each
    would mean a dozen limiter hits and two dozen counter writes per visitor
    action, with the shards racing each other through the counter. So
    `worker/demos/router.ts` reserves the room's whole declared `requestsPerRun`
    once, and the shards that follow reserve nothing and are bounded by
    `limitRun()` keyed on the run id. **The creation limiter is IP-keyed**: an
    earlier version keyed it on the run id, which is minted fresh per run, so a
    caller looping over run creation was never limited at all.
21. **Every room states what it does NOT prove, in fixed position, never
    collapsed.** The registry type requires all three wall-label strings and
    `scripts/check-demos.mjs` fails the build on an empty one, on a `real` string
    that does not name the layer the behaviour happens at, and on a room with an
    `injectionPoint` whose `staged` string does not disclose it. Two of these
    rooms are rigged; a gate that only checks for non-empty strings guards against
    forgetting, not against overclaiming.
22. **A promise may count its inputs and never its outcomes.** "Fire twelve
    payments" is an input. "See the two that got refused" is a result printed
    before the run that produces it, which is either false or an admission that
    the run is scripted. Enforced on the registry by the gate.
23. **The demo gallery has no live/resting badge.** Knowing whether the budget is
    spent would cost a Worker request from every visitor who scrolls past the
    projects section, against the same daily allowance the badge reports on, and
    it still could not see the per-visitor cap that actually refuses people. A
    card labelled "live" that then refuses is worse than no label. The room
    explains the refusal on arrival in the budget's own words.
24. **`sql-guard.ts` guards model-authored SQL only, which is ScoreAudit and
    nothing else.** Ledger and Split-Brain write their own parameterised
    statements; the guard would refuse those on two independent rules (they are
    not SELECTs, and they touch denied tables), so running it there would be
    ceremony dressed as enforcement. ScoreAudit is the case it was written for and
    its first real consumer: the model gets a `query_db` tool and writes whatever
    SQL it likes, which is why the room can ask a fair question - it fails on a
    join or a date boundary, not on the absence of a way to check. The reason no
    model can write to this database is that the guard admits one statement,
    SELECT-shaped, and D1 enforces the rest.
25. **The site guide does not route into rooms.** Its allowlist stays sections of
    `/`, which keeps its contract clean ("it takes you to part of *this page*")
    and keeps `check-guide.mjs`'s id assertion meaningful.
26. **Figures in the fact corpus are bound to the fact that licensed them.** The
    grounding check tested every token against one flat union of terms, which is
    sound while the corpus holds almost no numbers and unsound the moment it
    describes work, because work is measured. Pooling `66`, `55`, `300` and `18`
    licenses them everywhere, and "he ran 66 live failover drills" then passes
    with the run line printing "checked against the fact list" underneath it -
    turning a broken guard into a published assurance. Each figure now carries the
    companion words that must sit within ten words of it, chosen from what the
    figure MEASURES rather than from other words in the sentence.
27. **His real work may be described, anonymised. The nouns and the counts that
    identify an employer's systems may not.** Settled 2026-08-05 with Mark.
    Capability and architecture yes; internal system names, client names, hosting
    providers, hostnames, spend, churn, headcount, and schema census figures no -
    a table count and a migration count describe a Company database as surely as
    its name does. **Nothing about a security incident at a named employer, in any
    form**: the site says where he works and that he runs production there, so
    "he did production incident response" identifies the breached party by
    construction and the role window dates it. The two things that are actually
    his credential - reconstructing an app from a compiled build, and turning an
    incident into a gate - are stated separately and never adjacent.

28. **The resume is JSON Resume, rendered at build, never hand-built.** `resume/resume.json`
    is the single source. `npm run build` runs `scripts/build-resume.mjs` first: it
    renders the JSON with the pinned `jsonresume-theme-stackoverflow` (same theme as the
    Driftwood pipeline, skill run-project-driftwood) into `public/resume/index.html` and
    prints that page with Playwright to `public/resume/mark-kenneth-badilla-resume.pdf`
    (Letter, scale 0.95, real text so an ATS can read it). Both are gitignored build
    products. Content is general, for any role, and every claim must pass the Driftwood
    skill's "What the notes may claim" and the tracker's Retired claims. Exactly one page:
    check `pypdf` page count and look at a raster before deploy; cut content, never shrink
    type. The old hand-built React sheet (`src/components/resume/*`, `src/app/resume/*`,
    `resumeSummary`) was deleted 2026-10-24. The build applies three string fixes to the
    theme's fixed `<head>`, each throwing if the theme changes: drop `user-scalable=no`
    (a11y), load Font Awesome non-blocking (mobile speed), drop the theme's 404
    `./override.css` link. The theme has no option for these and a rehype pipeline for
    three attributes is more to maintain. Work entries carry no `url` (the theme renders
    them as un-underlined in-text links, a11y fail). The web page alone gets a
    "Download PDF" profile entry. Measured 2026-10-24 locally, `/resume/` mobile 95
    speed, 100 accessibility. The headshot on the page is `public/me-320.webp` (5 KB,
    also the homepage avatar), made with `npx -y sharp-cli@6.1.0 -i public/me.png -o
    public/me-320.webp resize 320 320`. The favicon is the MKB monogram (see Features).
29. **The demo source is public, and a gate proves a stranger can open it.**
    Published 2026-08-05 with Mark. Until then the repository was private while
    every room footer linked files inside it and the section above them was
    headed "Things I built to be inspected" - so every one of those links 404'd
    for everyone but him. `check-demos.mjs` asserted only that the paths existed
    in the working tree, which is true of a private repo too; `probe-demos.mjs`
    now fetches each source URL and requires a 200.
30. **There is no `/demos` index.** It rendered the same gallery component as
    `/#projects`, so a visitor who followed it arrived at a page identical to the
    one they left. Removed 2026-08-05 (Mark). Room back-links go to `/#projects`.

31. **The positioning title is "Full Stack AI Engineer". The WeAssist role title
    stays "AI Engineer".** Changed 2026-08-08 at Mark's instruction: plain "AI
    Engineer" was undermining his experience by hiding the half of the work that is
    interfaces, services and schemas. Every place the site speaks in its own voice now
    says Full Stack AI Engineer - the hero line, the `basics.label` in
    `resume/resume.json`, and the guide's identity fact.
    **The Experience entry for WeAssist was deliberately NOT changed**, because that
    field reports the title his employer gave him and inflating it there would be a
    false claim about his employment rather than a positioning choice. The two can
    differ honestly, and a reader who notices the difference is reading it correctly.
    The fact corpus needed the same edit or the guide would have broken: `checkGrounding`
    licenses only terms the corpus carries, so "Full" and "Stack" had to be added to the
    identity fact's `terms` or every answer using the new title would have been
    discarded as ungrounded and silently replaced by the written section line.

## Non-goals

- **No Q&A chatbot.** Narrowed twice. 2026-08-05, with Mark: free-text input is
  fine, what was rejected is a bot that *answers from general knowledge*. Narrowed
  again the same day, at his explicit instruction ("i want it to chat for stuff
  not found in my site with guardrails obviously"): it now holds a closed fact
  corpus and a tool that states one of those facts. What still holds is that it
  cannot become a conversation partner by drift, because the corpus is closed, the
  output is grounded against it, and anything outside it is declined rather than
  guessed. A chat box that replies from a model's own knowledge would be generic
  and would demonstrate nothing.
- **No self-scored capability charts.** Arbitrary self-assessment destroys
  credibility with the exact audience this site targets.
- **No "available for hire" banner.** The site reads as a senior engineer's work,
  not as an appeal.
- **No blog until there is real writing.** An empty blog reads worse than none.
- **No paid infrastructure**, with one named exception. Hosting stays entirely on
  the Cloudflare free tier. **Inference does not**: the guide runs on Mark's own
  DeepSeek key, changed 2026-08-05. Free models answered in 6 to 9 seconds, which
  is long enough that a visitor assumes the page is broken, and a demo nobody
  waits for demonstrates nothing. Measured on the real task
  (`scripts/bench-guide.mjs`): `deepseek-v4-flash` 2279 ms mean against
  `deepseek-v4-pro` 6259 ms and free models at 6-9 s. Spend is bounded on four
  sides - a 300/day model-call ceiling, the similarity cache so a repeated
  question never reaches a model, the per-IP and per-pool request budgets, and the
  key's own spending cap.

## Guardrails on the demo

- Burst rate limiting via the Cloudflare native rate-limit binding, at the edge.
- A global daily request ceiling in KV, independent of the burst limiter.
- Input validated by Zod with a hard length cap before any model is called.
- Output validated by Zod; non-conforming responses advance the cascade.

## Records first (rule 43)

Every POST to `/api/*` (the guide, the agent, the demo rooms) is written whole to
the D1 table `inbound_requests` (`mkb-site-demo`, migration 0008: time, path, IP,
country, user agent, raw body) before any handler runs. A question that is
malformed, over budget, cached or answered with no key is still a row. No header
that can carry a secret is stored, and nothing deletes from the table. The
self-check is `worker/records-first.test.ts` (vitest in workerd against real local
D1), run by the pre-push gate and before every deploy (Checks below): a malformed guide question and a
refused agent call both land whole, and the record sits above the first route in
the fetch handler.

## Deploy

`npm run deploy` runs `scripts/gate.mjs --deploy` (records-first test, build,
Lighthouse mobile and desktop; Checks below), applies any pending D1 migrations to `mkb-site-demo` and
`mkb-site-warehouse` (remote), then deploys the Worker. A failing check stops the
deploy before anything reaches Cloudflare. The host is a Cloudflare Worker
(`mkb-site`, static `out/` through the ASSETS binding) with no Workers Builds git
connection, so Cloudflare runs no build of its own; this script is the deploy
path and the host-side check. Migrations go first so the
code never runs against a schema it does not expect: on 2026-08-22 the Worker
shipped reading `split_brain_events.id` while migration 0007 sat unapplied, and
the Split-Brain Sandbox returned 500 on every run until 2026-10-12.

## Lighthouse gate

Lighthouse CI (`@lhci/cli@0.15.1`) runs on `/` and `/resume/`, mobile and
desktop, median of 3, as the first step of every deploy (Checks below), on the Playwright Chromium (never
installed Chrome, whose web-app policy installs apps into each temp profile).

## Checks

No GitHub Actions since 2026-10-23 (the Actions budget ran out; Mark's order to
move every check to a local Trunk pre-push gate plus the host's build).

- `git push` runs Trunk's pre-push hook (`.trunk/trunk.yaml`): a gitleaks scan
  of the whole tree, then `bun run gate` (`scripts/gate.mjs`): records-first
  test and `bun run build`. The first failure stops the push.
- `npm run deploy` runs `scripts/gate.mjs --deploy` first: the same checks plus
  Lighthouse mobile and desktop, which are report only. On 2026-10-23 this
  laptop scored `/` at 0.59 to 0.62 mobile on main and 0.69 on the live
  build, against the 0.80 floor set on GitHub's runner (baseline 0.82), so a
  miss on the laptop says more about the laptop than the page. Scores print in
  the deploy output; a failing records-first test or build still stops it. `git commit` runs the gitleaks scan on staged files.
- Trunk's stock hook actions only warn without a terminal, so both are custom
  actions running `trunk check --ci` (skill `gate-commits-with-trunk`). Install
  them once per clone: `trunk git-hooks sync`.
- A push touching only Markdown, `specs/` or `docs/` skips the gate script.
  `npm run deploy` always runs it.
- Limits: `git push --no-verify` skips the push gate, but not the deploy gate.
  The pre-push hook skips itself on headless Linux and macOS (Trunk 1.25.0).
- Time budget (cold, this laptop, 2026-10-23): see the commit that added it;
  it only goes down.
Floors: accessibility, best practices and SEO at least 95; performance at least
80 mobile and 95 desktop (baseline 2026-10-02: 82/97 mobile, 99/100 desktop).
Raise a floor when a score rises; never lower it (agentops rule 73).

## Security scan

The Trunk pre-push gate runs Opengrep with the pinned JavaScript and
TypeScript security rules (mkb-winops spec 060). It scans only files changed
since origin/main and blocks a push on a new ERROR or WARNING finding. Fix the
finding, or when it is a false positive put `// nosemgrep: <rule-id>` on the
line above it, using the short rule id the scan prints. There is no global
skip.
