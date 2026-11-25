spec: task
name: "rust-gate-docs-gates-release"
tags: [rust, docs, gates]
verify: "mise exec -- bun test tests/mise-tasks.test.ts tests/flow-gates-mise.test.ts && mise exec -- bash scripts/docs-lint.sh --write-baseline && mise run docs && git diff --exit-code -- CHANGELOG.md"
max-rounds: 2
---

## Intent

Document the generated Rust structural gate and the crate-architecture skill, and pin the flat mise task shape and loud-skip behavior in the existing gate tests. No new gate script.

## Decisions

- The docs describe the Rust-only generated check chain and optional-tool skip semantics.
- The generated check stays a flat one-line double-quoted TOML assignment so the existing parser accepts it.
- Docs baseline is regenerated only with the gate script; change log stays SHIP-only.
- Orchestrator adjudication expands this task to repair task-1 test scope and task-1 doc debt that only becomes visible when the baseline is regenerated; no behavior surface changes.

## Boundaries

### Allowed Changes
- .workflows/specs/task-3.spec
- README.md
- README*
- docs/architecture.md
- docs/canon.md
- scripts/docs-lint-baseline.json
- skills/init/SKILL.md
- templates/DOCS-POLICY.md
- tests/prompt-doctrine.test.ts
- tests/mise-tasks.test.ts
- tests/flow-gates-mise.test.ts

### Forbidden
- .workflows/plan.md
- CHANGELOG.md
- scripts/flow-gates.mjs
- generated allow files
- any path not listed in Allowed Changes

## Completion Criteria

Scenario: flat generated check is parsed
  Test: test_generated_rust_check_parse
  Given a generated Rust root mise task with a flat double-quoted check line
  When the mise task and flow-gates tests run
  Then the check command is detected by the existing parser
  And no new parser branch is required

Scenario: generated check chains the Rust gates
  Test: test_generated_rust_check_chain
  Given the generated Rust check string
  When the tests inspect it
  Then cargo metadata, cargo tree, cargo clippy, optional cargo-deny, and guarded deslop-please appear in order
  And the architecture skill family is named in docs for crate boundary decisions

Scenario: absent optional tools skip loudly
  Test: test_generated_rust_check_loud_skip
  Given a simulated environment without deslop-please, rust-analyzer, or cargo-deny
  When the generated check runs
  Then stderr names the missing tool and the recommended install
  And the command continues rather than failing silently
  And findings from installed tools still fail with exit one

Scenario: docs describe the gate and the skill
  Test: test_rust_architecture_docs
  Given the README, architecture doc, and canon
  When their Rust gate sections are read
  Then the generated Rust check chain is documented
  And the claim-to-gate mapping names the Rust structural gate
  And rust-crate-architecture is named as the crate-boundary skill

Scenario: cross-task test scope is corrected
  Test: test_rust_gate_no_forbidden_changes
  Given the task-1 boundary guard
  When task-3 docs files are changed
  Then docs files allowed by task-3 are not reported as task-1 forbidden churn
  And genuine forbidden paths still fail the guard

Scenario: docs baseline ratchet holds
  Test: test_rust_docs_baseline_ratchet
  Given the plan's doc edits
  When docs lint runs after baseline regeneration
  Then no per-file budget rises against the pre-change reference
  And git shows no change log modification
