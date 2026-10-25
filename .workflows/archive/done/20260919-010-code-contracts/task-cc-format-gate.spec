spec: task
name: "cc-check format as reviewer Layer 3 gate"
tags: [reviewer, cc-check, layer3]
max-rounds: 2
verify: grep -q "cc-check format" agents/reviewer.md && [ "$(grep -c 'Layer 1b: Boundary' agents/reviewer.md)" = "1" ]
---

## Intent

Add `cc-check format` to the reviewer's Layer 3 (Project Toolchain) pipeline as an optional mechanical check with pass/fail/skipped states, mirroring the existing tdd-guard skip pattern. The reviewer stays judgment-free — this is a tool exit-code gate for contract syntax and duplicate IDs only.

## Decisions

- cc-check rides **Layer 3 (Project Toolchain)** — Layer 1b is already Boundary Guard; do NOT renumber layers or add a new one.
- States: **pass / fail / skipped**. Skipped when: repo has no `@cc` comments and no `CONTRACTS` file, OR the `cc-check` binary is absent. Mirror the tdd-guard "skipped (not installed)" wording convention.
- The verdict template's Layer 3 report block gains a `Contracts:` line.
- Reviewer never judges contract prose — cc-check's own scope (syntax + duplicate IDs) is the reviewer's scope here.

## Boundaries

### Allowed Changes
- agents/reviewer.md

### Forbidden
- everything else, incl. agents/worker.md, agents/dispatch-shapes.md, templates/, skills/, extensions/, tests/, README.md

## Completion Criteria

Scenario: Layer 3 documents the gate
  Test: grep -q "cc-check format" agents/reviewer.md
  Given agents/reviewer.md at HEAD
  When the edit lands
  Then the Layer 3 (Project Toolchain) section contains a cc-check format check with pass/fail semantics

Scenario: Skip semantics present
  Test: grep -B1 -A3 "cc-check" agents/reviewer.md | grep -qi "skipped"
  Given the new check
  When the repo has no contracts or cc-check is not installed
  Then the check reports skipped — never an invented pass, never a hard failure

Scenario: Verdict template carries the report line
  Test: grep -A6 "Layer 3" agents/reviewer.md | grep -qi "contracts"
  Given the output template in reviewer.md
  When the reviewer renders its detailed report
  Then a Contracts: pass/fail/skipped line appears inside the Layer 3 block

Scenario: Negative — no layer renumbering
  Test: bash -c '[ "$(grep -c "Layer 1b: Boundary" agents/reviewer.md)" = "1" ] && ! grep -q "Layer 1c" agents/reviewer.md'
  Given reviewer.md's existing pipeline structure
  When the edit lands
  Then Layer 1b remains Boundary Guard (exactly once) and no new layer number is introduced for cc-check
