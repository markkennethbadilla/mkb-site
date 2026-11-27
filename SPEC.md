# SPEC - markkennethbadilla.com

## What it does

Mark Kenneth Badilla's personal site. It is a portfolio, and its centrepiece is a
live demonstration of the thing he claims to do: constrain an LLM agent with
deterministic gates so it physically cannot ship a dangerous change.

### Features

- **Resume surface** - hero, guide, about, work, education, skills, projects,
  contact, in that order on `/`. All content lives in one file,
  `src/data/resume.tsx`. The look follows once-ui magic-portfolio (see "Look").
  The hero is centered under a cyan wash: a badge pill that jumps to the guide,
  the name as the h1 (the LCP element), the role and tagline in grey, Email me
  and the resume as pill buttons, an avatar chip that jumps to About, and three
  checkable figures in a hairline row. Then the guide card, then the about split:
  a round portrait, place and quick links in a side column that stays in view,
  beside the intro (three numbered points), Work Experience (company, dates on
  the right, title in the accent colour, bullets for the current role), Studies
  with the certifications, and Technical skills. Projects is the three rooms and
  the repository as large cards, Contact is a gradient box with one button.
  The page is server components except the guide, which loads on first intent
  (`src/components/demo/guide-lazy.tsx`), and the clock in the top bar.
  The chrome is a top bar (`src/components/navbar.tsx`): "Cebu City" on the left, a
  centered floating pill with Home, About, Work, Projects, Resume and the theme
  toggle, and the live Manila time on the right; plus a one-line footer. There is no
  site logo. The favicon is the plain letters MKB in Geist 700,
  the site face, with no background: `src/app/icon.svg`, real font outlines
  written by `bun run favicon` (`scripts/gen-favicon.mjs`, pinned `fontkit`
  reading the pinned `@fontsource/geist-sans` 700 file), filled
  near black and swapped to the cyan accent under
  `prefers-color-scheme: dark` so it reads on light and dark tab strips. Run
  the script again when the font pin changes. The Apple touch icon
  (`src/app/apple-icon.tsx`, next/og at build, same font file) is the same
  letters in pale cyan on near black, because iOS fills a transparent icon
  with black; it is written as `/apple-icon` with no extension, so
  `public/_headers` sets its Content-Type. The share card is `src/app/og-lightbox.png/route.tsx`, a
  1200x630 PNG made at build with next/og in the hero look (cyan wash, role pill, name, address),
  set in Geist from the pinned `@fontsource/geist-sans` files, used for both Open Graph and X.
  `/resume/` links `/icon.svg` as its favicon (`scripts/build-resume.mjs`).
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
  (`src/lib/gates.ts`, `src/components/demo/agent-console.tsx`, `/api/agent`) is still
  in the repo and still works; it is simply not on the page.
  Each room is a framed shadowbox that opens with a small server-rendered SVG of
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

### Routes

| Route | Type | Purpose |
|---|---|---|
| `/` | static | The resume surface and the guide. Single page. |
| `/resume/` | static | One Letter page, general (any role), rendered at build from `resume/resume.json` (JSON Resume schema) by the pinned `jsonresume-theme-stackoverflow@3.3.0`, headshot from `basics.image` = `/me.png`. PDF at `/resume/mark-kenneth-badilla-resume.pdf`. Outside the site chrome. |
| `/demos/ledger-under-fire` | static | Room 1. |
| `/demos/score-audit` | static | Room 2. |
| `/demos/split-brain` | static | Room 3. |
| `/api/health` | Worker | GET. The deployed commit and a D1 probe: `{"ok":true,"commit":"<sha>"}`, 503 when D1 fails. |
| `/api/agent` | Worker | POST. Runs one agent attempt. Not reachable from the page. |
| `/api/models` | Worker | GET. Reports the discovered free-model chain, limiter status and budget spend. |
| `/api/guide` | Worker | POST. One guide question: runs the tool-calling loop, returns a section or a decline. |
| `/api/demos/<slug>/<action>` | Worker | POST/GET. Every room endpoint, behind one router that owns the budget. |

### Look

Rebuilt in our own code from the once-ui `magic-portfolio` demo (studied, never copied): a quiet neutral page, one cyan wash at the top, a floating pill nav, tight bold type, hairline cards.

Sources (rule 62, library.md "Masterpiece galleries").

