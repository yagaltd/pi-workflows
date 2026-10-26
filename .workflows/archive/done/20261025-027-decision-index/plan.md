# Plan: Decision index + revisit triggers (027)

> Plan ID: 20261025-027
> Status: APPROVED 2026-10-25 (owner, session-directed — "run 027"). Wave 1 in progress.
> Created: 2026-10-25
> Shape: pi-workflows plan (house format). Single repo. Standing decisions get
> short records — rule, scope, decided-by, revisit trigger. No large context
> sections: the decided-by plan link is the context.

## Context

Plan decisions die into the archive; `adr:` metadata lines in plans have no
standing target ("adr: stays the decision link" — plan 013 D6 — points at
nothing). This plan adds `.workflows/decisions/`: one short record per
standing decision, a generated INDEX.md, a `check` gate (index in sync,
`adr:` references resolve, required fields present), and seeded records for
the decisions already made (single judge client, flows compile onto the
dispatcher, tdd-gate as the test-quality verdict).

## Decisions

- **D1 — Records are short markdown.** `.workflows/decisions/DEC-NNN-<slug>.md`:
  header fields `Status` (active | superseded), `Decided-by` (plan id),
  `Scope` (globs), `Revisit when` (free text condition), body `Rule:` one
  binding sentence. Supersede appends the successor + reason.
- **D2 — INDEX.md is generated, never hand-edited.**
  `scripts/decisions.mjs index` regenerates it; `check` fails when the file
  differs from the regeneration (drift) or when a record is malformed.
- **D3 — `adr:` links resolve.** `check --plan .workflows/plan.md` extracts
  `adr: DEC-NNN` references from the live plan and fails on unresolved ids.
- **D4 — SHIP runs the check.** `/review` Stage 3 gains one line;
  `record`/`supersede` usage documented in the plan skill.

## Spec Map

| Task | Contract | Wave | Model |
|------|----------|------|-------|
| T1 `decisions.mjs` — record / index / supersede / check | task-1.spec | 1 | @model:standard |
| T2 Seed records + wiring + docs + release | task-2.spec | 2 | orchestrator-inline Tier A |

## Tasks

### TASK 1 (Tier B, 🟡): decision records CLI
- **Status**: ✅ DONE
- **Wave**: 1
- **Depends On**: none
- **tdd**: false
- **Allowed**: scripts/decisions.mjs, tests/decisions.test.ts
- **Verify**: bun test

### TASK 2 (Tier A, ⚪): seed + wiring + docs + release
- **Status**: ✅ DONE
- **Wave**: 2
- **Depends On**: TASK 1
- **tdd**: false
- **Allowed**: .workflows/decisions/, prompts/review.md, skills/plan/, README.md, CHANGELOG.md, package.json, tests/decisions-docs.test.ts
- **Verify**: bun test

## Execution Notes

- TASK 1 ✅ context: no changes — record/supersede/list/index/check; explicit field-key map (hyphenated fields); adr: regex resolution.
- TASK 2 ✅ context: no changes — DEC-001..003 seeded; SHIP check line; plan-skill standing-decisions note; README section; v0.10.1.
- Wave settle (deterministic): 2/2 ok:true; bun test 183/183; golden 11/11, 0 flips.

## Docs impact

- `README.md` — Decision index section (names the check command)
- `prompts/review.md` — Stage 3 decisions check line
- `skills/plan/SKILL.md` — standing-decisions note
- `CHANGELOG.md` — v0.10.1 entry (plan 20261025-027)
- `package.json` — version 0.10.1
