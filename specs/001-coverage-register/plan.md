# Plan: Coverage register for markkennethbadilla.com

## Prior art

| Need | Taken from | Not built |
| --- | --- | --- |
| Gate runner | Turborepo 2.11.13, as in `site-starter` | the old `scripts/gate.mjs` branch logic |
| Browser specs | Playwright plus `@axe-core/playwright` 4.14.0, specs copied from `site-starter` | |
| API fuzz | Schemathesis 4.33.4 against `openapi.json` | |
| AI evals and red team | promptfoo 0.126.0 | |
| Links | lychee | linkinator (removed) |
| Bot check | Cloudflare Turnstile explicit-render API, siteverify | a widget library |
| Analytics, errors, AI watching | posthog-js 1.453.2 and PostHog's capture API | |
| Backups | `wrangler d1 export` and Node's built-in `node:sqlite` for the restore proof | |
| Logging | agentops `scripts/lib/log.mjs` (pino) through `scripts/log.mjs` | |
| Uptime and paging | the existing Uptime Kuma and ntfy (personal-infra spec 003) | |

## Structure

- `SPEC.md` regrouped into What, Why, How, Reads and writes, Run check and hand over.
- `turbo.json` holds every gate task and its inputs; `bun run scheduled` holds the weekly ones.