- Template: * <- once-ui magic-portfolio https://github.com/once-ui-system/magic-portfolio
- Reference: * <- awesome-developer-portfolios and the Once UI showcase https://magic-portfolio-demo.vercel.app
  - Taken: the top bar (place on the left, a centered pill of icon links and the theme toggle, a live clock on the right), the centered hero (badge pill, huge tight headline, grey lead, avatar chip), the about split (round avatar and place on the left, name, role, social pills, intro, then Work Experience with company, dates on the right and the title in the accent colour, Studies, Technical skills), large project cards, the gradient call-to-action box and the one-line footer.
  - The two-column about split starts at 64rem wide (1024 px) with the side column at a fixed 14rem; below that it stacks. Media queries ignore the root font size, so `e2e/text-scale.spec.ts` (200% text at 1280 px) guards that the right column never overflows.

| Token | Value |
|---|---|
| Palette | neutral greys with a trace of hue 215 (`--tint-hue`), accent cyan at hue 215 (`--ink`, `--glow`, `--ring`); rooms still re-tint through `--tint-hue` |
| Surfaces | page near white or near black, cards white or one step up, 1px `--border` hairlines |
| Radius | cards 1rem, pills and buttons full |
| Shadow | soft and short (`--shadow-cut`), one deeper lift on hover and on the nav pill (`--shadow-lift`) |
| Type | Geist for everything (headings 700, tracking -0.035em), Geist Mono for telemetry |
| Icons | lucide, stroke 2 |
| Motion | hovers only: a card rises 2px and its border takes the accent, 200 ms ease out; the theme icon spins in on change (reduced motion: none) |
| Feedback | everything clickable shows the pointer cursor (`globals.css` base layer, since Tailwind v4 dropped it on buttons); the theme toggle cycles follow system, light, dark with a Monitor, Sun or Moon icon for the current choice and says both current and next in its name |

Components (`src/app/theme.css`): `.sheet` hairline card, `.sheet-lift` hover rise, `.slot` input well, `.tab` pill chip, `.btn-cut` solid pill button and `.btn-paper` outline pill, `.cut-title` heading, `.ink-link` underline link, `.frame` round avatar, `.glow-wash` the top wash.

Pages.

- `/`, the centered hero with three proof figures, the guide, the about split (About, Work Experience, Studies and certifications, Technical skills), Projects, then the gradient contact box.
- Not found (`src/app/not-found.tsx`), the way home and the three rooms.
- `/demos/<slug>`, the same sheets, slots and type in the room's hue, the
  specimen drawing in a cut frame, the rail a floating sheet.
- `/resume/`, the pinned JSON Resume theme, outside the theme on purpose.

## Why it exists

A portfolio whose argument is its own engineering: every claim on the page links to code or a live run. The decisions below are why it is built the way it is.

### Locked decisions

1. **Forked `magicuidesign/portfolio` (MIT), not hand-built.** A hand-rolled
   portfolio looks hand-rolled; the previous iteration of this site proved it.
