spec: task
name: "rust-gate-doctrine-charter-wiring"
tags: [rust, doctrine, charter]
verify: "bun test tests/prompt-doctrine.test.ts && bash scripts/agents-lint.sh templates/AGENTS.md && git diff --check"
max-rounds: 2
---

## Intent

Wire the Rust structural gate and the installed `rust-crate-architecture` skill into the reviewer doctrine, the charter assembly rules, and the AGENTS/DOCS-POLICY templates. Rust projects get the mandate; non-Rust projects stay unchanged.

## Decisions

- The canonical Rust gate sentence names `deslop-please`, first-principles fixes, no allowlist churn, and the four-skill Rust family.
- The literal sentence lives in reviewer rules, init doctrine, and policy; the universal AGENTS template carries only a generic conditional pointer so non-Rust charters stay byte-identical.
- The sentence goes into reviewer rules after the nested domain-skills bullets, never inside that slice.
- The Rust domain-skills line gains `rust-crate-architecture`; the installed-skill allowlist gains it too because the owner confirmed it is installed.
- `skills/init/SKILL.md` Phase 5 step 1 assembles the sentence and four-skill family for detected Rust stacks in both greenfield and adopt paths; pre-detection stacks skip it.
- Generated Rust `check` is one flat double-quoted TOML line chaining cargo metadata, cargo tree, clippy, optional cargo-deny, and guarded deslop-please; absent optional tools SKIP loudly.
- No new heading in the reviewer file; reviewer stays within its line budget. No deslop-please Pi-skill entry.

## Boundaries

### Allowed Changes
- .workflows/specs/task-1.spec
- agents/reviewer.md
- skills/init/SKILL.md
- templates/AGENTS.md
- templates/DOCS-POLICY.md
- tests/prompt-doctrine.test.ts

### Forbidden
- .workflows/plan.md
- .workflows/reviews/**
- commands listed in the profile
- generated allow files
- any path not listed in Allowed Changes

## Completion Criteria

Scenario: canonical Rust gate strings are pinned
  Test: test_rust_gate_doctrine_strings
  Given tests/prompt-doctrine.test.ts with constants for the canonical Rust gate sentence and the Phase 5 skip rule
  When the test file is read
  Then both constants appear verbatim
  And the installed-skill allowlist contains rust-crate-architecture but no deslop-please entry

Scenario: reviewer rule placement is guarded
  Test: test_rust_gate_reviewer_slice
  Given the reviewer rules and the canonical sentence
  When the reviewer doctrine test runs
  Then the sentence appears after the Rules heading and after the Domain skills bullet
  And it is outside the nested domain-skills slice
  And the Rust domain-skills line lists rust-review, rust-best-practices, rust-port, rust-crate-architecture
  And no new level-two heading was added and the line budget is respected

Scenario: init charter assembly covers both paths
  Test: test_rust_gate_init_charter
  Given the Phase 5 charter step in skills/init/SKILL.md
  When the doctrine test reads the bounded step-one slice
  Then it contains the canonical Rust gate sentence and the extended Rust skill family
  And the pre-detection skip clause covers the Rust gate
  And the generated Rust check string is flat and guarded

Scenario: template and policy carry the conditional rule
  Test: test_rust_gate_template_policy
  Given the template and policy files
  When their AGENTS authoring sections are read
  Then the PROJECT section gives a generic conditional pointer without the literal canonical sentence
  And the policy says conditional domain gates go in PROJECT, never CORE

Scenario: generated Rust check shape is pinned
  Test: test_rust_gate_generated_check_shape
  Given the Phase 5 environment step
  When the generated Rust check string is read
  Then it starts with cargo metadata and cargo tree commands
  And chains cargo clippy before optional cargo-deny and guarded deslop-please
  And absent optional tools produce a loud SKIP to stderr and continue

Scenario: non-Rust doctrine stays unchanged
  Test: test_rust_gate_non_rust_unchanged
  Given a non-Rust charter and reviewer slice
  When the doctrine tests run
  Then no Rust gate sentence is attached to the non-Rust stack
  And existing installed-skill assertions remain intact

Scenario: accretion guards still pass
  Test: test_rust_gate_accretion_guard
  Given the full prompt-doctrine suite
  When the Verify command runs
  Then all existing prompt-doctrine assertions pass
  And agents-lint templates/AGENTS.md passes

Scenario: no forbidden churn
  Test: test_rust_gate_no_forbidden_changes
  Given the task branch
  When forbidden paths are inspected
  Then no profile command, gate script, generated allow file, or change log is modified
