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
- **The agent harness** (`/#harness`) - a visitor asks an agent for something
  dangerous. A live model writes the change; deterministic gates run on its
  output in the browser; a blocked gate feeds its reason back and the model
  rewrites, up to three rounds.
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
4. **Free models are discovered at runtime, never hardcoded.** OpenRouter's free
   tier churns; pinned slugs guarantee a dead demo within weeks. Only the final
   fallback (`deepseek/deepseek-v4-flash`) is fixed.
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
9. **The guide routes; it never speaks.** It has exactly two tools -
   `navigate_to_section` and `decline` - and no way to write prose. An earlier
   design gave it an `answer` tool, and `scripts/probe-guide.mjs` caught every
   free model inventing biography: a university Mark never attended, an employer
   he never worked for. The models were told no facts about him, so they supplied
   their own, fluently. A stricter prompt does not fix that, because a prompt is a
   request; deleting the tool does. Arrival copy is written prose in
   `src/lib/site-sections.ts` that points at the page rather than restating it, so
   it cannot drift out of sync with what the visitor is looking at.
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
- **No paid infrastructure.** Cloudflare free tier, free-tier inference, hard
  daily cap.

## Guardrails on the demo

- Burst rate limiting via the Cloudflare native rate-limit binding, at the edge.
- A global daily request ceiling in KV, independent of the burst limiter.
- Input validated by Zod with a hard length cap before any model is called.
- Output validated by Zod; non-conforming responses advance the cascade.