2. **The look follows once-ui `magic-portfolio`, rebuilt in our own code.** It was
   the best-looking free portfolio. Nothing is copied from it, so its licence never
   decides anything: a template or reference is studied, then built here.
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
4b. **A decision model answers first; the LLM only when the page has no answer.**
   `worker/decide.ts` asks Clef-flash (`@cf/cloudflare/clef-flash`, a System One
   decision model on Workers AI, binding `AI`) three typed questions in one call:
   which fact answers, which section shows it, and whether the question is about
   Mark at all. A matched fact is answered with its own text (grounded by
   construction) and its section; an off-topic question is declined; only an
   about-Mark question with no matching fact reaches the LLM. Clef-flash ran 8 of 8
   bench questions right at about 380 ms (`scripts/bench-decide.mjs`), against Jev
   on OpenRouter at about 850 ms; it costs $0.038 per M input tokens, output free.
   The LLM fallback is `openai/gpt-oss-120b:nitro` then `openai/gpt-oss-20b:nitro`
   on OpenRouter (`src/lib/guide-models.ts` holds the bench table): fastest first,
   cheapest second. DeepSeek measured 2.2 s there and was dropped from the guide.
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
    enum built from `SECTION_IDS`, and `tests/guide.test.mjs` (`bun run test`, in the gate) fails the push if
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
    real centre is not the value passed to `left`. The entity and the answer are
    positioned with Floating UI (`@floating-ui/react-dom`, `autoUpdate` per
    animation frame), never hand math. There is no speech bubble: a second floating
    box read as a separate conversation. The answer and "Ask something else" sit in
    a caption joined to the spotlight ring (same colour, square on the joined edge),
    above the section, below it when the top is off screen. The entity perches on the
    caption's outer corner (`top-end` of the caption, flipping below or to a side),
    paints above it and shifts on both axes, so it stays in the viewport, never hides
    the answer, and moves back in when the section scrolls part way out.

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
    Rooms need a wider stage and their own rail. Hiding the site chrome with `usePathname`
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
    `tests/demos.test.mjs` (`bun run test`, in the gate) fails the push on an empty one, on a `real` string
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
    and keeps `tests/guide.test.mjs`'s id assertion meaningful.
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
    products. The temporary `print.html` goes through
    `mkb-agentops/scripts/recycle.mjs` (Recycle Bin, rule 94), never a raw delete.
    Content is general, for any role, and every claim must pass the Driftwood
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
    public/me-320.webp resize 320 320`. The favicon is the plain MKB letters (see Features).
29. **The demo source is public, and a gate proves a stranger can open it.**
    Published 2026-08-05 with Mark. Until then the repository was private while
    every room footer linked files inside it and the section above them was
    headed "Things I built to be inspected" - so every one of those links 404'd
    for everyone but him. `tests/demos.test.mjs` asserted only that the paths existed
    in the working tree, which is true of a private repo too; `tests/probe-demos.mjs`
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

### Non-goals

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
  the Cloudflare free tier. **Inference does not**: the guide's LLM fallback runs on
  Mark's OpenRouter key (1 USD a month), changed 2026-11-27 from DeepSeek. Free models answered in 6 to 9 seconds, which
  is long enough that a visitor assumes the page is broken, and a demo nobody
  waits for demonstrates nothing. Measured on the real task
  (`scripts/bench-guide.mjs`): `deepseek-v4-flash` 2279 ms mean against
  `deepseek-v4-pro` 6259 ms and free models at 6-9 s. Spend is bounded on four
  sides - a 300/day model-call ceiling, the similarity cache so a repeated
  question never reaches a model, the per-IP and per-pool request budgets, and the
  key's own spending cap.

## How it works

### Guardrails on the demo

- Burst rate limiting via the Cloudflare native rate-limit binding, at the edge.
- A global daily request ceiling in KV, independent of the burst limiter.
- Input validated by Zod with a hard length cap before any model is called.
- Output validated by Zod; non-conforming responses advance the cascade.

### Budget cap on paid calls (rule 97)

Every paid model call (the guide's LLM fallback and the agent harness on OpenRouter
`openrouter/personal-api-key`, ScoreAudit on DeepSeek `deepseek/active-personal-api-key`,
the guide's decision model on Workers AI within the free daily allocation, and the two
scripts `probe-guide.mjs` and `bench-guide.mjs`) goes through `src/lib/spend-cap.ts`:

- `maxOutputTokens` is always 600 per step.
- The worst-case cost of the run is estimated from list prices before the call and
  refused past 0.10 USD per run.
- The OpenRouter key's own usage is read first; calls stop at its credit limit and
  one alert goes out past 80 percent.
- A refusal, a provider 402 or a limit error logs FAIL with the real error and
  POSTs `{source:"budget-cap",...}` to `https://leads.weassist.uk/notify/ops-alert`
  when a `NOTIFY_TOKEN` is set. This is a personal project, so the work token is
  not copied here (rule 64); without it the FAIL log line is the record.

Provider-side limit (set 2026-11-07 in the OpenRouter UI, key "portfolio",
`sk-or-v1-d71...252`, vault slug `openrouter/personal-api-key`): **1 USD credit
limit, monthly reset** (1st of the month, UTC). The key stops working at 1 USD in a
month; spend-cap.ts reads it and stops at the limit, alerting at 0.80 USD. It reads
`GET https://openrouter.ai/api/v1/key` (fields `limit`, `limit_reset`,
`limit_remaining`, `usage_monthly`) and writes nothing to OpenRouter. Check:
`curl -s https://openrouter.ai/api/v1/key -H "Authorization: Bearer $KEY"` shows
`"limit":1,"limit_reset":"monthly"`. Change it at openrouter.ai, Workspace, API
keys, portfolio (the personal vault has no management key).

