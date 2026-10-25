spec: task
name: "registry.md — cwd + tripwire dispatch policy"
tags: [docs, registry, policy, cwd]
max-rounds: 2
---

## Intent

The dispatch policy (single source of truth) mandates per-task cwd and adopts the landing tripwire — turning the existing advisory Domain Memory note into enforced policy.

## Decisions

- D1: per-task cwd mandatory — dispatch shapes and orchestrator dispatches always set `cwd` per task; run-level/inherit is never sufficient (evidence line: run-level honored 3/10, per-task + GUARD 13/13, MorphEditor 20260822-002 incident).
- D6: Isolation policy section gains the tripwire mandate — after any claimed-done write task, orchestrator runs `tooling/verify-landing.sh <repo> <allowed-paths>` (claims on stdin from the worker's Files Changed); ALARM → report untrusted → verify cwd → redispatch with explicit per-task cwd.
- Reviewer tier table: add provenance-line + VOID-semantics pointer to the reviewer row (details live in the role files).

## Boundaries

### Allowed Changes
- agents/registry.md only

### Forbidden
- Other agent files, tooling/, .workflows/, skills/, extension code

## Completion Criteria

Scenario: Cwd policy present and mandatory
  Test: grep -i "per-task cwd" agents/registry.md
  Given the updated registry
  Then a cwd policy statement exists containing "per-task" and marks run-level cwd alone insufficient, with the 3/10 vs 13/13 evidence

Scenario: Tripwire mandate in isolation policy
  Test: grep -c "verify-landing" agents/registry.md
  Given the updated registry
  Then the isolation/verification section references tooling/verify-landing.sh with the after-every-write-task mandate and the ALARM → distrust → redispatch consequence

Scenario: Registry-table consistency
  Test: grep -i "provenance" agents/registry.md
  Then the reviewer row (or its notes) mentions the provenance line / VOID semantics
