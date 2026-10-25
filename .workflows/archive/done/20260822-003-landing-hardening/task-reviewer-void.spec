spec: task
name: "reviewer + quality-reviewer — VOID semantics + provenance"
tags: [docs, reviewer, quality-reviewer, void, provenance]
max-rounds: 2
---

## Intent

A review run from the wrong root is void, not failed: verdicts from a phantom directory are noise that humans must manually discard. Both judgment roles get a Step 0 guard, a provenance line, and an explicit VOID output shape.

## Decisions

- D5: Both roles gain Step 0 (read-only GUARD): `pwd` + `git rev-parse --show-toplevel` must match the repo named in the task text; mismatch → emit exactly one line: `VOID — wrong working directory (<found> ≠ <expected>); no verdicts emitted` and stop. Never emit per-spec verdict blocks from a wrong root.
- D5: Every report (both roles) opens with a provenance line: `repo: <git toplevel>` before any content.
- D8 (stated, unchanged): quality-reviewer keeps its self-serve .workflows/CONTEXT.md domain-memory read; mechanical reviewer deliberately receives no narrative context.

## Boundaries

### Allowed Changes
- agents/reviewer.md
- agents/quality-reviewer.md

### Forbidden
- Other agent files, tooling/, .workflows/, skills/, extension code

## Completion Criteria

Scenario: Both roles carry the guard
  Test: grep -l "git rev-parse --show-toplevel" agents/reviewer.md agents/quality-reviewer.md
  Then both files match

Scenario: VOID output shape defined
  Test: grep -i "VOID" agents/reviewer.md agents/quality-reviewer.md
  Then both define the one-line VOID output with the no-verdicts rule

Scenario: Provenance line in report format
  Test: grep -i "provenance\|repo:" agents/reviewer.md agents/quality-reviewer.md
  Then both report formats require the repo provenance line before content

Scenario: Context routing unchanged
  Test: grep -c "CONTEXT.md" agents/quality-reviewer.md
  Then quality-reviewer still reads CONTEXT.md (≥1) and reviewer.md contains no narrative-context reading mandate beyond plan/spec files