### Records first (rule 43)

Every POST to `/api/*` (the guide, the agent, the demo rooms) is written whole to
the D1 table `inbound_requests` (`mkb-site-demo`, migration 0008: time, path, IP,
country, user agent, raw body) before any handler runs. A question that is
malformed, over budget, cached or answered with no key is still a row. No header
that can carry a secret is stored, and nothing deletes from the table. The
self-check is `worker/records-first.test.ts` (vitest in workerd against real local
D1), run by the pre-push gate and before every deploy (Checks below): a malformed guide question and a
refused agent call both land whole, and the record sits above the first route in
the fetch handler.

### Bot and rate limits

- Turnstile (widget `mkb-site guide and demos`, invisible, vault `cloudflare/iammkb2002-turnstile-mkb-site`): the browser asks for one token per guide question and per demo run creation (`src/lib/bot-check.ts`, header `cf-turnstile-response`); `src/components/demo/guide-lazy.tsx` imports it once the page is idle, apart from the heavy console, and one reused widget then fetches a token at once and the next one right after each use, so a request never waits on the challenge (a prefetched token older than 240 s of its 300 s life is skipped); `worker/bot-check.ts` verifies it with siteverify before the guide or the room runs. No token or a failed check is `403 {reason:"bot-check"}`, still recorded first. A missing `TURNSTILE_SECRET` in production closes both endpoints (503). Local runs use Cloudflare's always-pass test keys: the browser picks the test sitekey on localhost and 127.0.0.1, and `scripts/dev-worker.mjs` and `playwright.config.ts` pass `--var TURNSTILE_SECRET:<test secret>` to the local Worker (the local runner rewrites the request host to the route domain, so the Worker cannot tell local from live by host). The e2e fixture (`e2e/fixtures.ts`) also answers PostHog and Turnstile's script locally, so no test depends on a vendor CDN or reaches the real PostHog project. Proof: `worker/bot-check.test.ts`.
- Rate limits: `BURST_LIMITER` (6 per 60 s per IP, on every budget `reserve()`: guide, agent, demo run creation) and `DEMO_LIMITER` (60 per 60 s per run id, the shards of one run) in `wrangler.jsonc`, plus the daily ceilings in `worker/budget.ts`.

### Analytics and errors

- `src/lib/analytics.ts` starts posthog-js with everything on (agentops rule 91): autocapture, page views and leaves, session replay with every input recorded as typed except passwords (`maskAllInputs: false`, `maskInputOptions: { password: true }`), console and network recording, exceptions, web vitals, heatmaps, scroll depth.
- `src/app/error.tsx` and `global-error.tsx` call `captureException`, after first reloading once when the error is a stale chunk from an older deploy (`src/lib/stale-build.ts`).
- `worker/analytics.ts` sends one `$ai_generation` event per model call (model, tokens, latency, trace id) with `ctx.waitUntil`; proof `worker/analytics.test.ts`.

## What it reads and writes

- **Reads:**
  - Visitors' requests to `markkennethbadilla.com` (static `out/` through the ASSETS binding; `/api/*` through `worker/index.ts`).
  - OpenRouter (guide fallback and agent harness, key usage at `GET /api/v1/key`), DeepSeek (ScoreAudit), Workers AI (guide decision model, dashboard usage).
  - Build time: `resume/resume.json`, `src/data/resume.tsx`, pinned fonts and themes.
- **Writes:**
  - D1 `mkb-site-demo` (`DEMO_DB`): `inbound_requests` (every POST, rule 43), arena tables, budget counters, guide answer cache rows. Swept hourly by the cron in `wrangler.jsonc` (arenas only; `inbound_requests` is never deleted).
  - D1 `mkb-site-warehouse` (`WAREHOUSE_DB`): written only by its migrations; read by ScoreAudit.
  - KV `DEMO_KV`: daily spend ceiling and the lexical answer cache.
  - PostHog US cloud, project 660260 (shared with Inkpot, told apart by `$host`): page events, replay, exceptions, `$ai_generation` per model call.
  - Offsite backups: `%USERPROFILE%/cloud/backups/mkb-site/<date>/` (Filen-synced), last 4 kept.
  - Logs: `A:\logs\mkb-site\<script>.*.log` (standard logger, `scripts/log.mjs`).
