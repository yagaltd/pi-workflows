spec: task
name: "guard-single-spec-mode"
tags: []
---

## Intent

`agent-spec guard --spec-dir <dir>` verifies EVERY contract in the directory — in pi-workflows the shared spec dir holds cross-repo specs, so a per-task guard run verifies sibling contracts against the wrong tree (plan-013 T4 R3 false positive). Add an additive `--spec <file>` flag: verify exactly the named contract, ignore siblings. Default `--spec-dir` behavior unchanged.

## Decisions

- `--spec <file>` and `--spec-dir <dir>` are mutually exclusive; passing both is a CLI error.
- `--spec` runs the same checks as the directory form, scoped to one contract: boundaries + verification for that contract only.
- Exit codes and output format identical to the directory form (machine-parseable verdicts preserved).

## Boundaries

### Allowed Changes
- src/**
- tests/**

### Forbidden
- Do not change `--spec-dir` default behavior.
- Do not modify README.md or docs/** (a separate docs task owns them).
- Do not add dependencies.

## Completion Criteria

Scenario: verifies exactly the named contract with --spec
  Test: verifies exactly the named contract with spec flag
  Given a spec dir with two contracts
  When guard runs with --spec naming one contract
  Then only that contract is verified
  And sibling contracts produce no findings

Scenario: ignores sibling specs outside the changed scope
  Test: ignores sibling specs outside the changed scope
  Given a change that satisfies contract A and violates nothing in contract B
  When guard runs with --spec contract-b
  Then contract A is not loaded or reported

Scenario: rejects boundary violations outside allowed changes
  Test: rejects boundary violations outside allowed changes
  Given --spec with Allowed Changes src/**
  When the change touches a path outside src/**
  Then guard exits non-zero naming the violation

Scenario: keeps --spec-dir behavior unchanged
  Test: keeps spec dir behavior unchanged
  Given the existing contract corpus
  When guard runs with --spec-dir
  Then the output matches the pre-change snapshot
