spec: task
name: "agents-template-lint-migration"
tags: []
---

## Intent

Make the AGENTS.md doctrine enforceable: (1) `templates/AGENTS.md` restructured into three blocks — CORE (binding behavior, ~25 lines), POINTERS (machine-greppable one-liners with `<placeholder>` targets for init), PROJECT (project-specific rules) — line budget ≤ 60; (2) `scripts/agents-lint.sh <agents-md>` validates an instance: every backtick-quoted repo path in pointer lines exists, CORE present, budget ≤ 60, no plan-ID history refs (`2026[0-9]{4}-[0-9]{3}`), no nested `AGENTS.md` pointer targets, no unfilled `<placeholder>` in an instance; (3) the repo's own `AGENTS.md` migrates to the new structure and passes the lint.

## Decisions

- The template's CORE block: containment (work only within Allowed Changes), commit discipline (never commit/merge/push as a worker), refactor-first before adding features, TDD (test with the code, not after), subtract-before-add, fix root causes not symptoms, docs discipline (docs describe current state; history only in CHANGELOG). One line each where possible.
- The greeting rule: the repo's current `AGENTS.md` first line (`Start every reply with "Aurel,". No exceptions.`) is a binding owner rule — preserved verbatim as the first line of the migrated file, above the CORE section.
- Pointer lines format: `- <Name>: `<path>`` — backtick-quoted, repo-relative. The lint extracts them and `test -e` each. `<placeholder>` pointers are legal ONLY in the template; an instance carrying an unfilled `<placeholder>` fails the lint.
- agents-lint is a standalone bash script (`scripts/agents-lint.sh <file>`), exit 0 clean / non-zero with one `FAIL: <reason>` line per violation.
- Template header comment states the doctrine: AGENTS.md = CORE + POINTERS + PROJECT; dynamic data (maps, ADR bodies, command inventories) lives in pointer targets, never here.

## Boundaries

### Allowed Changes
- templates/AGENTS.md
- scripts/agents-lint.sh
- AGENTS.md

### Forbidden
- Do not touch `skills/**` (TASK 2 scope), `templates/DOCS-POLICY.md` (TASK 2 scope), `extensions/**`, `scripts/check-drift.sh` (TASK 2 wires it), other templates, CHANGELOG/package.json (TASK 3 scope).
- Do not change the greeting rule's wording.

## Completion Criteria

Scenario: template carries the three blocks
  Test: grep -q "CORE" templates/AGENTS.md && grep -q "POINTERS" templates/AGENTS.md && grep -q "PROJECT" templates/AGENTS.md
  Given templates/AGENTS.md after the change
  When its sections are inspected
  Then the CORE, POINTERS, and PROJECT blocks appear with the doctrine header

Scenario: agents lint passes the migrated repo agents md
  Test: bash scripts/agents-lint.sh AGENTS.md
  Given the migrated AGENTS.md
  When agents-lint runs on it
  Then it exits 0

Scenario: agents lint rejects a dead pointer
  Test: sed 's|AGENTS.md — pi-workflows project charter|AGENTS.md — scratch|' AGENTS.md > /tmp/p40-dead.md 2>/dev/null; cp AGENTS.md /tmp/p40-dead.md && sed -i 's|agents/registry.md|docs/no-such-file.md|' /tmp/p40-dead.md; if bash scripts/agents-lint.sh /tmp/p40-dead.md; then exit 1; fi
  Given a copy of the migrated AGENTS.md with one pointer retargeted to a nonexistent path
  When agents-lint runs on it
  Then it exits non-zero

Scenario: line budget holds
  Test: test $(wc -l < AGENTS.md) -le 60 && test $(wc -l < templates/AGENTS.md) -le 60
  Given both files after the change
  When line counts are measured
  Then each is at most 60 lines

Scenario: no plan id history refs
  Test: ! grep -qE '2026[0-9]{4}-[0-9]{3}' AGENTS.md
  Given the migrated AGENTS.md
  When it is searched
  Then no plan-ID history reference appears