- **Secrets** (personal vault, read by `scripts/vault.mjs`, never written to a file):

  | Secret | Vault entry | Where it lives |
  | --- | --- | --- |
  | Cloudflare deploy token (Workers, KV, D1, routes; expires 2027-11-22) | `credentials/cloudflare/iammkb2002-workers-deploy` | `scripts/cf.mjs` env only |
  | DeepSeek key | `credentials/deepseek/active-personal-api-key` | Worker secret `DEEPSEEK_API_KEY` |
  | OpenRouter key "portfolio" (1 USD monthly limit) | `credentials/openrouter/personal-api-key` | Worker secret `OPENROUTER_API_KEY` |
  | Turnstile secret (widget `mkb-site guide and demos`) | `credentials/cloudflare/iammkb2002-turnstile-mkb-site` | Worker secret `TURNSTILE_SECRET` |
| healthchecks.io ping for the hourly sweep | `credentials/healthchecks/iammkb2002@gmail.com-ping-mkb-site-sweep` | Worker secret `HC_SWEEP_PING` |
| PostHog public ingest key | `credentials/posthog/iammkb2002@gmail.com` | client bundle and Worker var (public by design) |

## How to run, check and hand over

### Deploy

`bun run deploy` from the tip of `main` (one deploy at a time, skill coordinate-many-agents):

1. `bun run gate` (Checks below). A failing task stops the deploy before anything reaches Cloudflare.
2. Pending D1 migrations to `mkb-site-demo` and `mkb-site-warehouse` (remote). Migrations go first so the code never runs against a schema it does not expect: on 2026-08-22 the Worker shipped reading `split_brain_events.id` while migration 0007 sat unapplied, and the Split-Brain Sandbox returned 500 on every run until 2026-10-12.
3. `scripts/cf.mjs deploy`, which adds `--var COMMIT:<short sha>` so the live commit can be read back.

- Host: the Cloudflare Worker `mkb-site` (static `out/` through the ASSETS binding) with no Workers Builds git connection, so this script is the deploy path and the host-side check.
- Wrangler runs through `scripts/cf.mjs` with the scoped token in vault `credentials/cloudflare/iammkb2002-workers-deploy`, never the Global API Key.
- Worker secrets (`wrangler secret put` through `scripts/cf.mjs`): `DEEPSEEK_API_KEY`, `OPENROUTER_API_KEY`, `TURNSTILE_SECRET`, `HC_SWEEP_PING`.
- The hourly cron (`scheduled()`) sweeps expired arenas, then pings healthchecks.io `mkb-site arena sweep (hourly)` (`/fail` on an error); a missed or failed hour mails Mark.
- Share tags and caching: the agentops deploy gate (`scripts/deploy-gate.mjs <url> --repo .`) passes. Every page has its own canonical link, `og:title` and `og:url` (root layout for `/`, the demos layout, each room page, and `scripts/build-resume.mjs` for `/resume/`). `public/_headers` serves `/_next/static/*` as `immutable` (content-hashed names), sets Strict-Transport-Security (1 year, includeSubDomains) and an enforced `Content-Security-Policy`: self, inline script and style for Next, `https:` images, PostHog (`us.i.posthog.com`, `us-assets.i.posthog.com`), Turnstile (`challenges.cloudflare.com`, script and frame), Cloudflare Web Analytics, which the zone injects into live pages only (`static.cloudflareinsights.com` script, `cloudflareinsights.com` beacon; local e2e never sees it, so a live console read is its check) and cdnjs for the resume theme's Font Awesome. It was Report-Only with no `report-to` until 2026-11-22, which WebKit points out has no effect; the e2e console checks (smoke, demos, WebKit) fail on any blocked load, so a new third party needs its host added here first.

### Live check

