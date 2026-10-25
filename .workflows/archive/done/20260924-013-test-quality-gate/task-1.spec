spec: task
name: "tdd-gate-spec-input-mode"
tags: []
---

## Intent

tdd-gate gains a `--spec <file.spec>` input mode: it shells `agent-spec parse --format json` on the given pi-workflows contract, maps `sections[kind=acceptance_criteria].scenarios[]` into tdd-gate's requirement model (id = scenario name, text = step text), and proceeds with its existing coverage/blame/gaming/drift analysis. Requirements from a spec need no Jev key — parsing is local and deterministic. Missing `agent-spec` binary ⇒ hard error with an install hint; no silent fallback, no YAML side-input in this task.

## Decisions

- Parse via spawned `agent-spec parse --format json` (probe-verified 2026-09-24: `sections[kind=acceptance_criteria].scenarios[]` with `name`, `steps[]`, `test_selector.filter`); no duplicate Markdown parser.
- Missing binary ⇒ non-zero exit + hint mentioning `cargo install agent-spec` (or the agent-spec install doc); never an empty requirements list.
- Scenario `name` becomes the requirement id; `steps[]` text joins into the requirement text; `test_selector.filter`, when present, rides along as the bound test name.
- No new dependencies; reuse the existing requirement model + test harness patterns.

## Boundaries

### Allowed Changes
- src/**
- test/**

### Forbidden
- Do not touch `eval/`, `examples/`, or the Jev/TypeSafe client paths — this task is input parsing only.
- Do not add npm dependencies.
- Do not change existing CLI flags' behavior.

## Completion Criteria

Scenario: maps spec scenarios into requirements
  Test: maps spec scenarios into requirements
  Given a fixture `.spec` file with two Completion Criteria scenarios, one carrying a `Test:` selector
  When tdd-gate runs with `--spec <fixture>`
  Then the requirement list contains exactly 2 entries with the scenario names as ids
  And the entry with a selector carries the exact `Test:` filter string

Scenario: preserves given-when-then step text
  Test: preserves given-when-then step text
  Given the same fixture
  When parsed via `--spec`
  Then each requirement's text contains its scenario's Given/When/Then step text in order

Scenario: hard error when agent-spec is missing
  Test: hard errors when agent-spec binary is missing
  Given a PATH that does not contain the `agent-spec` binary
  When tdd-gate runs with `--spec <fixture>`
  Then the process exits non-zero
  And stderr mentions how to install agent-spec
