# SPEC - markkennethbadilla.com

## What this is

Mark Kenneth Badilla's personal site. It is a portfolio, and its centrepiece is a
live demonstration of the thing he claims to do: constrain an LLM agent with
deterministic gates so it physically cannot ship a dangerous change.

## Features

- **Resume surface** - hero, about, work history, education, skills, projects,
  contact. All content lives in one file, `src/data/resume.tsx`.
- **The site guide** (`/#guide`) - a small card under the hero. Ask it something
  in free text and it decides which section of the page answers you, then leaves
  its slot: the page eases to that section, everything else dims, and a small
  animated entity perches beside the lit section with a written line about what
  you are looking at. "Ask something else" flies it home and it parks again. Off
  the topic of Mark or this page, it declines and stays put.
- **Projects** (`/#projects`) - published work, each linking to its source. This
  replaced the gate-harness demo on 2026-08-05. The harness code
  (`src/lib/gates.ts`, `src/components/demo/harness.tsx`, `/api/agent`) is still
  in the repo and still works; it is simply not on the page, and it returns as a
  guide tool rather than as its own section.
- **Live telemetry** - per attempt: latency, input/output/total tokens, cost,
  position in the fallback chain, finish reason, and whether the output schema
  was enforced. The provider chain in use is shown before anything is run.

## Routes

| Route | Type | Purpose |
|---|---|---|
| `/` | static | The whole site. Single page. |
| `/api/agent` | Worker | POST. Runs one agent attempt. |
| `/api/models` | Worker | GET. Reports the discovered free-model chain and limiter status. |
| `/api/guide` | Worker | POST. One guide question: runs the tool-calling loop, returns a section or a decline. |

## Locked decisions

1. **Forked `magicuidesign/portfolio` (MIT), not hand-built.** A hand-rolled
   portfolio looks hand-rolled; the previous iteration of this site proved it.
2. **Rejected `once-ui-system/magic-portfolio` despite it looking better.** It is
   CC BY-NC 4.0 - non-commercial with mandatory attribution, which is the wrong
   licence for a site whose purpose is winning paid work.
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
9b. **The fact corpus excludes age and date of birth.** Not a safety judgement: he
   targets senior and lead roles at 1.5 years of experience, an age on the page
   hands a screener a reason to filter before reading the work, and in most target
   markets an employer cannot ask for it. Also excluded: phone, address, health,
   family, finances, employer system names, and the Hatchit ERP metrics, which
   have no artifact behind them unlike everything else he claims.
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
    real centre is not the value passed to `left`. The speech-bubble tail derived
    its position arithmetically and sat 138px off; it now reads the element's rect
    on the same rAF tick as the section rect.

## Non-goals

- **No Q&A chatbot.** Narrowed 2026-08-05, with Mark. Free-text input is fine;
  what was rejected is a bot that *answers*. The model here is an actor inside a
  pipeline - it decides where the visitor should be looking and the page does the
  rest. It holds no facts about Mark and has no tool that can state one, so it
  cannot become a conversation partner by drift. A chat box that replies in prose
  would be generic and would demonstrate nothing.
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
