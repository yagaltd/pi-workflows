spec: task
name: "LOG entry + Domain Memory supersede"
tags: [docs, log, domain-memory]
max-rounds: 2
---

## Intent

The incident and its enforced countermeasures become durable memory: LOG records the plan; Domain Memory's advisory cwd note is superseded by the enforced version.

## Decisions

- LOG: one dated PLAN 20260822-003 line (scope, tasks, evidence numbers).
- CONTEXT.md Domain Memory: append a 2026-08-22 decisions block — per-task cwd mandatory + GUARD step 0 + anti-scaffold + VOID semantics + tripwire script; explicitly marks the 20260821 "MUST set per-task cwd" note as superseded-by-enforcement; cites the MorphEditor 20260822-002 incident (3/10 run-level vs 13/13 per-task+GUARD).
- CHANGELOG untouched (SHIP gate).

## Boundaries

### Allowed Changes
- .workflows/LOG.md
- .workflows/CONTEXT.md

### Forbidden
- Everything else (agents/**, tooling/, plan.md, specs/, CHANGELOG.md)

## Completion Criteria

Scenario: LOG line appended
  Test: grep "20260822-003" .workflows/LOG.md
  Then one plan line exists naming the hardening scope

Scenario: Domain memory supersede recorded
  Test: grep -A2 "2026-08-22" .workflows/CONTEXT.md
  Then a decisions block exists that names GUARD/anti-scaffold/VOID/tripwire and marks the 20260821 cwd note superseded

Scenario: CHANGELOG untouched
  Test: git diff --name-only | grep -c CHANGELOG
  Then zero (no CHANGELOG change in this task's diff)