- `curl -s https://markkennethbadilla.com/api/health` returns `{"ok":true,"commit":"<sha>"}`; the sha must equal `git rev-parse --short origin/main`. A 503 means D1 did not answer.
- Uptime Kuma monitor `markkennethbadilla.com (/api/health)` at `https://uptime.elunari.uk` checks it every minute, keyword `"ok":true`, 2 retries, and pages Mark's phone through the ntfy notification `Page Mark's phone (ntfy, loud on down only)` (personal-infra spec 003). That ntfy topic is the one alert channel; down pages loud, recovery silent.

### Rollback

- `node scripts/cf.mjs rollback` (Workers versions: the previous version takes all traffic at once; static assets roll back with it). Rehearsed 2026-11-22 on the live site: back to the previous version in 4.1 s of command and 5.2 s until `/api/health` answered from it; forward again (`node scripts/cf.mjs rollback <version-id>`, ids from `node scripts/cf.mjs deployments list`) in 3.6 s and 5.7 s. A browser that loaded a page during the rollback can keep that response cached; reload.
- A rollback does not undo a D1 migration. Migrations here only add tables or columns, so the older code still runs on the newer schema; a migration that drops or renames something needs its own rollback written first.

### Deprecation and migration

Register R19. Rule 2 holds: what is replaced is deleted once its dependents moved.

- A removed or renamed page gets a 301 line in `public/_redirects` (Workers static assets read it; the export copies it to `out/`), so links from resumes, job applications and search results keep working; the Routes table above changes in the same commit.
- A removed API route or demo endpoint moves its callers in the same commit: the page code, the probes in `scripts/`, the e2e tests and the Journeys table.
- D1 changes add before they remove: a migration adds the new table or column, the code moves to it, and a later migration drops the old one only after the rollback window has passed (see Rollback above).
- The site has no account holders or subscribers to notify; the public changelog is the commit history. A removal Mark links to elsewhere (a resume, a profile, an application) is replaced there first.

### Site down

Check the layers in order, stop at the first that fails:

1. `curl -sI https://markkennethbadilla.com/` and `/api/health`. 5xx from the Worker: `node scripts/cf.mjs tail` for the error, then roll back (above).
2. Cloudflare status (`https://www.cloudflarestatus.com`) and the Workers dashboard for `mkb-site` (errors, CPU limit).
3. D1: health 503 means the `select 1` failed. `node scripts/cf.mjs d1 execute mkb-site-demo --remote --command "select 1"`.
4. A demo or the guide refusing: read the refusal text. `429` is the budget or the rate limiters (by design); `403 bot-check` is Turnstile; `503 The bot check is not configured` means `TURNSTILE_SECRET` is missing.
5. Paid model down: the guide falls back to its written section line; nothing to do but check the DeepSeek and OpenRouter status pages.

### Backups

- `bun run backup` (`scripts/backup-d1.mjs`) exports both D1 databases to `%USERPROFILE%/cloud/backups/mkb-site/<date>/` (Filen-synced, so offsite), restores each export into a fresh in-memory SQLite (`node:sqlite`) and fails unless every table's row count matches the export; it writes `restore-proof.json` beside the files and keeps the newest 4 dates (older ones go to the Recycle Bin). About 25 s, 7.7 MB on 2026-11-22.
- It runs weekly in `bun run scheduled` (mkb-winops task `MkbRepoChecks-site-checks`, spec 057). D1 Time Travel (7 days on the free plan) covers a bad write inside the week: `node scripts/cf.mjs d1 time-travel restore mkb-site-demo --timestamp <ISO>`.
- Restore for real: `node scripts/cf.mjs d1 execute <db> --remote --file <export>.sql` into a new database, point `wrangler.jsonc` at it, deploy.

### Checks

`bun run gate` is Turborepo (`turbo.json`): each task runs side by side and replays from cache when its inputs did not change. Tasks: `lint` (ESLint, `--max-warnings` via suppressions baseline), `typecheck` (site, worker, scripts), `test` (node:test over `tests/`), `test:worker` (vitest in workerd against real local D1), `migrate:check` (every migration applied to a fresh database of each binding), `links` (lychee, offline, over `out/`), `e2e` (Playwright smoke, axe, text scale, screens, forms, journeys, analytics, fuzz) and `evals` (promptfoo golden set; runs only when a prompt or the guide changes, by its inputs).

