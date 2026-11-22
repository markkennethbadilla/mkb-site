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
