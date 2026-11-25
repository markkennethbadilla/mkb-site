# Feature Specification: Coverage register for markkennethbadilla.com

**Created**: 2026-11-22
**Status**: Implemented
**Input**: Handoff `mkb-site-coverage-gaps.md`: "Bring the repo up to every unticked row ... tick each with real proof, commit, push without overrides, deploy from main." Coverage register, mkb-agentops skill `cover-the-whole-lifecycle`.

## User Scenarios & Testing

### User Story 1 - A push proves the site still works (Priority: P1)

An agent changes the site and pushes. One command checks lint, types, unit and worker tests, migrations, links, every page in a browser (axe, text scale, screens, forms, journeys, analytics), the API fuzz and, when the guide changed, its answer quality.

**Independent Test**: `bun run gate` passes on a clean checkout of `main`; a second run with no change replays from cache.

### User Story 2 - A bad deploy is seen and undone fast (Priority: P1)

**Independent Test**: `/api/health` returns the deployed commit; the Uptime Kuma monitor pages on down; `scripts/cf.mjs rollback` was rehearsed and timed.

### User Story 3 - The data survives losing Cloudflare (Priority: P2)

**Independent Test**: `bun run backup` exports both D1 databases offsite and proves a restore by row count.

### User Story 4 - Scripted abuse cannot spend the guide's budget (Priority: P2)

**Independent Test**: `worker/bot-check.test.ts`: no token is refused 403 and still recorded.

## Requirements

- **FR-001** Every Complete register row has a ticked line with proof in `specs/coverage.md`.
- **FR-002** `SPEC.md` has the five sections and a `## Journeys` table walked by `e2e/journeys.spec.ts`.
- **FR-003** No push or deploy needs an override.

## Success Criteria

- **SC-001** `specs/coverage.md` has no unticked line.
- **SC-002** The live site serves the commit at the tip of `main`.

## Journeys

| User type | Entry point | Device or return visit | Failure | Path back | e2e test |
|---|---|---|---|---|---|
| First-time visitor | `/` (home gallery), then a room | Desktop 1280 wide, first visit | A room run is refused or the Worker answers 500, and the room shows a role=alert message | The "Back to the gallery" link on the room page returns to the home page | `e2e/journeys.spec.ts` "home to a demo room run, then back to the gallery" and "a failing demo endpoint shows an alert and the gallery link still works" |
| Mobile visitor | `/resume/` | Phone 390 wide, first visit | The page scrolls sideways or the projects block is cut off | Pinch zoom stays allowed and the resume PDF link stays on the page | `e2e/journeys.spec.ts` "reads the resume page and the projects on it without sideways scroll" |
| Returning visitor | `/` or any room | Same browser, second visit | The chosen dark or light theme is forgotten | The mode toggle in the navbar sets it again | `e2e/journeys.spec.ts` "the chosen theme is remembered on the next visit" |
| New device or cleared browser | `/demos/split-brain/` deep link | New device, cleared browser: a fresh context with no storage | The room opens with no earlier state | The rail links to the other rooms and "Back to the gallery" returns home | `e2e/journeys.spec.ts` "a fresh context opens a deep link and finds the way around" |
| Visitor asking the site guide | `/` guide box | Any device, any visit | The guide endpoint returns 429 or 5xx and the box shows the refusal text from the server (or "The guide endpoint returned N." when the body has none) | The question stays in the box and Ask works again for a retry | `e2e/journeys.spec.ts` "a rate-limited guide shows a message and the visitor can ask again" |

## Quality bar

One row per ISO/IEC 25010:2023 characteristic, plus business outcome and cost. Baselines are from `test-runs/2026-11-22-coverage/results.md` (case numbers) and the retrieval run of 2026-11-26.

| Characteristic | Metric and floor | Best practice found | Baseline | Alternatives tried, winner | Gate step holding the floor |
| --- | --- | --- | --- | --- | --- |
| Functional suitability | every simple path of the guide flow machine reaches its state on the real handler; retrieval hit@1, hit@5 and MRR each 0.9 or more on the golden set; guide golden cases pass 3 of 3 trials | [XState graph](https://stately.ai/docs/graph), [BEIR](https://github.com/beir-cellar/beir) | 4 paths, 5 states reached; hit@1 0.938, hit@5 0.938, MRR 0.944 on 16 queries; 33 of 33 eval trials (case 11) | exact-match cache, or lexical similarity with synonyms; lexical shipped (no embedding model on the free tier) | `test:worker` (worker/guide-flow.test.ts, worker/cache-golden.test.ts), `evals` |
| Performance efficiency | Lighthouse performance 0.70 or more on every page; each AI call under 15 s | [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) | lowest mobile performance 0.75 on `/`; max AI latency 3.1 s (cases 17, 11) | none tried after the first passing run | `lighthouserc.json` daily on the VPS, `evals` latency assertion |
| Compatibility | every page passes in Chromium and WebKit | [Playwright projects](https://playwright.dev/docs/test-projects) | WebKit 7 of 7; Chromium 83 of 85 then all fixed (cases 9, 10) | Chromium only, or plus WebKit; both shipped | `e2e`, `e2e:webkit` in `scheduled` |
| Interaction capability | 0 axe WCAG 2.2 AA violations on every route; text at 200% with no loss | [axe-core](https://github.com/dequelabs/axe-core), WCAG 2.2 SC 1.4.4 | text-scale 10 of 10 (case 9); axe 0 violations | Lighthouse accessibility alone, or axe per route; axe shipped | `e2e` (smoke.spec.ts, text-scale.spec.ts) |
| Reliability | every inbound request recorded before any decision; every guide flow path leaves one record per request | rule 43 | records-first tests pass; the flow test counts one row per request | none tried, recording before routing is the standard | `test:worker` (records-first.test.ts, guide-flow.test.ts) |
| Security | 0 secrets, 0 known-vulnerable packages, 0 ZAP warnings, 0 red team failures | [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/), [OWASP LLM Top 10](https://genai.owasp.org/) | ZAP FAIL-NEW 0, WARN-NEW 0; red team 28 of 28; OSV 112 to 0 (cases 18, 12, 8) | none tried after the first passing run | Trunk gitleaks, osv-scanner, opengrep; `zap`, `redteam` in `scheduled` |
| Maintainability | 0 new import cycles, dead code or copies | [knip](https://knip.dev), [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) | 0 knip findings; baselines in .dependency-cruiser-known-violations.json | none tried, the maint gate is the house standard | `maintainability-on-push` Trunk action |
| Flexibility | n/a: a single site, not a template; the template is site-starter | n/a | n/a | n/a | n/a: no gate |
| Safety | no invented biography; a daily call budget and a capped key bound spend | [OWASP LLM Top 10](https://genai.owasp.org/) LLM10 unbounded consumption | grounding golden cases and red team 28 of 28 (cases 11, 12); budget cap in worker/budget.ts | no cap, or a cap in code plus the provider limit; both shipped | `evals`, `redteam`, `test:worker` budget cases |
| Business outcome | n/a: a portfolio with no sales target; visits and guide questions are read in PostHog | [GOV.UK Service Standard point 14](https://www.gov.uk/service-manual/service-standard/point-14-operate-a-reliable-service) | none | n/a | n/a: no gate |
| Cost | 0 USD a month hosting on the Cloudflare free tier; AI spend inside the capped key | [Workers free tier limits](https://developers.cloudflare.com/workers/platform/limits/) | 0.0032 USD for the 33 eval trials (case 11) | server runtime or static export plus one Worker; Worker shipped | `evals` cost assertion; the provider key limit |