- `git push` runs Trunk's pre-push actions (`.trunk/trunk.yaml`): gitleaks, Stylelint (`.stylelintrc.json`: a colour, background, font or fill must be a `var()` token from `src/app/globals.css`, never a literal), osv-scanner (`block-push-on-osv`; accepted no-fix advisories in `osv-scanner.toml`, each with a reason and a 30-day `ignoreUntil`), Opengrep, `bun run gate`, and `bun run maint`. The first failure stops the push. `git commit` runs gitleaks on staged files.
- `bun run scheduled`, weekly (mkb-winops spec 057): WebKit smoke crawl, outside links, AI red team, ZAP baseline, D1 backup.
- Lighthouse: the live site, daily, from mkb-vps-sg (personal-infra `servers/mkb-vps-sg/lighthouse/`), floor 0.70 in every category on every page (agentops rule 73), never in the deploy or the push. URLs and floors: personal-infra `servers/mkb-vps-sg/lighthouse/mkb-site.lighthouserc.json`; result ping healthchecks.io `manga lighthouse-live (daily)`, email on a miss.
- Local look with the Worker: `bun run build`, then `node A:/personal-markkennethbadilla/mkb-agentops/scripts/dekit-up.mjs ctl <repo> start worker` (dekit task `worker`, `scripts/dev-worker.mjs`): local D1, the guide key from the vault, `out/` plus `/api/*` on http://127.0.0.1:8788. Stop it before the next build, since it holds `out/` open. Deploy gate before a deploy: dekit task `worker-gate` (same, https on 8789), then `node A:/personal-markkennethbadilla/mkb-agentops/scripts/deploy-gate.mjs https://markkennethbadilla.com --repo . --resolve 127.0.0.1:8789 --reviewed`. A file that holds POST handler text only in a string carries `inbound: none (<why>)`; a room module behind `worker/index.ts` (which records every `/api/*` POST first) carries `inbound: recorded in worker/index.ts`.
- Requirements: `specs/requirements.md` (OpenFastTrace, coverage register T24) is traced on every push by Trunk action `trace-on-push`; a new decision or promise adds its item in the same commit.
- Install the hooks once per clone: `trunk git-hooks sync`. `git push --no-verify` skips the push gate, but `bun run deploy` always runs `bun run gate`.
- Time budget: the repo's line in agentops `gate-budgets.json` (rule 0).
- Test records: `specs/001-coverage-register/test-runs/<date>-<topic>/results.md`.

### Regression catalog

Each defect met became a check that fails if it returns:

| Defect | Guard |
| --- | --- |
| Quoted table names bypassed the SQL guard and read another visitor's run (2026-08-22) | two D1 databases; `worker/sql-boundary.test.ts`; `tests/guide.test.mjs` HOSTILE_SQL corpus |
| Worker shipped ahead of migration 0007, Split-Brain 500s for seven weeks | deploy applies migrations first; `migrate:check` in the gate |
| Free models invented a university and an employer | closed corpus plus `checkGrounding`; `tests/guide.test.mjs` grounding cases |
| A pooled figure licensed "66 failover drills" | figures bound to their fact; grounding cases in `src/lib/grounding.ts` |
| Room source links 404'd while the repo was private | `tests/probe-demos.mjs` fetches each source URL |
| Run-id-keyed limiter never limited run creation | IP-keyed reserve; `tests/demos.test.mjs` asserts reserve() in the router |
| Arena tables grew forever with no sweep | hourly cron; `worker/demos.test.ts` |
| A POST answered before it was recorded | `worker/records-first.test.ts` (source order and rows) |
| Guide and demo endpoints open to scripted abuse | Turnstile; `worker/bot-check.test.ts` |
| A browser navigation to `/api/*` got the static 404 page (Workers Assets answers navigations first) | `run_worker_first: ["/api/*"]` in wrangler.jsonc; `e2e/smoke.spec.ts` navigation case (fails with 404 without it) |
| The guide said it did not know his current work | current-role fact in `src/lib/public-facts.ts`; `evals/golden/guide.yaml` case "Current work names WeAssist" |
| The bot check added a 403 the API contract did not list | `openapi.json`; `e2e/fuzz.spec.ts` (Schemathesis ST103) |

### Security scan

The Trunk pre-push gate runs Opengrep with the pinned JavaScript and TypeScript security rules (mkb-winops spec 060). It scans only files changed since origin/main and blocks a push on a new ERROR or WARNING finding. Fix the finding, or when it is a false positive put `// nosemgrep: <rule-id>` on the line above it, using the short rule id the scan prints. There is no global skip.

## Journeys

The table is in `specs/001-coverage-register/spec.md` (`## Journeys`), walked by `e2e/journeys.spec.ts`.
