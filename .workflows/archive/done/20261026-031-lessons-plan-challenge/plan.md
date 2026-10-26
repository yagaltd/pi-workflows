# Plan: Lessons in plan + challenge (031)

> Plan ID: 20261026-031
> Status: APPROVED 2026-10-26 (owner, session-directed — "run C then D", D follows 030). Wave 1 in progress.
> Created: 2026-10-26
> Shape: pi-workflows plan (house format). Single repo. Prompt-skill wiring
> only — the ledger and its CLI shipped in 026; this plan makes the two
> drafting surfaces read it.

## Context

Queue row D (026 D5): drafts are not lesson-aware. `lessons.mjs list`
exists with status/tag/text filters; the ledger holds 12 lessons (021, 026,
029, 030 distills). `/plan` Phase 1 reads context; `/challenge` Phase 1
reads CONTEXT.md — neither reads the ledger. Lesson-aware drafting needs
no new code: two skills gain a read step with a citation rule, one test
file pins the wiring, the queue drops D.

## Decisions

- **D1 — /plan Phase 1 gains a lessons read.** Run
  `node scripts/lessons.mjs list` before decomposition. Valid and
  speculative lessons inform task shape; the draft cites lesson ids it
  applies (`lessons: les-<id>` line in Execution Notes). Active lessons
  are not re-litigated — a draft that contradicts one records why its
  revisit-when condition fired.
- **D2 — /challenge Phase 1 reads the same ledger.** The grill adds one
  check: does the plan contradict an active lesson? Contradiction without
  a recorded revisit-reason is a finding.
- **D3 — Provenance is the trust filter.** `from_untrusted` lessons
  inform; only `verified` lessons (or owner-confirmed ones) can block a
  draft. `failed` lessons are warnings, not vetoes.
- **D4 — Queue hygiene.** D drops at SHIP; E carries `next` only by
  explicit owner decision (stays `later`).

## Spec Map

| Task | Contract | Wave | Model |
|------|----------|------|-------|
| T1 plan + challenge skills read the ledger | task-1.spec | 1 | orchestrator-inline Tier A |
| T2 tests + queue + release | task-2.spec | 1 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier A, ⚪): lessons reads in both skills
- **Status**: ✅ DONE
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: skills/plan/SKILL.md, skills/challenge/SKILL.md
- **Verify**: bun test tests/lessons-prompt.test.ts

### TASK 2 (Tier A, ⚪): tests + queue + release
- **Status**: ✅ DONE
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: tests/lessons-prompt.test.ts, .workflows/queue.json, CHANGELOG.md, package.json
- **Verify**: bun test

## Execution Notes

(context markers land here per task on completion — before the settle judge)

- TASK 1 ✅ context: no changes — Phase 1 lessons read + citation rule in both skills.
- TASK 2 ✅ context: no changes — structural queue tests, D dropped, v0.11.2.
- DEVIATION: three queue tests (029, 030, 031) each asserted ship-time membership and rotted as later plans dropped rows — because each plan tested the queue as a snapshot — implication: all queue tests now assert the structural invariant (six columns, shipped prefixes never return); no new plan can rot them.
- DISCOVERY: queue lifecycle staleness is a test-design smell, not a data problem — membership assertions belong to the plan that ships the row, structural invariants to every later one.

## Docs impact

- `CHANGELOG.md` — v0.11.2 entry (plan 20261026-031)
- `package.json` — version 0.11.2
