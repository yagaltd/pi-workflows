spec: task
name: generated-docs-tree-manifest
tags: [docs, generation, manifest, tdd]
verify: "bun test tests/gen-docs.test.ts tests/tree-check.test.ts && bash scripts/docs-lint.sh && bash scripts/check-drift.sh"
max-rounds: 3
---

## Intent

Derivable docs become generated + checked, and the approved tree becomes a manifest: scripts/gen-docs.mjs regenerates the README commands table from prompts/*.md frontmatter (marker-delimited section) with --check; scripts/check-tree.mjs verifies repo files against .workflows/tree.json; both wired into docs-lint.sh (check-tree WARN tier first).

## Decisions

- Marker-delimited generation preserves all hand-written README sections (byte-identical outside markers).
- check-tree ships WARN-tier first ship; strictness after settling.
- Pins live in tests/gen-docs.test.ts and tests/tree-check.test.ts (NOT prompt-doctrine — sibling task owns it).

## Boundaries

### Allowed Changes
- scripts/gen-docs.mjs (new)
- scripts/check-tree.mjs (new)
- scripts/docs-lint.sh
- README.md (generated section only)
- .workflows/tree.json (new)
- tests/gen-docs.test.ts (new)
- tests/tree-check.test.ts (new)

### Forbidden
- skills/, prompts/, templates/, scripts/flow-gates.mjs, scripts/dispatch-ledger.mjs, agents/, AGENTS.md

## Completion Criteria

Scenario: regeneration is byte-identical
  Test: gen-docs test
  Given the current prompts/ frontmatter
  When gen-docs runs
  Then the README commands section regenerates identically (idempotent) and hand sections are untouched

Scenario: check catches drift
  Test: gen-docs --check on a mutated table
  Given a hand-edited generated section
  When --check runs
  Then exit 1 naming the drift

Scenario: tree manifest flags unknowns
  Test: tree-check on fixture
  Given tree.json and files outside it
  When check-tree runs
  Then unknown files are flagged (WARN output listing paths); manifest files pass

Scenario: docs-lint wired
  Test: docs-lint runs both checks
  Given the wiring
  When docs-lint runs
  Then generation --check and tree-check execute without failure

Scenario: suite green
  Test: full suite
  Given the edits
  When bun test runs
  Then 0 fail
