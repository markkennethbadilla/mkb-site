# The agent centrepiece — design

Decided 2026-08-04 with Mark, after two rejected framings. This supersedes the
existing gate-harness demo as the site's centrepiece; the harness survives as one
tool among several.

## What was rejected, and why it matters

**A chatbot that answers questions about Mark.** Generic. Every portfolio has one,
it proves only that he can call an API, and a hostile reviewer discounts it on
sight.

**Three separate guardrail projects.** The first slate came back as three
variations on gate-checking because the brief I wrote declared agentic
engineering "his differentiator" in the hard constraints and put three of four
proposal angles in that orbit. Mark called it hyper-focused and he was right: it
left his ERP data-integrity work, full-stack product engineering, data
engineering, reliability and the security incident response entirely invisible.

## The decision

**One agent. Range lives in the toolbox, not in a count of repos.**

A visitor watching the *same* agent query a schema, run a migration, find a
vulnerability and reconcile a ledger learns more about the breadth of the person
who built it than they would from three separate repositories they will not open.

## Free chat, and why that is not a contradiction

Input is free text. What makes this not-a-chatbot is that it **acts** — it plans,
calls real tools, observes real results and reports. Talking is the interface, not
the product.

## Dual-register output — the load-bearing UX decision

The page has to serve a recruiter and a staff engineer at once, and neither may
get a watered-down version. So every action renders twice from the same run:

- **Default, plain language.** "I checked the database schema — there are 111
  tables. That is roughly the size of a mid-sized company's entire internal
  system."
- **"Show the work", expanded.** The SQL, the tool call and its arguments, token
  counts, latency, which model answered, position in the fallback chain, and the
  gate verdicts.

A non-technical visitor follows the whole thing and understands what happened. An
engineer clicks one toggle and sees a real tool-calling loop with real execution.
Same run, two registers, nothing dumbed down and nothing hidden.

## The toolbox — one tool per career strand

Chosen so the set demonstrates breadth. Every tool must do something REAL against
real data. A tool that fakes its result disqualifies the whole demo, which is the
same standard that got clean-pipe deleted.

| Tool | Strand it proves | Grounded in |
|---|---|---|
| `query_db` | Relational modelling at scale | Nexus: 111 tables, 142 migrations |
| `propose_migration` | Migration discipline, additive-only enforced | The SPEC rule enforced by a build gate |
| `reconcile_ledger` | Data-integrity and financial correctness | Hatchit ERP: reconciliation, atomic inventory ops |
| `normalize_source` | Data engineering over messy input | nexus-structured-importer, 17 loader steps |
| `scan_snippet` | Security and incident response | The production cryptominer found via a Next.js RCE |
| `probe_health` | Reliability and failure behaviour | Six live failover drills, 66s to writable |
| `run_gates` | Agent guardrails | The existing harness — now one of seven |

## Guardrails become load-bearing, not decorative

Free-text input from strangers is untrusted. Prompt injection, off-topic requests,
attempts to burn the inference budget. The guardrail layer stops being the thing
being demonstrated and becomes the thing doing a real job underneath — which is a
better look, because a guard performing safety is less convincing than a guard
quietly doing it.

Required before this goes live:
- Tool allowlist; the model cannot invoke anything outside the seven.
- Every tool's arguments validated by a Zod schema before execution.
- Per-IP burst limiting (Cloudflare native binding, already wired) plus the
  existing KV daily spend ceiling.
- Read-only or sandboxed data. `query_db` runs against a seeded demo schema, never
  anything real.
- Honest degradation: no key, rate limited or every model down says so plainly.

## Open questions

- Whether the agent may discuss Nexus, Autobots or the department agent kit by
  name. Code is off-limits under contract clause 4.2 regardless. Currently the
  site names none of them, which is the safe default, and Mark has not decided.
- Whether the seven tools ship at once or the set grows. Shipping three that work
  beats seven that half-work.
