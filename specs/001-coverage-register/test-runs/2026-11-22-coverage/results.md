# Test run 2026-11-22: coverage register for markkennethbadilla.com

Target: worktree `coverage` on this laptop (local Worker, local D1), then the live site after the deploy.

| # | Case | Command or place | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Lint | `bun run lint` | PASS | eslint exit 0 after pruning stale suppressions |
| 2 | Types (site, worker, scripts) | `bun run typecheck` | PASS | tsc exit 0 |
| 3 | Unit tests | `bun run test` | PASS | 253 pass, 0 fail (+2 stale-build cases) |
| 4 | Worker tests in workerd | `bun run test:worker` | PASS | 17 pass incl. bot-check (3) and analytics |
| 5 | Migrations on a fresh D1 | `bun run migrate:check` | PASS | both bindings applied, about 15 s |
| 6 | Links offline | `bun run links` | PASS | lychee in the cold gate run |
| 7 | Cold gate (first six tasks) | `bun run gate` | PASS | 7/7 tasks, 44 s |
| 8 | OSV advisories | `trunk check --ci --no-fix --all --filter osv-scanner` | PASS | 112 to 0; 7 no-fix ids in osv-scanner.toml |
| 9 | Chromium suite (smoke+axe, forms, journeys, analytics, demos, text scale, screens) | `bunx playwright test --project=chromium` | PASS | 83/85 on the full run; the 2 failures (per-IP budget reuse, resume header) fixed and rerun: text-scale 10/10, journeys 6/6, forms 6/6 |
| 10 | WebKit smoke | `bunx playwright test --project=webkit` | PASS | 7/7 in 13.9 s after the CSP fix (the first run found the Report-Only CSP without `report-to` and the missing cdnjs host; Playwright pinned to 1.65.1 to use the account's WebKit 2388) |
| 11 | AI golden set, 3 trials, cost and latency asserts | `bun run evals` | PASS | first run 32/33: one trial said it did not know his current work; fact fixed, rerun 33/33, 0.0032 USD, max latency 3.1 s |
| 12 | AI red team | `bun run redteam` | PASS | 28/28 |
| 13 | D1 export and restore proof | `bun run backup` | PASS | 2 databases, 38 tables, counts matched, 24 s, 7.7 MB |
| 14 | Backup pruning keeps 4 | `scripts/backup-d1.mjs <tmp>/2026-11-22 --restore-only` with 5 dated dirs | PASS | oldest moved to the Recycle Bin, 4 left |
| 15 | Live commit read-back | `curl -s https://markkennethbadilla.com/api/health` | PASS | `{"ok":true,"commit":"dec53ad"}` = origin/main; a browser navigation got 404 (assets first), fixed with `run_worker_first`, guarded in e2e/smoke.spec.ts (fails 404 without it, passes with it) |
| 16 | Rollback rehearsal | `node scripts/cf.mjs rollback` | PASS | back 5.2 s, forward 5.7 s to live |
| 17 | Lighthouse live, floor 0.70 | from the mkb-vps-sg container, mkb-site.lighthouserc.json | PASS | first run: Chrome tab crashed on `/` (fixed with `--disable-dev-shm-usage --disable-gpu`, personal-infra d9e480f), then Ledger had no accessibility score (oklab -5e-10 from hue 90; hue 88 in 90bde23). Final: lowest mobile performance 0.75 (`/`), every other category 0.89 or more on all 5 pages, mobile and desktop |
| 18 | ZAP baseline | `bunx playwright test --project=zap` | PASS | FAIL-NEW 0, WARN-NEW 0, PASS 65 (after `*.sh eol=lf`) |
| 19 | Uptime monitor on /api/health | Uptime Kuma monitor 3 | PASS | Up, 171 ms, keyword `"ok":true`, ntfy page ticked |
| 20 | Gate on push | `git push` (Trunk) | PASS | 10/10 turbo tasks, 3m24s cold typical; landed dec53ad with no override |

Totals: 20 cases, 20 PASS, 0 FAIL, 0 BLOCKED, 0 NOT RUN.

Ship verdict: SHIP. Every gate passes on main; live read-back, rollback and monitor proven.
